# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Blue Carbon MRV System** - A comprehensive React/Node.js application for blue carbon project management, monitoring, reporting, and verification (MRV) with blockchain-based token minting on Solana.

### Key Technologies
- **Frontend**: React 19.1, Material-UI 7.3, React Router 7.8
- **Backend**: Node.js/Express with multiple API services
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **Blockchain**: Solana (SPL tokens for carbon credits)
- **Authentication**: Supabase Auth with role-based access control
- **Build Tools**: React App Rewired, Webpack 5 with crypto polyfills

## Architecture Overview

### Frontend Architecture
```
src/
├── components/          # Reusable UI components
│   ├── Navbar.jsx      # Main navigation with auth state
│   ├── Footer.jsx      # Site footer
│   ├── ProtectedRoute.jsx  # Route protection with role checks
│   ├── WalletProviderWrapper.jsx  # Solana wallet context
│   └── *Dashboard.jsx  # Role-specific dashboards
├── pages/              # Route-level page components
│   ├── Landing.jsx     # Public homepage
│   ├── Login.jsx       # Authentication page
│   ├── Signup.jsx      # User registration
│   ├── UserDashboard.jsx   # Regular user interface
│   ├── AdminDashboard.jsx  # Admin management interface
│   └── ProjectSubmission.jsx  # Project creation form
├── lib/                # Core libraries and configs
│   └── supabaseClient.js   # Database connection setup
├── utils/              # Utility functions and helpers
├── hooks/              # Custom React hooks
├── services/           # API service modules
└── images/             # Static assets
```

### Backend Architecture
```
server/
├── api/                # Express.js API endpoints
│   ├── secure-mint.js  # Primary token minting service (port 3001)
│   ├── mint.js         # Basic minting service (alternative)
│   └── wallet.js       # Wallet management API
├── logs/               # Application log files
├── .env.example        # Server environment template
└── package.json        # Server dependencies
```

### Database Schema (Supabase)
- **profiles**: User accounts with roles (admin, user) and wallet addresses
- **projects**: Blue carbon projects with status tracking and credits calculation
- **tokens**: Minted carbon credit tokens with blockchain transaction records
- **admin_logs**: Administrative action audit trail

### Authentication & Authorization
- **Supabase Auth**: Email/password authentication with JWT tokens
- **Role-based access**: `admin` role for system management, `user` role for project submission
- **Route protection**: `ProtectedRoute` component handles authorization
- **Admin-only features**: Token minting, project approval, user management

## Development Commands

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm start

# Run tests (includes wallet testing utilities)
npm test

# Build production bundle
npm run build

# Build and analyze bundle size
npm run build:analyze

# Verify development setup
npm run verify
```

### Backend Development
```bash
# Navigate to server directory
cd server

# Install server dependencies
npm install

# Start production server (recommended - port 3001)
npm start

# Start basic minting server
npm run start:basic

# Start wallet management server
npm run start:wallet

# Development mode with auto-restart
npm run dev

# Development wallet server
npm run dev:wallet
```

### Environment Setup

#### Frontend (.env)
```bash
# Required Supabase configuration
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional Solana configuration (defaults to devnet)
REACT_APP_SOLANA_RPC_URL=https://api.devnet.solana.com
REACT_APP_SOLANA_CLUSTER=devnet

# Application metadata
REACT_APP_APP_NAME=Blue Carbon MRV
REACT_APP_VERSION=1.0.0
REACT_APP_ENVIRONMENT=development
```

#### Backend (server/.env)
```bash
# Required for all server operations
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required for token minting
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PAYER_SECRET=[your_keypair_array_or_base58]
SOLANA_CLUSTER=devnet

# Server configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Security and monitoring
JWT_SECRET=your_jwt_secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

## Key Development Patterns

### Component Architecture
- **Material-UI theming**: Dark theme with custom colors (#00d4aa primary, #0a0f1c background)
- **Responsive design**: Mobile-first approach with breakpoint-based layouts
- **Error boundaries**: Global error handling with `ErrorBoundary` component
- **Lazy loading**: Route-level code splitting for performance

### State Management
- **React hooks**: useState, useEffect, useCallback for local state
- **Context providers**: Wallet connection state via WalletProviderWrapper
- **Supabase real-time**: Database subscriptions for live updates
- **Form state**: Controlled components with validation

### API Integration
- **Supabase client**: Database operations and authentication
- **RESTful endpoints**: Express.js APIs for blockchain operations
- **Error handling**: Comprehensive error states and user feedback
- **Rate limiting**: Built-in protection against abuse

### Security Measures
- **CORS configuration**: Restricted origins for API access
- **Input validation**: express-validator for API endpoints
- **Helmet.js**: Security headers and content security policy
- **Rate limiting**: Per-IP and per-user request throttling
- **Authentication middleware**: JWT token validation
- **Role-based access**: Admin-only operations and UI sections

## Common Development Tasks

### Adding New Project Types
1. Update database schema in Supabase
2. Modify project validation in `utils/projectColumnMapping.js`
3. Update carbon credit calculation in `utils/carbonCreditCalculator.js`
4. Enhance project submission form components

### Implementing New API Endpoints
1. Create route in appropriate `server/api/*.js` file
2. Add authentication middleware if required
3. Implement validation with express-validator
4. Update CORS and rate limiting as needed

### Database Migrations
1. Apply schema changes in Supabase dashboard
2. Update TypeScript types if using
3. Modify relevant utility functions for data normalization
4. Test with existing data to ensure compatibility

### Wallet Integration Testing
- Use `src/utils/walletTestUtils.js` for comprehensive wallet testing
- Mock wallet adapters available for different wallet providers
- Test connection, disconnection, and transaction signing scenarios

## Troubleshooting

### Common Build Issues
- **Buffer/crypto errors**: Handled by webpack configuration in `config-overrides.js`
- **Node.js polyfills**: Configured for Solana web3.js compatibility
- **Source map warnings**: Automatically ignored for node_modules

### Runtime Issues
- **Database connection**: Verify Supabase URL and keys in environment
- **Wallet connection**: Ensure Solana RPC endpoint is accessible
- **Token minting failures**: Check Solana payer account has sufficient SOL
- **Authentication issues**: Verify JWT token validity and user roles

### Performance Optimization
- **Bundle analysis**: Use `npm run build:analyze` to identify large dependencies
- **Lazy loading**: All pages are code-split by default
- **Database queries**: Use Supabase select statements efficiently
- **Real-time subscriptions**: Unsubscribe to prevent memory leaks

## Production Deployment

### Frontend Deployment
- Build optimized bundle with `npm run build`
- Serve static files from `build/` directory
- Configure environment variables for production Supabase instance

### Backend Deployment
- Use `npm run prod` for production server startup
- Configure production environment variables
- Set up process manager (PM2) for auto-restart
- Configure reverse proxy (nginx) for SSL termination

### Database Considerations
- Enable Supabase real-time for live updates
- Configure row-level security (RLS) policies
- Set up database backups and monitoring
- Optimize queries for production load

### Security Checklist
- Rotate Supabase service role keys
- Generate production-specific JWT secrets
- Configure CORS for production domains
- Enable rate limiting and monitoring
- Set up logging and alerting