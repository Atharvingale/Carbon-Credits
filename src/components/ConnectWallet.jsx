import React, { useState, useCallback, useMemo } from 'react';
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
import {
  Box,
  Typography,
  Chip,
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Divider,
  Stack,
  LinearProgress,
  Collapse
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Sync as SyncIcon,
  Logout as DisconnectIcon,
  AccountBalanceWallet as WalletIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { formatPublicKey } from '../lib/solana';
import { useWallet } from '../hooks/useWallet';
import { formatWalletAddress, getWalletStatusDisplay } from '../utils/walletUtils';

/**
 * Enhanced ConnectWallet component with improved state management and UX
 * @param {Object} props
 * @param {Function} [props.onWalletSaved] - Callback when wallet is saved
 * @param {boolean} [props.showSaveButton] - Whether to show save button
 * @param {boolean} [props.compact] - Whether to use compact display
 * @param {boolean} [props.showDetails] - Whether to show detailed wallet info
 * @param {boolean} [props.autoSave] - Whether to automatically save on connection
 * @param {string} [props.size] - Size variant (small, medium, large)
 * @param {Object} [props.sx] - Custom styles
 */
export default function ConnectWallet({
  onWalletSaved,
  showSaveButton = true,
  compact = false,
  showDetails = true,
  autoSave = false,
  size = 'medium',
  sx = {}
}) {
  const wallet = useWallet();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [operationInProgress, setOperationInProgress] = useState(null);

  // Get wallet status display info
  const statusDisplay = useMemo(() => {
    return getWalletStatusDisplay({
      connected: wallet.connected,
      hasWallet: wallet.hasWallet,
      publicKey: wallet.publicKey,
      walletAddress: wallet.walletAddress,
      loading: wallet.loading,
      error: wallet.error
    });
  }, [wallet]);

  // Auto-save wallet when connected (if enabled)
  const handleAutoSave = useCallback(async () => {
    if (autoSave && wallet.connected && wallet.publicKey && !wallet.hasWallet) {
      try {
        setOperationInProgress('auto-saving');
        const result = await wallet.saveWallet();
        if (result.success && onWalletSaved) {
          onWalletSaved(wallet.publicKey);
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setOperationInProgress(null);
      }
    }
  }, [autoSave, wallet, onWalletSaved]);

  // Trigger auto-save when conditions are met
  React.useEffect(() => {
    handleAutoSave();
  }, [handleAutoSave]);

  // Handle manual save
  const handleSaveWallet = useCallback(async () => {
    try {
      setOperationInProgress('saving');
      const result = await wallet.saveWallet();
      
      if (result.success) {
        setShowSaveDialog(false);
        if (onWalletSaved) {
          onWalletSaved(wallet.publicKey);
        }
      }
    } catch (error) {
      console.error('Save wallet failed:', error);
    } finally {
      setOperationInProgress(null);
    }
  }, [wallet, onWalletSaved]);

  // Handle remove wallet
  const handleRemoveWallet = useCallback(async () => {
    try {
      setOperationInProgress('removing');
      await wallet.removeWallet();
    } catch (error) {
      console.error('Remove wallet failed:', error);
    } finally {
      setOperationInProgress(null);
    }
  }, [wallet]);

  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    try {
      setOperationInProgress('disconnecting');
      await wallet.disconnect();
    } catch (error) {
      console.error('Disconnect failed:', error);
    } finally {
      setOperationInProgress(null);
    }
  }, [wallet]);

  // Size configurations
  const sizeConfig = useMemo(() => {
    const configs = {
      small: {
        buttonHeight: 36,
        fontSize: 14,
        iconSize: 18,
        spacing: 1
      },
      medium: {
        buttonHeight: 48,
        fontSize: 16,
        iconSize: 20,
        spacing: 2
      },
      large: {
        buttonHeight: 56,
        fontSize: 18,
        iconSize: 24,
        spacing: 3
      }
    };
    return configs[size] || configs.medium;
  }, [size]);

  // Compact view
  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ...sx }}>
        <WalletMultiButton 
          style={{
            backgroundColor: connected ? '#4CAF50' : '#2a9d8f',
            borderRadius: '6px',
            height: '36px',
            fontSize: '14px',
            fontWeight: 600
          }}
        />
        {publicKey && savedWalletAddress && (
          <CheckCircleIcon sx={{ color: '#4CAF50', fontSize: 20 }} />
        )}
      </Box>
    );
  }
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Wallet Connection Button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <WalletMultiButton 
          style={{
            backgroundColor: connected ? '#4CAF50' : '#2a9d8f',
            borderRadius: '8px',
            height: '48px',
            fontSize: '16px',
            fontWeight: 600,
            flex: 1
          }}
        />
        
        {connected && (
          <Tooltip title="Disconnect Wallet">
            <IconButton 
              onClick={disconnectWallet}
              sx={{ 
                color: '#f44336',
                '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.1)' }
              }}
            >
              <DisconnectIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      
      {/* Connected Wallet Info */}
      {publicKey && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            Connected:
          </Typography>
          <Chip 
            label={formatPublicKey(publicKey, 4)}
            size="small"
            color={savedWalletAddress === publicKey.toBase58() ? 'success' : 'warning'}
            variant="outlined"
            sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
          />
        </Box>
      )}
      
      {/* Saved Wallet Info */}
      {savedWalletAddress && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            Saved:
          </Typography>
          <Chip 
            label={formatPublicKey({ toBase58: () => savedWalletAddress }, 4)}
            size="small"
            color="primary"
            variant="filled"
            sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
          />
          <Button 
            size="small" 
            color="error" 
            onClick={removeSavedWallet}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            Remove
          </Button>
        </Box>
      )}
      
      {/* Status Alert */}
      <Alert 
        severity={walletStatus.type} 
        icon={walletStatus.icon}
        action={
          connected && !savedWalletAddress && user && showSaveButton ? (
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => setShowSaveDialog(true)}
              startIcon={<SyncIcon />}
              disabled={loading}
            >
              Save Wallet
            </Button>
          ) : isWalletMismatch ? (
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => setShowSaveDialog(true)}
              disabled={loading}
            >
              Update
            </Button>
          ) : null
        }
      >
        {walletStatus.message}
      </Alert>
      
      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ mt: 1 }}
        >
          {error}
        </Alert>
      )}
      
      {/* Success Alert */}
      {success && (
        <Alert 
          severity="success" 
          onClose={() => setSuccess(null)}
          sx={{ mt: 1 }}
        >
          {success}
        </Alert>
      )}
      
      {/* Save Confirmation Dialog */}
      <Dialog 
        open={showSaveDialog} 
        onClose={() => setShowSaveDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {isWalletMismatch ? 'Update Wallet Address' : 'Save Wallet Address'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {isWalletMismatch 
              ? 'You have a different wallet connected than the one saved in your account. Would you like to update your saved wallet address?'
              : 'This will save your current wallet address to your account for token minting and other operations.'
            }
          </Typography>
          
          <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Current Wallet:
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {publicKey?.toBase58()}
            </Typography>
          </Box>
          
          {isWalletMismatch && savedWalletAddress && (
            <Box sx={{ mt: 1, p: 2, bgcolor: 'rgba(255, 152, 0, 0.1)', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Currently Saved:
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {savedWalletAddress}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>Cancel</Button>
          <Button 
            onClick={saveWalletAddress} 
            variant="contained" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <SyncIcon />}
          >
            {loading ? 'Saving...' : (isWalletMismatch ? 'Update' : 'Save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}