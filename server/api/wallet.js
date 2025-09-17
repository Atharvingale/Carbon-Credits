// Load environment variables first
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { createClient } = require('@supabase/supabase-js');
const { PublicKey } = require('@solana/web3.js');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting for wallet operations
const walletLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 wallet requests per windowMs
  message: {
    error: 'Too many wallet requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(walletLimiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token & extract user id
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Validation middleware for wallet address
const validateWalletRequest = [
  body('walletAddress')
    .notEmpty()
    .withMessage('Wallet address is required')
    .custom((value) => {
      try {
        new PublicKey(value);
        return true;
      } catch {
        throw new Error('Invalid Solana wallet address format');
      }
    }),
];

// Error handling middleware for validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'wallet-api'
  });
});

// Get user's wallet address
app.get('/wallet', authenticateUser, async (req, res) => {
  try {
    console.log(`🔍 Getting wallet for user: ${req.user.id}`);
    
    // Get user's profile with wallet address
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_address, wallet_connected_at, wallet_verified')
      .eq('id', req.user.id)
      .single();
    
    if (profileError) {
      console.error('Profile lookup error:', profileError);
      return res.status(500).json({ error: 'Failed to fetch wallet information' });
    }
    
    res.json({
      walletAddress: profile?.wallet_address || null,
      connectedAt: profile?.wallet_connected_at || null,
      verified: profile?.wallet_verified || false,
      hasWallet: !!profile?.wallet_address
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: 'Failed to retrieve wallet information' });
  }
});

// Save/update user's wallet address
app.post('/wallet', 
  authenticateUser,
  validateWalletRequest,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { walletAddress } = req.body;
      console.log(`💰 Saving wallet for user ${req.user.id}: ${walletAddress}`);
      
      // Check if wallet is already in use by another user
      const { data: existingWallet, error: checkError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('wallet_address', walletAddress)
        .neq('id', req.user.id);
      
      if (checkError) {
        console.error('Wallet check error:', checkError);
        return res.status(500).json({ error: 'Failed to validate wallet address' });
      }
      
      if (existingWallet && existingWallet.length > 0) {
        return res.status(409).json({ 
          error: 'Wallet address already in use',
          details: 'This wallet address is already connected to another account'
        });
      }
      
      // Update user's profile with wallet address
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          wallet_address: walletAddress,
          wallet_connected_at: new Date().toISOString(),
          wallet_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.user.id)
        .select('wallet_address, wallet_connected_at, wallet_verified')
        .single();
      
      if (updateError) {
        console.error('Wallet update error:', updateError);
        return res.status(500).json({ error: 'Failed to save wallet address' });
      }
      
      console.log(`✅ Wallet saved successfully for user ${req.user.id}`);
      
      res.json({
        success: true,
        walletAddress: updatedProfile.wallet_address,
        connectedAt: updatedProfile.wallet_connected_at,
        verified: updatedProfile.wallet_verified,
        message: 'Wallet connected successfully'
      });
    } catch (error) {
      console.error('Save wallet error:', error);
      res.status(500).json({ error: 'Failed to connect wallet' });
    }
  }
);

// Remove user's wallet address
app.delete('/wallet', authenticateUser, async (req, res) => {
  try {
    console.log(`🗑️ Removing wallet for user: ${req.user.id}`);
    
    // Update user's profile to remove wallet address
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        wallet_address: null,
        wallet_connected_at: null,
        wallet_verified: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id);
    
    if (updateError) {
      console.error('Wallet removal error:', updateError);
      return res.status(500).json({ error: 'Failed to remove wallet address' });
    }
    
    console.log(`✅ Wallet removed successfully for user ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Wallet disconnected successfully'
    });
  } catch (error) {
    console.error('Remove wallet error:', error);
    res.status(500).json({ error: 'Failed to disconnect wallet' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🔗 Wallet API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS origin: ${corsOptions.origin}`);
  console.log(`⚠️  Note: If using with existing minting server, ensure no port conflicts`);
});