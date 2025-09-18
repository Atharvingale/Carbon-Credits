// Load environment variables first
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult, header } = require('express-validator');
const { createClient } = require('@supabase/supabase-js');
const { PublicKey } = require('@solana/web3.js');
const winston = require('winston');
const crypto = require('crypto');

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'wallet-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/wallet-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/wallet-combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const app = express();
const API_VERSION = '1.0.0';
const REQUEST_ID_HEADER = 'x-request-id';

// Request ID middleware for tracing
app.use((req, res, next) => {
  const requestId = req.headers[REQUEST_ID_HEADER] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  logger.info('Request received', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Enhanced security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Enhanced rate limiting with different tiers
const createRateLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { 
    error: message,
    retryAfter: Math.ceil(windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use combination of IP and user ID for authenticated requests
    const ip = req.ip;
    const userId = req.user?.id || 'anonymous';
    return `${ip}:${userId}`;
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      requestId: req.requestId,
      ip: req.ip,
      userId: req.user?.id,
      path: req.path
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    });
  }
});

// General API rate limiting
const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per 15 minutes
  'Too many API requests from this IP, please try again later'
);

// Strict rate limiting for sensitive operations
const strictLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  10, // 10 requests per 5 minutes
  'Too many sensitive operations from this IP, please try again later'
);

app.use(generalLimiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Enhanced authentication middleware with security logging
const authenticateUser = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Invalid authorization header', {
        requestId: req.requestId,
        ip: req.ip,
        path: req.path,
        reason: 'missing_bearer_token'
      });
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please provide a valid bearer token'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.length < 10) {
      logger.warn('Authentication failed: Invalid token format', {
        requestId: req.requestId,
        ip: req.ip,
        tokenLength: token?.length || 0
      });
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token format is invalid'
      });
    }

    // Verify token & extract user info
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) {
      logger.warn('Authentication failed: Supabase error', {
        requestId: req.requestId,
        ip: req.ip,
        error: userError.message,
        errorCode: userError.code
      });
      
      // Different responses based on error type
      if (userError.message?.includes('expired') || userError.code === 'invalid_token') {
        return res.status(401).json({ 
          error: 'Token expired',
          message: 'Please log in again'
        });
      }
      
      return res.status(403).json({ 
        error: 'Authentication failed',
        message: 'Invalid or malformed token'
      });
    }

    if (!user || !user.id) {
      logger.warn('Authentication failed: No user data', {
        requestId: req.requestId,
        ip: req.ip,
        hasUser: !!user,
        userId: user?.id
      });
      return res.status(403).json({ 
        error: 'Invalid token',
        message: 'Token does not contain valid user information'
      });
    }

    // Additional security checks
    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      logger.warn('Authentication blocked: User banned', {
        requestId: req.requestId,
        userId: user.id,
        bannedUntil: user.banned_until
      });
      return res.status(403).json({ 
        error: 'Account suspended',
        message: 'Your account has been temporarily suspended'
      });
    }

    // Attach user and request metadata
    req.user = user;
    req.authTime = Date.now() - startTime;
    
    logger.info('Authentication successful', {
      requestId: req.requestId,
      userId: user.id,
      email: user.email,
      authTime: req.authTime
    });
    
    next();
  } catch (error) {
    logger.error('Authentication system error', {
      requestId: req.requestId,
      ip: req.ip,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      error: 'Authentication system error',
      message: 'Please try again later'
    });
  }
};

// Enhanced validation middleware with comprehensive checks
const validateWalletRequest = [
  // Validate request headers
  header('content-type')
    .equals('application/json')
    .withMessage('Content-Type must be application/json'),
  
  // Validate wallet address
  body('walletAddress')
    .trim()
    .notEmpty()
    .withMessage('Wallet address is required')
    .isLength({ min: 32, max: 44 })
    .withMessage('Wallet address must be between 32-44 characters')
    .matches(/^[1-9A-HJ-NP-Za-km-z]+$/)
    .withMessage('Wallet address contains invalid characters')
    .custom(async (value, { req }) => {
      try {
        // Validate Solana public key format
        const pubkey = new PublicKey(value);
        
        // Additional security: check if it's a known system account
        const systemAccounts = [
          '11111111111111111111111111111112', // System Program
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
          'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' // Associated Token Program
        ];
        
        if (systemAccounts.includes(value)) {
          throw new Error('Cannot use system program addresses');
        }
        
        // Log wallet validation attempt
        logger.info('Wallet address validated', {
          requestId: req.requestId,
          userId: req.user?.id,
          walletAddressHash: crypto.createHash('sha256').update(value).digest('hex').substring(0, 8),
          isValid: true
        });
        
        return true;
      } catch (error) {
        logger.warn('Wallet validation failed', {
          requestId: req.requestId,
          userId: req.user?.id,
          error: error.message,
          addressLength: value?.length
        });
        throw new Error(`Invalid Solana wallet address: ${error.message}`);
      }
    }),
    
  // Optional: Validate additional fields if present
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
    
  body('metadata.source')
    .optional()
    .isIn(['phantom', 'solflare', 'torus', 'ledger', 'other'])
    .withMessage('Invalid wallet source')
];

// Enhanced error handling middleware for validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array();
    
    logger.warn('Validation failed', {
      requestId: req.requestId,
      userId: req.user?.id,
      ip: req.ip,
      path: req.path,
      method: req.method,
      errors: errorDetails.map(err => ({
        field: err.path,
        message: err.msg,
        value: typeof err.value === 'string' ? err.value.substring(0, 50) : err.value
      }))
    });
    
    // Group errors by field for better response structure
    const fieldErrors = {};
    errorDetails.forEach(error => {
      const field = error.path || error.param || 'unknown';
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(error.msg);
    });
    
    return res.status(400).json({
      error: 'Validation failed',
      message: 'The request contains invalid data',
      details: fieldErrors,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
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
      // Check if the error is "no rows" - this means profile doesn't exist
      if (profileError.code === 'PGRST116' || profileError.details?.includes('0 rows')) {
        console.warn(`Profile not found for user ${req.user.id}. This indicates a setup issue.`);
        
        // Try to create the missing profile
        console.log(`🔄 Attempting to create missing profile for user: ${req.user.email}`);
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: req.user.id,
            email: req.user.email,
            full_name: req.user.user_metadata?.full_name || req.user.user_metadata?.name || req.user.email.split('@')[0],
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('wallet_address, wallet_connected_at, wallet_verified')
          .single();
        
        if (createError) {
          console.error('Failed to create profile:', createError);
          return res.status(500).json({ 
            error: 'Profile setup required',
            message: 'User profile not found and could not be created automatically',
            code: 'PROFILE_MISSING'
          });
        }
        
        console.log(`✅ Created missing profile for user ${req.user.id}`);
        profile = newProfile;
      } else {
        console.error('Profile lookup error:', profileError);
        return res.status(500).json({ error: 'Failed to fetch wallet information' });
      }
    }
    
    // Log the wallet status being returned
    const walletStatus = {
      walletAddress: profile?.wallet_address || null,
      connectedAt: profile?.wallet_connected_at || null,
      verified: profile?.wallet_verified || false,
      hasWallet: !!profile?.wallet_address
    };
    
    logger.info('Wallet status retrieved', {
      requestId: req.requestId,
      userId: req.user.id,
      hasWallet: walletStatus.hasWallet,
      walletTime: Date.now() - req.authTime
    });
    
    res.json(walletStatus);
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
      
      // First ensure the profile exists
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', req.user.id)
        .single();
      
      if (profileCheckError && profileCheckError.code === 'PGRST116') {
        console.log(`🔄 Creating missing profile for user: ${req.user.email}`);
        
        // Create the missing profile first
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: req.user.id,
            email: req.user.email,
            full_name: req.user.user_metadata?.full_name || req.user.user_metadata?.name || req.user.email.split('@')[0],
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (createError) {
          console.error('Failed to create profile during wallet save:', createError);
          return res.status(500).json({ 
            error: 'Profile creation failed',
            message: 'Could not create user profile for wallet connection'
          });
        }
        
        console.log(`✅ Created profile for user ${req.user.id}`);
      } else if (profileCheckError) {
        console.error('Profile check error:', profileCheckError);
        return res.status(500).json({ error: 'Failed to verify user profile' });
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

// Enhanced error handling middleware
app.use((error, req, res, next) => {
  const errorId = crypto.randomUUID();
  const statusCode = error.status || error.statusCode || 500;
  
  // Log error with full context
  logger.error('Unhandled error', {
    errorId,
    requestId: req.requestId,
    userId: req.user?.id,
    ip: req.ip,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    statusCode
  });
  
  // Determine error response based on environment and error type
  const isProduction = process.env.NODE_ENV === 'production';
  const errorResponse = {
    error: 'Internal server error',
    message: isProduction ? 'Something went wrong' : error.message,
    errorId,
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  };
  
  // Add additional details in development
  if (!isProduction) {
    errorResponse.details = {
      name: error.name,
      code: error.code,
      stack: error.stack?.split('\n').slice(0, 10) // Limit stack trace
    };
  }
  
  res.status(statusCode).json(errorResponse);
});

// Enhanced 404 handler
app.use((req, res) => {
  logger.warn('Route not found', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: [
      'GET /health',
      'GET /wallet',
      'POST /wallet',
      'DELETE /wallet'
    ],
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

// Configuration validation
const validateConfiguration = () => {
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    logger.error('Missing required environment variables', {
      missing,
      available: Object.keys(process.env).filter(key => 
        key.startsWith('SUPABASE_') || 
        key.startsWith('NODE_') ||
        key.startsWith('PORT') ||
        key.startsWith('CORS_')
      )
    });
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate URLs
  try {
    new URL(process.env.SUPABASE_URL);
  } catch (error) {
    throw new Error('Invalid SUPABASE_URL format');
  }
  
  if (process.env.CORS_ORIGIN) {
    try {
      new URL(process.env.CORS_ORIGIN);
    } catch (error) {
      throw new Error('Invalid CORS_ORIGIN format');
    }
  }
};

// Server startup
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info('Shutdown signal received', { signal });
  
  server.close((err) => {
    if (err) {
      logger.error('Error during shutdown', { error: err.message });
      process.exit(1);
    }
    
    logger.info('Server closed gracefully');
    process.exit(0);
  });
};

try {
  // Validate configuration before starting
  validateConfiguration();
  
  // Start server
  const server = app.listen(PORT, HOST, () => {
    logger.info('Wallet API server started', {
      port: PORT,
      host: HOST,
      environment: process.env.NODE_ENV || 'development',
      corsOrigin: corsOptions.origin,
      nodeVersion: process.version,
      pid: process.pid,
      apiVersion: API_VERSION,
      timestamp: new Date().toISOString()
    });
    
    console.log(`\n🔗 Wallet API v${API_VERSION} running on http://${HOST}:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 CORS origin: ${corsOptions.origin}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   GET  /health     - Health check`);
    console.log(`   GET  /wallet     - Get user wallet`);
    console.log(`   POST /wallet     - Save user wallet`);
    console.log(`   DELETE /wallet   - Remove user wallet`);
    console.log(`⚠️  Note: If using with existing minting server, ensure no port conflicts\n`);
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
} catch (error) {
  logger.error('Failed to start server', {
    error: error.message,
    stack: error.stack
  });
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
}
