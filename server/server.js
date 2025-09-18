/**
 * Unified Blue Carbon MRV System Server
 * Combines wallet management, token minting, and health check endpoints
 * Runs on port 3001 with comprehensive security, logging, and error handling
 */

// Load environment variables first
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { body, validationResult, header } = require('express-validator');
const { ipKeyGenerator } = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const bs58 = require('bs58');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { createMint, getOrCreateAssociatedTokenAccount, mintTo } = require('@solana/spl-token');
const winston = require('winston');
const crypto = require('crypto');
const path = require('path');

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'carbon-credits-server' },
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, 'logs', 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(__dirname, 'logs', 'combined.log') }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const app = express();
const API_VERSION = '1.0.0';
const REQUEST_ID_HEADER = 'x-request-id';

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SOLANA_PAYER_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error(`Missing required environment variable: ${envVar}`);
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
  logger.info(`Solana payer loaded: ${payer.publicKey.toString()}`);
} catch (error) {
  logger.error(`Invalid SOLANA_PAYER_SECRET format: ${error.message}`);
  process.exit(1);
}

// Request ID middleware for tracing
app.use((req, res, next) => {
  const requestId = req.headers[REQUEST_ID_HEADER] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  req.startTime = Date.now();
  
  logger.info('Request received', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  next();
});

// Security middleware
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

// Rate limiting with different tiers
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
    const ip = ipKeyGenerator(req);
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

// Minting rate limiting (very strict)
const mintLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  5, // 5 mint requests per minute
  'Too many mint requests, please try again later'
);

app.use(generalLimiter);

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

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

const authenticateAdmin = async (req, res, next) => {
  try {
    // First authenticate the user
    await new Promise((resolve, reject) => {
      authenticateUser(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();
    
    if (profileError) {
      logger.error('Profile lookup error:', profileError);
      return res.status(500).json({ error: 'Failed to verify user role' });
    }

    if (!profile || profile.role !== 'admin') {
      logger.warn('Admin access denied', {
        requestId: req.requestId,
        userId: req.user.id,
        userRole: profile?.role
      });
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Attach user profile to request
    req.userProfile = profile;
    next();
  } catch (error) {
    logger.error('Admin authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

const validateWalletRequest = [
  header('content-type')
    .equals('application/json')
    .withMessage('Content-Type must be application/json'),
  
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
        const pubkey = new PublicKey(value);
        
        const systemAccounts = [
          '11111111111111111111111111111112',
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
        ];
        
        if (systemAccounts.includes(value)) {
          throw new Error('Cannot use system program addresses');
        }
        
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
    
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
    
  body('metadata.source')
    .optional()
    .isIn(['phantom', 'solflare', 'torus', 'ledger', 'other'])
    .withMessage('Invalid wallet source')
];

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

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: uptime,
    version: API_VERSION,
    services: {
      supabase: !!process.env.SUPABASE_URL,
      solana: !!payer,
      database: true // We'll assume it's working if we got this far
    },
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================================================
// WALLET MANAGEMENT ENDPOINTS
// ============================================================================

// Get user's wallet address
app.get('/wallet', authenticateUser, async (req, res) => {
  try {
    logger.info(`Getting wallet for user: ${req.user.id}`);
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_address, wallet_connected_at, wallet_verified')
      .eq('id', req.user.id)
      .single();
    
    if (profileError) {
      logger.error('Profile lookup error:', profileError);
      return res.status(500).json({ error: 'Failed to fetch wallet information' });
    }
    
    const duration = Date.now() - req.startTime;
    logger.info(`Wallet status retrieved in ${duration}ms`, {
      requestId: req.requestId,
      userId: req.user.id,
      hasWallet: !!profile?.wallet_address
    });
    
    res.json({
      walletAddress: profile?.wallet_address || null,
      connectedAt: profile?.wallet_connected_at || null,
      verified: profile?.wallet_verified || false,
      hasWallet: !!profile?.wallet_address
    });
  } catch (error) {
    logger.error('Get wallet error:', error);
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
      logger.info(`Saving wallet for user ${req.user.id}: ${walletAddress}`);
      
      // Check if wallet is already in use by another user
      const { data: existingWallet, error: checkError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('wallet_address', walletAddress)
        .neq('id', req.user.id);
      
      if (checkError) {
        logger.error('Wallet check error:', checkError);
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
        logger.error('Wallet update error:', updateError);
        return res.status(500).json({ error: 'Failed to save wallet address' });
      }
      
      const duration = Date.now() - req.startTime;
      logger.info(`Wallet saved successfully for user ${req.user.id} in ${duration}ms`);
      
      res.json({
        success: true,
        walletAddress: updatedProfile.wallet_address,
        connectedAt: updatedProfile.wallet_connected_at,
        verified: updatedProfile.wallet_verified,
        message: 'Wallet connected successfully'
      });
    } catch (error) {
      logger.error('Save wallet error:', error);
      res.status(500).json({ error: 'Failed to connect wallet' });
    }
  }
);

// Remove user's wallet address
app.delete('/wallet', authenticateUser, async (req, res) => {
  try {
    logger.info(`Removing wallet for user: ${req.user.id}`);
    
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
      logger.error('Wallet removal error:', updateError);
      return res.status(500).json({ error: 'Failed to remove wallet address' });
    }
    
    const duration = Date.now() - req.startTime;
    logger.info(`Wallet removed successfully for user ${req.user.id} in ${duration}ms`);
    
    res.json({
      success: true,
      message: 'Wallet disconnected successfully'
    });
  } catch (error) {
    logger.error('Remove wallet error:', error);
    res.status(500).json({ error: 'Failed to disconnect wallet' });
  }
});

// ============================================================================
// TOKEN MINTING ENDPOINTS
// ============================================================================

app.post('/mint', 
  mintLimiter,
  validateMintRequest,
  handleValidationErrors,
  authenticateAdmin,
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { projectId, recipientWallet, amount, decimals = 0 } = req.body;
      
      logger.info(`Mint request from admin ${req.user.email}:`, {
        projectId,
        recipientWallet,
        amount,
        decimals,
        requestId: req.requestId
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
      if (balance < 0.01 * 1e9) {
        return res.status(500).json({
          error: 'Insufficient SOL balance for transaction fees'
        });
      }

      // Create mint
      logger.info('Creating new mint...');
      const mint = await createMint(
        connection,
        payer,
        payer.publicKey,
        null,
        decimals
      );

      // Ensure recipient's associated token account
      logger.info('Setting up recipient token account...');
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
      logger.info('Minting tokens...');
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
        logger.error('Database insert error:', insertError);
      }

      // Update project with mint address
      const { error: updateError } = await supabase
        .from('projects')
        .update({ 
          mint_address: mint.toBase58(),
          status: 'credits_minted',
          credits_issued: parseInt(amount)
        })
        .eq('id', projectId);
      
      if (updateError) {
        logger.error('Project update error:', updateError);
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
      logger.info(`Mint completed in ${duration}ms`);

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
      logger.error(`Mint failed after ${duration}ms:`, err);
      
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

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Enhanced error handling middleware
app.use((error, req, res, next) => {
  const errorId = crypto.randomUUID();
  const statusCode = error.status || error.statusCode || 500;
  const duration = Date.now() - (req.startTime || Date.now());
  
  logger.error('Unhandled error', {
    errorId,
    requestId: req.requestId,
    userId: req.user?.id,
    ip: req.ip,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    duration,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    statusCode
  });
  
  const isProduction = process.env.NODE_ENV === 'production';
  const errorResponse = {
    error: 'Internal server error',
    message: isProduction ? 'Something went wrong' : error.message,
    errorId,
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  };
  
  if (!isProduction) {
    errorResponse.details = {
      name: error.name,
      code: error.code,
      stack: error.stack?.split('\n').slice(0, 10)
    };
  }
  
  res.status(statusCode).json(errorResponse);
});

// 404 handler
app.use((req, res) => {
  const duration = Date.now() - req.startTime;
  
  logger.warn('Route not found', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    duration
  });
  
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: [
      'GET /health',
      'GET /wallet',
      'POST /wallet',
      'DELETE /wallet',
      'POST /mint'
    ],
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`Shutdown signal received: ${signal}`);
  
  server.close((err) => {
    if (err) {
      logger.error('Error during shutdown', { error: err.message });
      process.exit(1);
    }
    
    logger.info('Server closed gracefully');
    process.exit(0);
  });
};

// Start server
const server = app.listen(PORT, HOST, () => {
  logger.info('Blue Carbon MRV Server started', {
    port: PORT,
    host: HOST,
    environment: process.env.NODE_ENV || 'development',
    corsOrigin: corsOptions.origin,
    nodeVersion: process.version,
    pid: process.pid,
    apiVersion: API_VERSION,
    timestamp: new Date().toISOString()
  });
  
  console.log(`\n🚀 Blue Carbon MRV Server v${API_VERSION} running on http://${HOST}:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS origin: ${corsOptions.origin}`);
  console.log(`⛓️  Solana cluster: ${process.env.SOLANA_CLUSTER || 'devnet'}`);
  console.log(`💰 Payer address: ${payer.publicKey.toString()}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /health      - Health check`);
  console.log(`   GET  /wallet      - Get user wallet`);
  console.log(`   POST /wallet      - Save user wallet`);
  console.log(`   DELETE /wallet    - Remove user wallet`);
  console.log(`   POST /mint        - Mint carbon credit tokens (admin only)`);
  console.log(`\n🔒 Security features enabled:`);
  console.log(`   • Rate limiting (general: 100/15min, mint: 5/min)`);
  console.log(`   • Request tracing and logging`);
  console.log(`   • Input validation and sanitization`);
  console.log(`   • CORS and security headers`);
  console.log(`   • Admin authentication for minting\n`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});