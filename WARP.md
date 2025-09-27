# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

BlueCarbon is a blockchain-powered platform for managing Blue Carbon Credits from coastal ecosystem restoration projects. It combines React 19 frontend with Node.js/Express backend, Solana blockchain integration, and Supabase PostgreSQL database to create a transparent carbon credit marketplace.

## Development Commands

### Frontend (React Application)
- **Start development server**: `npm start` (runs on http://localhost:3000)
- **Build for production**: `npm run build`
- **Eject from Create React App**: `npm run eject`

### Backend (Node.js Server)
Navigate to `server/` directory first:
- **Start production server**: `npm start` (runs on http://localhost:3001)
- **Start development server**: `npm run dev` (with nodemon auto-reload)
- **Start production mode**: `npm run prod`
- **View logs**: `npm run logs` (all logs) or `npm run logs:error` (error logs only)

### Full Stack Development
1. **Start backend**: `cd server && npm run dev`
2. **Start frontend**: `npm start` (in root directory)
3. Frontend automatically proxies API requests to backend via `"proxy": "http://localhost:3001"`

### Testing Commands
- **Run React tests**: `npm test` (if tests are configured)
- **Run server health check**: Visit `http://localhost:3001/health`

## Architecture Overview

### High-Level System Design
The application follows a **3-tier architecture** with clear separation of concerns:

1. **Presentation Layer**: React 19 SPA with Material-UI components
2. **Business Logic Layer**: Node.js/Express API server with authentication and validation
3. **Data Layer**: Supabase PostgreSQL with real-time subscriptions and Solana blockchain

### Key Architectural Patterns

#### **Blockchain-First Authentication**
- Users authenticate via Supabase Auth (email/password)
- **Solana wallet integration** is mandatory for project operations
- Wallet addresses are stored and validated against connected Solana wallets
- All carbon credit operations require wallet verification

#### **Service-Oriented Wallet Management**
- **Centralized WalletService** (`src/services/walletService.js`) handles all wallet operations
- **Custom useWallet hook** (`src/hooks/useWallet.js`) provides React state management
- **Fallback mechanisms** from API to direct database access for resilience
- **Caching and retry logic** for improved performance

#### **Scientific Calculation Engine**
- **Carbon credit calculations** in `src/utils/carbonCreditCalculator.js`
- **IPCC-compliant formulas** for 5 blue carbon ecosystem types:
  - Mangrove forests, salt marshes, seagrass beds, coastal wetlands, tidal flats
- **Uncertainty factors** (default 20%) applied to ensure conservative estimates
- **Real-time validation** and calculation preview during form submission

#### **Role-Based Access Control**
- **ProtectedRoute component** enforces authentication requirements
- **Admin-only routes** for project approval and system management
- **Database-level security** via Supabase Row Level Security policies

### Critical Code Paths

#### **Project Submission Flow**
1. User completes multi-section form in `ProjectSubmission.jsx`
2. **WalletRequirement** component validates wallet connectivity
3. Scientific parameters processed by `carbonCreditCalculator.js`
4. Form data submitted to `/api/projects` endpoint
5. Admin approval required in `AdminDashboard.jsx`

#### **Token Minting Process**
1. Admin approves project and triggers minting
2. Server validates project status and user wallet
3. **Solana SPL Token** minted via `/api/mint` endpoint (admin-only)
4. Transaction recorded in both database and blockchain
5. User receives tokens directly to their connected wallet

#### **Wallet Integration Lifecycle**
1. **SolanaWalletAdapter** handles browser wallet connection
2. **useWallet hook** manages connection state and user profile sync
3. **WalletService** API calls for persistent storage
4. **Real-time validation** against connected wallet for security

### Database Schema Relationships

#### **Core Tables**
- **`profiles`**: User data with wallet addresses and verification status
- **`projects`**: Project submissions with carbon data (JSONB) and calculated credits
- **`tokens`**: Minted token records linked to projects and recipients
- **`admin_logs`**: Audit trail for administrative actions

#### **Data Flow Patterns**
- **Optimistic updates** in React UI for better UX
- **Real-time subscriptions** for project status changes
- **JSONB storage** for flexible carbon data parameters
- **Calculated fields** updated via triggers and API operations

### Security Implementation

#### **API Security Layers**
- **Rate limiting**: General (100/15min), Minting (5/1min)
- **JWT authentication** via Supabase Auth with Bearer tokens
- **Input validation** using express-validator
- **CORS and Helmet** middleware for browser security

#### **Blockchain Security**
- **Wallet signature verification** before any token operations
- **Transaction validation** against project approval status
- **Environment-based key management** for minting operations
- **Audit trails** for all blockchain interactions

### Performance Optimizations

#### **Frontend**
- **Code splitting** with React.lazy() for route-based loading
- **Memoization** with useMemo/useCallback in custom hooks
- **Optimistic updates** for wallet operations
- **Bundle optimization** via react-app-rewired configuration

#### **Backend**
- **Connection pooling** for database operations
- **Caching layer** in WalletService (5-minute TTL)
- **Request deduplication** for concurrent wallet status checks
- **Compression and logging** via Express middleware

### Environment Configuration

#### **Required Environment Variables**
```bash
# Frontend (.env)
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
REACT_APP_WALLET_API_URL=http://localhost:3001

# Backend (server/.env)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SOLANA_PAYER_SECRET=base58-encoded-private-key
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Deployment Considerations

#### **Build Process**
- Frontend builds to `build/` directory with optimized assets
- Backend requires Node.js environment with `server.js` entry point
- **Polyfills required** for Solana Web3.js in browser (configured in `config-overrides.js`)

#### **External Dependencies**
- **Supabase** for authentication and database
- **Solana devnet/mainnet** for blockchain operations
- **Material-UI** for consistent design system
- **Multiple wallet adapters** for Phantom, Solflare, Coin98 support

### Common Development Patterns

#### **Component Structure**
- **Pages** in `src/pages/` for route components
- **Reusable components** in `src/components/`
- **Custom hooks** in `src/hooks/` for state management
- **Services** in `src/services/` for external API communication
- **Utilities** in `src/utils/` for pure functions and calculations

#### **Error Handling**
- **ErrorBoundary** component wraps entire application
- **Consistent error responses** from API with request IDs
- **User-friendly error messages** with fallback mechanisms
- **Comprehensive logging** via Winston on server side

#### **State Management**
- **React hooks** for component state
- **Custom hooks** for cross-component state sharing
- **Supabase real-time subscriptions** for server state synchronization
- **Local caching** in services for performance

This architecture enables reliable, scalable carbon credit management with blockchain transparency while maintaining excellent developer experience and user interface responsiveness.