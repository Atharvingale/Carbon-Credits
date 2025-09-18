import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { clusterApiUrl, Connection } from '@solana/web3.js';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  SolongWalletAdapter,
  MathWalletAdapter,
  Coin98WalletAdapter,
  SafePalWalletAdapter,
  TrustWalletAdapter
} from '@solana/wallet-adapter-wallets';
import {
  Alert,
  Snackbar,
  Typography,
  Button,
  Box,
  Chip
} from '@mui/material';
import { WalletError } from '@solana/wallet-adapter-base';
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * Configuration options for the wallet provider
 * @typedef {Object} WalletConfig
 * @property {string} [network] - Solana network (mainnet-beta, devnet, testnet)
 * @property {string} [rpcUrl] - Custom RPC URL
 * @property {boolean} [autoConnect] - Whether to automatically connect wallets
 * @property {string[]} [supportedWallets] - List of supported wallet names
 * @property {Object} [connectionConfig] - Additional connection configuration
 */

const DEFAULT_CONFIG = {
  network: 'devnet',
  autoConnect: false, // Changed to false to prevent auto-connect issues
  supportedWallets: [
    'phantom',
    'solflare',
    'coin98',
    'trustwallet'
  ],
  connectionConfig: {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000
  }
};

/**
 * Enhanced Wallet Provider Wrapper with multiple wallet support and error handling
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {WalletConfig} [props.config] - Wallet configuration options
 * @param {Function} [props.onError] - Error handler callback
 * @param {Function} [props.onConnect] - Connection success callback
 * @param {Function} [props.onDisconnect] - Disconnection callback
 */
export default function WalletProviderWrapper({
  children,
  config = {},
  onError,
  onConnect,
  onDisconnect
}) {
  const [connectionError, setConnectionError] = useState(null);
  const [walletError, setWalletError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Merge user config with defaults
  const walletConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...config
  }), [config]);

  // Determine endpoint
  const endpoint = useMemo(() => {
    if (walletConfig.rpcUrl) {
      return walletConfig.rpcUrl;
    }
    
    if (process.env.REACT_APP_SOLANA_RPC_URL) {
      return process.env.REACT_APP_SOLANA_RPC_URL;
    }
    
    return clusterApiUrl(walletConfig.network);
  }, [walletConfig.rpcUrl, walletConfig.network]);

  // Test connection on mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const connection = new Connection(endpoint, walletConfig.connectionConfig);
        await connection.getVersion();
        setConnectionError(null);
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Connection test failed:', error);
        setConnectionError(error.message);
        setConnectionStatus('error');
      }
    };

    testConnection();
  }, [endpoint, walletConfig.connectionConfig]);

  // Create wallet adapters
  const wallets = useMemo(() => {
    const adapters = [];
    const { supportedWallets } = walletConfig;

    const walletAdapterMap = {
      phantom: () => new PhantomWalletAdapter(),
      solflare: () => new SolflareWalletAdapter(),
      coin98: () => new Coin98WalletAdapter(),
      trustwallet: () => new TrustWalletAdapter(),
      // Additional wallets can be added here as needed
      torus: () => new TorusWalletAdapter(),
      ledger: () => new LedgerWalletAdapter(),
      solong: () => new SolongWalletAdapter(),
      mathwallet: () => new MathWalletAdapter(),
      safepal: () => new SafePalWalletAdapter()
    };

    // Add supported wallets
    supportedWallets.forEach(walletName => {
      const adapterFactory = walletAdapterMap[walletName.toLowerCase()];
      if (adapterFactory) {
        try {
          adapters.push(adapterFactory());
        } catch (error) {
          console.warn(`Failed to initialize ${walletName} wallet:`, error);
        }
      }
    });

    return adapters;
  }, [walletConfig]);

  // Error handler for wallet operations
  const handleWalletError = useCallback((error) => {
    console.error('Wallet error:', error);
    
    let errorMessage = 'An unknown wallet error occurred';
    let errorType = 'error';

    if (error instanceof WalletError) {
      switch (error.error?.code) {
        case 4001:
          errorMessage = 'Connection request was rejected';
          errorType = 'warning';
          break;
        case -32002:
          errorMessage = 'Connection request is already pending';
          errorType = 'info';
          break;
        case -32601:
          errorMessage = 'Wallet does not support this operation';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
    } else {
      errorMessage = error.message || errorMessage;
    }

    setWalletError({ message: errorMessage, type: errorType });
    
    // Call custom error handler if provided
    if (onError) {
      onError(error, errorMessage, errorType);
    }
  }, [onError]);

  // Clear wallet error
  const clearWalletError = useCallback(() => {
    setWalletError(null);
  }, []);

  // Connection error component
  const ConnectionErrorAlert = () => {
    if (!connectionError) return null;

    return (
      <Alert 
        severity="error" 
        sx={{ 
          position: 'fixed',
          top: 80,
          right: 20,
          zIndex: 9999,
          maxWidth: 400
        }}
        action={
          <Button 
            color="inherit" 
            size="small" 
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        }
      >
        <Typography variant="body2" gutterBottom>
          <strong>Connection Error</strong>
        </Typography>
        <Typography variant="caption" display="block">
          {connectionError}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Chip 
            label={`Network: ${walletConfig.network}`}
            size="small" 
            color="error"
            variant="outlined"
          />
        </Box>
      </Alert>
    );
  };

  // Show connection error if unable to connect to Solana
  if (connectionStatus === 'error') {
    return (
      <>
        <ConnectionErrorAlert />
        {children}
      </>
    );
  }

  return (
    <ConnectionProvider 
      endpoint={endpoint}
      config={walletConfig.connectionConfig}
    >
      <WalletProvider
        wallets={wallets}
        autoConnect={walletConfig.autoConnect}
        onError={handleWalletError}
      >
        <WalletModalProvider>
          {children}
          
          {/* Wallet Error Snackbar */}
          <Snackbar
            open={!!walletError}
            autoHideDuration={6000}
            onClose={clearWalletError}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert
              onClose={clearWalletError}
              severity={walletError?.type || 'error'}
              variant="filled"
              sx={{ width: '100%' }}
            >
              {walletError?.message}
            </Alert>
          </Snackbar>
          
          {/* Connection Error Alert */}
          <ConnectionErrorAlert />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

/**
 * Hook to get wallet configuration
 * @returns {Object} Current wallet configuration
 */
export const useWalletConfig = () => {
  return {
    supportedWallets: DEFAULT_CONFIG.supportedWallets,
    network: process.env.REACT_APP_SOLANA_NETWORK || DEFAULT_CONFIG.network,
    endpoint: process.env.REACT_APP_SOLANA_RPC_URL || clusterApiUrl(DEFAULT_CONFIG.network)
  };
};

/**
 * Simple wallet provider wrapper for basic usage
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export const SimpleWalletProvider = ({ children }) => {
  return (
    <WalletProviderWrapper
      config={{
        supportedWallets: ['phantom', 'solflare'],
        autoConnect: false,
        network: 'devnet'
      }}
    >
      {children}
    </WalletProviderWrapper>
  );
};
