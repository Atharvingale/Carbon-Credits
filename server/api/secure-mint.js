// Load environment variables first
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { body, validationResult } = require('express-validator');
const { createClient } = require('@supabase/supabase-js');
const bs58 = require('bs58');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { createMint, getOrCreateAssociatedTokenAccount, mintTo } = require('@solana/spl-token');

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

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// More strict rate limiting for mint endpoint
const mintLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 mint requests per minute
  message: {
    error: 'Too many mint requests, please try again later'
  }
});

// Logging
app.use(morgan('combined'));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SOLANA_PAYER_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Solana connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
);

// Load payer keypair (support base58 or JSON array)
let payer;
try {
  if (process.env.SOLANA_PAYER_SECRET.startsWith('[')) {
    payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.SOLANA_PAYER_SECRET)));
  } else {
    payer = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_PAYER_SECRET));
  }
  console.log('✅ Solana payer loaded:', payer.publicKey.toString());
} catch (error) {
  console.error('❌ Invalid SOLANA_PAYER_SECRET format:', error.message);
  process.exit(1);
}

// Validation middleware
const validateMintRequest = [
  body('projectId')
    .notEmpty()
    .withMessage('Project ID is required')
    .isUUID()
    .withMessage('Project ID must be a valid UUID'),
  
  body('recipientWallet')
    .notEmpty()
    .withMessage('Recipient wallet is required')
    .custom((value) => {
      try {
        new PublicKey(value);
        return true;
      } catch {
        throw new Error('Invalid Solana wallet address');
      }
    }),
  
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isInt({ min: 1, max: 1000000 })
    .withMessage('Amount must be between 1 and 1,000,000'),
  
  body('decimals')
    .optional()
    .isInt({ min: 0, max: 9 })
    .withMessage('Decimals must be between 0 and 9'),
];

// Error handling middleware
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

// Authentication middleware
const authenticateAdmin = async (req, res, next) => {
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
    
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Profile lookup error:', profileError);
      return res.status(500).json({ error: 'Failed to verify user role' });
    }

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Attach user to request object
    req.user = user;
    req.userProfile = profile;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      supabase: !!process.env.SUPABASE_URL,
      solana: !!payer,
    }
  });
});

// Enhanced mint endpoint with validation and security
app.post('/mint', 
  mintLimiter,
  validateMintRequest,
  handleValidationErrors,
  authenticateAdmin,
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { projectId, recipientWallet, amount, decimals = 0 } = req.body;
      
      console.log(`🎯 Mint request from admin ${req.user.email}:`, {
        projectId,
        recipientWallet,
        amount,
        decimals
      });

      // Validate project exists and belongs to a valid user
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, title, status, calculated_credits')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return res.status(404).json({ 
          error: 'Project not found',
          details: projectError?.message 
        });
      }

      if (!['approved', 'credits_calculated'].includes(project.status)) {
        return res.status(400).json({ 
          error: `Project must be approved or have credits calculated before minting. Current status: ${project.status}` 
        });
      }

      const recipient = new PublicKey(recipientWallet);

      // Check if payer has sufficient SOL for transaction
      const balance = await connection.getBalance(payer.publicKey);
      if (balance < 0.01 * 1e9) { // Less than 0.01 SOL
        return res.status(500).json({
          error: 'Insufficient SOL balance for transaction fees'
        });
      }

      // Create mint (or reuse existing project mint)
      console.log('🔨 Creating new mint...');
      const mint = await createMint(
        connection,
        payer,
        payer.publicKey,
        null,
        decimals
      );

      // Ensure recipient's associated token account
      console.log('🔑 Setting up recipient token account...');
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint,
        recipient
      );

      // Calculate amount to mint with proper decimals
      const decimalsBI = BigInt(decimals);
      const amountBI = BigInt(amount);
      const tenBI = BigInt(10);
      const factor = decimalsBI === BigInt(0) ? BigInt(1) : tenBI ** decimalsBI;
      const amountToMint = amountBI * factor;

      // Mint tokens
      console.log('⚡ Minting tokens...');
      const sig = await mintTo(
        connection,
        payer,
        mint,
        recipientTokenAccount.address,
        payer.publicKey,
        amountToMint
      );

      // Store transaction record in Supabase
      const tokenRecord = {
        mint: mint.toBase58(), 
        project_id: projectId,
        recipient: recipientWallet, 
        amount: BigInt(amount),
        decimals,
        minted_tx: sig,
        minted_by: req.user.id,
        token_standard: 'SPL',
        token_symbol: 'CCR',
        token_name: 'Carbon Credit Token',
        status: 'active',
        created_at: new Date().toISOString()
      };
      
      const { error: insertError } = await supabase.from('tokens').insert([tokenRecord]);
      
      if (insertError) {
        console.error('Database insert error:', insertError);
        // Don't fail the transaction, just log the error
      }

      // Update project with mint address if not already set
      const { error: updateError } = await supabase
        .from('projects')
        .update({ 
          mint_address: mint.toBase58(),
          status: 'credits_minted',
          credits_issued: parseInt(amount)
        })
        .eq('id', projectId);
      
      if (updateError) {
        console.error('Project update error:', updateError);
      }

      // Log successful mint operation
      await supabase.from('admin_logs').insert([{
        admin_id: req.user.id,
        action: 'mint_tokens',
        target_type: 'project',
        target_id: projectId,
        details: `Minted ${amount} tokens to ${recipientWallet}`,
        metadata: {
          mint: mint.toBase58(),
          amount,
          decimals,
          transaction: sig
        }
      }]);

      const duration = Date.now() - startTime;
      console.log(`✅ Mint completed in ${duration}ms`);

      res.json({ 
        success: true,
        mint: mint.toBase58(), 
        transaction: sig,
        amount: parseInt(amount),
        decimals,
        recipient: recipientWallet,
        explorer_url: `https://explorer.solana.com/tx/${sig}?cluster=${process.env.SOLANA_CLUSTER || 'devnet'}`,
        processing_time: duration
      });
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`❌ Mint failed after ${duration}ms:`, err);
      
      // Log failed mint operation
      if (req.user) {
        await supabase.from('admin_logs').insert([{
          admin_id: req.user.id,
          action: 'mint_tokens_failed',
          target_type: 'project',
          target_id: req.body.projectId,
          details: err.message,
          metadata: { error: err.message, duration }
        }]).catch(console.error);
      }

      res.status(500).json({ 
        error: 'Mint operation failed',
        message: err.message,
        processing_time: duration
      });
    }
  }
);

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
  console.log(`🚀 Secure server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS origin: ${corsOptions.origin}`);
  console.log(`⛓️  Solana cluster: ${process.env.SOLANA_CLUSTER || 'devnet'}`);
});