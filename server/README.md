# Blue Carbon MRV System Server

A unified Node.js/Express server that provides API endpoints for wallet management and carbon credit token minting for the Blue Carbon MRV (Monitoring, Reporting, and Verification) system.

## Features

- **Wallet Management**: Connect, verify, and manage Solana wallet addresses
- **Token Minting**: Create and mint SPL tokens for carbon credits (admin only)
- **Security**: Rate limiting, input validation, authentication, and comprehensive logging
- **Health Monitoring**: Health check endpoint with system status
- **Request Tracing**: Unique request IDs and detailed logging for debugging

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- A Supabase project with required tables
- Solana wallet keypair for minting operations
- Environment variables configured

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (create `.env` file):
```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PAYER_SECRET=your-base58-encoded-private-key
SOLANA_CLUSTER=devnet

# Server Configuration
PORT=3001
HOST=localhost
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=info
```

### Running the Server

- **Development**: `npm run dev` (with hot reload)
- **Production**: `npm run prod`
- **Standard**: `npm start`

The server will start on http://localhost:3001 by default.

## API Endpoints

### Health Check
- `GET /health` - Returns server status, uptime, and system information

### Wallet Management
- `GET /wallet` - Get user's connected wallet address
- `POST /wallet` - Connect/update user's wallet address
- `DELETE /wallet` - Remove user's wallet connection

### Token Minting (Admin Only)
- `POST /mint` - Mint carbon credit tokens to a specified wallet

## Authentication

All endpoints except `/health` require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <supabase-jwt-token>
```

Admin endpoints additionally require the user to have `admin` role in their profile.

## Request/Response Examples

### Connect Wallet
```bash
curl -X POST http://localhost:3001/wallet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
  }'
```

### Mint Tokens (Admin Only)
```bash
curl -X POST http://localhost:3001/mint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "recipientWallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "amount": 100,
    "decimals": 0
  }'
```

## Security Features

- **Rate Limiting**: 
  - General API: 100 requests per 15 minutes
  - Minting: 5 requests per minute
- **Input Validation**: Comprehensive validation using express-validator
- **Security Headers**: Helmet.js for security headers
- **CORS**: Configurable cross-origin resource sharing
- **Request Tracing**: Unique request IDs for debugging
- **Comprehensive Logging**: Winston-based logging with error tracking

## Database Requirements

The server expects the following Supabase tables:

### `profiles` table
```sql
- id (uuid, primary key)
- wallet_address (text, nullable)
- wallet_connected_at (timestamp, nullable)
- wallet_verified (boolean, default false)
- role (text, default 'user')
- updated_at (timestamp)
```

### `projects` table
```sql
- id (uuid, primary key)
- title (text)
- status (text)
- calculated_credits (numeric)
- mint_address (text, nullable)
- credits_issued (integer, nullable)
```

### `tokens` table
```sql
- mint (text, primary key)
- project_id (uuid, foreign key)
- recipient (text)
- amount (bigint)
- decimals (integer)
- minted_tx (text)
- minted_by (uuid)
- token_standard (text)
- token_symbol (text)
- token_name (text)
- status (text)
- created_at (timestamp)
```

### `admin_logs` table
```sql
- admin_id (uuid)
- action (text)
- target_type (text)
- target_id (uuid)
- details (text)
- metadata (jsonb)
- created_at (timestamp)
```

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `SUPABASE_URL` | Yes | Supabase project URL | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key | - |
| `SOLANA_PAYER_SECRET` | Yes | Base58 encoded Solana private key | - |
| `SOLANA_RPC_URL` | No | Solana RPC endpoint | `https://api.devnet.solana.com` |
| `SOLANA_CLUSTER` | No | Solana cluster name | `devnet` |
| `PORT` | No | Server port | `3001` |
| `HOST` | No | Server host | `localhost` |
| `CORS_ORIGIN` | No | CORS allowed origin | `http://localhost:3000` |
| `NODE_ENV` | No | Environment mode | `development` |
| `LOG_LEVEL` | No | Logging level | `info` |

## Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console output (development)

View logs in real-time:
```bash
npm run logs        # All logs
npm run logs:error  # Error logs only
```

## Error Handling

The server provides detailed error responses with:
- Error type and message
- Request ID for tracing
- Validation details (when applicable)
- Stack trace (development mode only)

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure proper `CORS_ORIGIN`
3. Use a process manager like PM2
4. Set up log rotation
5. Configure reverse proxy (nginx)
6. Enable HTTPS

## Troubleshooting

### Common Issues

1. **Authentication Failed**: Verify Supabase configuration and JWT token
2. **Wallet Validation Error**: Check Solana wallet address format
3. **Mint Failed**: Ensure sufficient SOL balance and valid project status
4. **Rate Limited**: Wait for rate limit window to reset

### Debug Mode

Set `LOG_LEVEL=debug` for verbose logging.

### Health Check

Visit `http://localhost:3001/health` to verify server status and configuration.

## Contributing

1. Follow existing code style
2. Add tests for new features
3. Update documentation
4. Ensure security best practices

## License

This project is part of the Blue Carbon MRV System developed for the Smart India Hackathon.