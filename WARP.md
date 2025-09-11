# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Monorepo-style layout with a React frontend (Create React App + react-app-rewired) and a minimal Node/Express server for minting Solana SPL tokens and recording them in Supabase.
- Frontend integrates Solana wallet adapters (Phantom) and Supabase auth. Admins mint carbon-credit tokens via the server endpoint.

Prerequisites
- Node.js LTS and npm
- For Solana features: a Devnet RPC URL and a funded payer keypair via env vars
- Supabase project with URL and keys

Environment variables
- Frontend (.env at repo root; CRA requires REACT_APP_ prefix):
  - REACT_APP_SUPABASE_URL
  - REACT_APP_SUPABASE_ANON_KEY
  - REACT_APP_SOLANA_RPC_URL (optional; defaults to devnet)
- Server (server/.env):
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - SOLANA_RPC_URL (optional; defaults to https://api.devnet.solana.com)
  - SOLANA_PAYER_SECRET (base58 string or JSON array for Keypair)
  - PORT (optional; defaults to 3001)

Install
- Frontend: npm install
- Server: (cd server && npm install)

Common commands
- Frontend dev server: npm start
- Frontend build: npm run build
- Frontend tests (watch): npm test
- Run a single test: npm test -- <pattern>
  - Example: npm test -- UserDashboard
- Lint: CRA uses ESLint presets. Run via: npx eslint src --ext .js,.jsx (if eslint is installed globally/locally)
- Server start (dev/prod): (cd server && npm start)

Windows/PowerShell notes
- Use PowerShell-compatible commands as above. If using separate terminals, start frontend in one and server in another.

Local development workflow
- Start server first: (cd server && npm start)
- Start frontend: npm start
- Frontend expects the server route at /api/mint; configure a proxy if needed (see below).

Dev server proxy
- If you serve the Express API on http://localhost:3001, set CRA proxy in package.json (root) to "proxy": "http://localhost:3001" so that fetch('/api/mint') works in development.
  - Add or verify the proxy field if missing.

High-level architecture
- Frontend (React + MUI)
  - src/index.js boots the app and sets window.process for browser polyfills used by Solana libs.
  - src/App.js wires React Router routes for public pages and dashboards.
  - Wallet context: src/components/WalletProviderWrapper.jsx
    - Provides Solana ConnectionProvider + WalletProvider (Phantom adapter), reading REACT_APP_SOLANA_RPC_URL or devnet by default.
  - Auth and data: src/lib/supabaseClient.js
    - Creates a Supabase client from REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.
  - UserDashboard.jsx
    - Requires Supabase session; redirects to /login if absent.
    - Uses wallet-adapter to read connected wallet, fetches SOL balance, SPL token accounts, and recent signatures from the configured cluster.
  - AdminDashboard.jsx
    - Requires Supabase session with profiles.role === 'admin'.
    - Lists pending/approved projects from Supabase, allows approving.
    - Mints tokens by POSTing to /api/mint with bearer JWT from Supabase session.
  - Webpack/browser polyfills: config-overrides.js via react-app-rewired provides Node core shims (process, buffer, crypto, stream, zlib, util) required by Solana/Web3 in the browser.

- Server (Express, server/api/mint.js)
  - Loads env from server/.env.
  - Creates Supabase service client using SUPABASE_SERVICE_ROLE_KEY to verify JWTs and update tables.
  - Establishes a Solana Connection (Devnet by default) and derives a payer Keypair from SOLANA_PAYER_SECRET (base58 or JSON array).
  - POST /api/mint
    - Auth: expects Authorization: Bearer <JWT> (Supabase session access token).
    - Verifies user via supabase.auth.getUser(token) and requires profiles.role === 'admin'.
    - Creates a new mint, ensures recipient ATA, mints amount adjusted by decimals, records in Supabase tokens table, and updates projects.mint_address.
    - Responds with mint address and explorer URL for Devnet.

Data model expectations (Supabase)
- profiles: { id (user id), role ('admin' to access mint) }
- projects: fields include id, status ('pending'/'approved'), mint_address
- tokens: mint, project_id, recipient, amount, minted_tx

Notable implementation details
- React uses react-app-rewired; do not use react-scripts directly for start/build/test.
- For browser compatibility, window.process is explicitly set in src/index.js and Webpack fallbacks are provided.
- src/lib/solana.js is currently empty; consider consolidating wallet/SPL helpers here.

Troubleshooting
- If frontend cannot call /api/mint in dev, add a proxy field in root package.json or configure the full server URL in the fetch call.
- If Solana minting fails with secret format, ensure SOLANA_PAYER_SECRET is either base58 or a JSON array string of the secret key.
- Ensure the payer has sufficient Devnet SOL to pay fees.

Key files to start with
- Frontend: src/App.js, src/components/WalletProviderWrapper.jsx, src/pages/AdminDashboard.jsx, src/pages/UserDashboard.jsx
- Server: server/api/mint.js
- Build config: config-overrides.js, package.json (root and server)

