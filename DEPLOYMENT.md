# Deployment Guide - Unified Blue Carbon MRV System

## Pre-Deployment Security Checklist

### ✅ Completed Security Enhancements
- [x] Removed all debug statements (`console.log`, `alert`, etc.)
- [x] Implemented input sanitization utilities
- [x] Enhanced authentication and authorization
- [x] Added proper error handling throughout the application
- [x] Replaced insecure UI patterns with proper components
- [x] Validated environment variable handling

## Environment Setup

### Frontend Environment Variables (.env)
```bash
# Supabase Configuration
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key

# Wallet API Configuration
REACT_APP_WALLET_API_URL=https://api.yourdomain.com

# Production Settings
GENERATE_SOURCEMAP=false
REACT_APP_ENV=production
```

### Backend Environment Variables (.env)
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Solana Configuration
SOLANA_PAYER_SECRET=your-base58-private-key
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_CLUSTER=mainnet-beta

# Server Configuration
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=error
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

## Database Configuration (Supabase)

### 1. Row Level Security (RLS) Policies

#### Users Table
```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

#### Projects Table
```sql
-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view projects
CREATE POLICY "Anyone can view projects" ON projects
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only project owners and admins can update projects
CREATE POLICY "Owners and admins can update projects" ON projects
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Authenticated users can create projects
CREATE POLICY "Authenticated users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

#### Carbon Credits Table
```sql
-- Enable RLS
ALTER TABLE carbon_credits ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view carbon credits
CREATE POLICY "Anyone can view carbon credits" ON carbon_credits
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can mint carbon credits
CREATE POLICY "Only admins can mint carbon credits" ON carbon_credits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 2. Database Indexes for Performance
```sql
-- Add indexes for better query performance
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_carbon_credits_project_id ON carbon_credits(project_id);
CREATE INDEX idx_carbon_credits_owner ON carbon_credits(owner);
CREATE INDEX idx_users_role ON users(role);
```

## Production Build Process

### Frontend Build
```bash
# Install dependencies
npm install

# Run production build
npm run build

# The build folder will contain optimized production files
```

### Backend Preparation
```bash
# Install production dependencies only
npm ci --only=production

# Ensure all environment variables are set
node -e "console.log('Environment check passed')"
```

## Deployment Options

### Option 1: Vercel (Frontend) + Railway/Heroku (Backend)

#### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `build`
4. Deploy

#### Backend (Railway/Heroku)
1. Create new application
2. Set environment variables
3. Configure start script in package.json:
```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

### Option 2: Docker Deployment

#### Frontend Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Backend Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
USER node
CMD ["node", "server.js"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  frontend:
    build:
      context: ./frontend
    ports:
      - "80:80"
    environment:
      - REACT_APP_SUPABASE_URL=${REACT_APP_SUPABASE_URL}
      - REACT_APP_SUPABASE_ANON_KEY=${REACT_APP_SUPABASE_ANON_KEY}
      - REACT_APP_WALLET_API_URL=${REACT_APP_WALLET_API_URL}

  backend:
    build:
      context: ./backend
    ports:
      - "3001:3001"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - SOLANA_PAYER_SECRET=${SOLANA_PAYER_SECRET}
      - SOLANA_RPC_URL=${SOLANA_RPC_URL}
      - SOLANA_CLUSTER=${SOLANA_CLUSTER}
      - CORS_ORIGIN=${CORS_ORIGIN}
```

## Nginx Configuration (if using reverse proxy)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/ssl/certificate.pem;
    ssl_certificate_key /path/to/ssl/private.key;

    # Frontend
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Referrer-Policy "strict-origin-when-cross-origin";
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring and Logging

### Application Monitoring
1. Set up application performance monitoring (APM)
2. Configure error tracking (e.g., Sentry)
3. Monitor Supabase usage and performance
4. Set up uptime monitoring

### Logging Configuration
```javascript
// server.js logging middleware
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

## Security Hardening

### 1. HTTPS/SSL Configuration
- Obtain SSL certificates (Let's Encrypt for free certificates)
- Configure HTTPS redirects
- Use HSTS headers
- Implement proper cipher suites

### 2. Content Security Policy (CSP)
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline' fonts.googleapis.com;
               font-src 'self' fonts.gstatic.com;
               img-src 'self' data: https:;
               connect-src 'self' https://*.supabase.co wss://*.supabase.co;">
```

### 3. Environment Security
- Use secrets management service (AWS Secrets Manager, Azure Key Vault, etc.)
- Implement proper key rotation
- Regular security audits
- Monitor for security vulnerabilities

## Health Checks and Monitoring

### Backend Health Check Endpoint
```javascript
// Add to server.js
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV
  });
});
```

### Frontend Health Monitoring
```javascript
// Add service worker for offline detection
// Monitor API connectivity
// Implement graceful degradation
```

## Backup and Recovery

### Database Backup
- Configure Supabase automatic backups
- Implement point-in-time recovery
- Regular backup testing
- Document recovery procedures

### Application Backup
- Source code version control (Git)
- Configuration backup
- Media/file storage backup
- Documentation backup

## Performance Optimization

### Frontend Optimization
- Code splitting and lazy loading
- Image optimization
- Caching strategies
- CDN integration

### Backend Optimization
- Database query optimization
- API response caching
- Connection pooling
- Load balancing

## Deployment Verification Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations applied
- [ ] Security policies configured
- [ ] Monitoring systems set up

### Post-Deployment
- [ ] Health checks passing
- [ ] All API endpoints responding
- [ ] User authentication working
- [ ] Admin functions accessible
- [ ] Carbon credit minting working
- [ ] Wallet integration functional
- [ ] Error monitoring active
- [ ] Performance metrics baseline established

## Rollback Procedures

### Quick Rollback
1. Revert to previous Git commit
2. Redeploy previous version
3. Verify functionality
4. Monitor for issues

### Database Rollback
1. Stop application
2. Restore database from backup
3. Apply necessary migrations
4. Restart application
5. Verify data integrity

## Support and Maintenance

### Regular Tasks
- Security updates and patches
- Dependency updates
- Database maintenance
- Log cleanup
- Performance monitoring
- Backup verification

### Emergency Procedures
- Incident response plan
- Contact information
- Escalation procedures
- Communication plan

---

**Note**: This deployment guide should be customized based on your specific infrastructure requirements and constraints. Always test deployments in a staging environment before going to production.