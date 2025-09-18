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
            backgroundColor: wallet.connected ? '#4CAF50' : '#2a9d8f',
            borderRadius: '6px',
            height: sizeConfig.buttonHeight,
            fontSize: sizeConfig.fontSize,
            fontWeight: 600
          }}
        />
        {wallet.connected && wallet.hasWallet && (
          <CheckCircleIcon sx={{ color: '#4CAF50', fontSize: sizeConfig.iconSize }} />
        )}
        {wallet.isWalletMismatch && (
          <WarningIcon sx={{ color: '#ff9800', fontSize: sizeConfig.iconSize }} />
        )}
      </Box>
    );
  }

  return (
    <Card sx={{ ...sx }}>
      <CardContent sx={{ p: sizeConfig.spacing }}>
        {/* Loading Progress */}
        {wallet.loading && (
          <LinearProgress
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              borderRadius: '4px 4px 0 0'
            }}
          />
        )}

        {/* Main Wallet Controls */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: sizeConfig.spacing }}>
          
          {/* Wallet Connection Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: sizeConfig.spacing }}>
            <WalletMultiButton
              style={{
                backgroundColor: wallet.connected ? '#4CAF50' : '#2a9d8f',
                borderRadius: '8px',
                height: sizeConfig.buttonHeight,
                fontSize: sizeConfig.fontSize,
                fontWeight: 600,
                flex: 1
              }}
            />

            {/* Action Buttons */}
            {wallet.connected && (
              <Stack direction="row" spacing={1}>
                {/* Refresh Button */}
                <Tooltip title="Refresh Status">
                  <IconButton
                    onClick={wallet.refreshStatus}
                    disabled={wallet.loading}
                    size={size}
                    sx={{ color: '#2196f3' }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>

                {/* Disconnect Button */}
                <Tooltip title="Disconnect Wallet">
                  <IconButton
                    onClick={handleDisconnect}
                    disabled={operationInProgress === 'disconnecting'}
                    size={size}
                    sx={{ color: '#f44336' }}
                  >
                    {operationInProgress === 'disconnecting' ? (
                      <CircularProgress size={sizeConfig.iconSize} />
                    ) : (
                      <DisconnectIcon />
                    )}
                  </IconButton>
                </Tooltip>
              </Stack>
            )}
          </Box>

          {/* Status Alert */}
          <Alert
            severity={statusDisplay.type}
            icon={
              statusDisplay.type === 'success' ? <CheckCircleIcon /> :
              statusDisplay.type === 'warning' ? <WarningIcon /> :
              statusDisplay.type === 'error' ? <ErrorIcon /> : <InfoIcon />
            }
            action={
              wallet.connected && !wallet.hasWallet && wallet.user && showSaveButton ? (
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setShowSaveDialog(true)}
                  startIcon={operationInProgress === 'saving' ? <CircularProgress size={16} /> : <SyncIcon />}
                  disabled={!!operationInProgress}
                >
                  Save Wallet
                </Button>
              ) : wallet.isWalletMismatch ? (
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setShowSaveDialog(true)}
                  disabled={!!operationInProgress}
                >
                  Update
                </Button>
              ) : null
            }
          >
            <Typography variant="body2">
              {operationInProgress === 'auto-saving' ? 'Auto-saving wallet...' : statusDisplay.message}
            </Typography>
          </Alert>

          {/* Detailed Wallet Information */}
          {showDetails && (wallet.connected || wallet.hasWallet) && (
            <Box>
              {/* Connected Wallet Info */}
              {wallet.publicKey && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                    Connected:
                  </Typography>
                  <Chip
                    label={formatPublicKey(wallet.publicKey, 6)}
                    size="small"
                    color={wallet.hasWallet && !wallet.isWalletMismatch ? 'success' : 'warning'}
                    variant="outlined"
                    sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                  />
                </Box>
              )}

              {/* Saved Wallet Info */}
              {wallet.walletAddress && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                    Saved:
                  </Typography>
                  <Chip
                    label={formatWalletAddress(wallet.walletAddress, 6, 6)}
                    size="small"
                    color="primary"
                    variant="filled"
                    sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                  />
                  {wallet.verified && (
                    <SecurityIcon sx={{ fontSize: 16, color: '#4caf50', ml: 0.5 }} />
                  )}
                  {showSaveButton && (
                    <Button
                      size="small"
                      color="error"
                      onClick={handleRemoveWallet}
                      disabled={operationInProgress === 'removing'}
                      startIcon={operationInProgress === 'removing' ? <CircularProgress size={12} /> : null}
                      sx={{ ml: 'auto', minWidth: 'auto' }}
                    >
                      Remove
                    </Button>
                  )}
                </Box>
              )}

              {/* Advanced Information */}
              {wallet.connectedAt && (
                <Box>
                  <Button
                    size="small"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    startIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    Advanced
                  </Button>
                  
                  <Collapse in={showAdvanced}>
                    <Box sx={{ pl: 2, pt: 1 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Connected: {new Date(wallet.connectedAt).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Status: {wallet.verified ? 'Verified' : 'Unverified'}
                      </Typography>
                    </Box>
                  </Collapse>
                </Box>
              )}
            </Box>
          )}

          {/* Error Display */}
          {wallet.error && (
            <Alert
              severity="error"
              onClose={wallet.clearError}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={wallet.refreshStatus}
                >
                  Retry
                </Button>
              }
            >
              <Typography variant="body2">
                {wallet.error}
              </Typography>
            </Alert>
          )}
        </Box>

        {/* Save Confirmation Dialog */}
        <Dialog
          open={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WalletIcon />
            {wallet.isWalletMismatch ? 'Update Wallet Address' : 'Save Wallet Address'}
          </DialogTitle>
          
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              {wallet.isWalletMismatch
                ? 'You have a different wallet connected than the one saved in your account. Would you like to update your saved wallet address?'
                : 'This will save your current wallet address to your account for carbon credit token operations.'
              }
            </Typography>

            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current Wallet:
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {wallet.publicKey}
              </Typography>
            </Box>

            {wallet.isWalletMismatch && wallet.walletAddress && (
              <Box sx={{ mt: 1, p: 2, bgcolor: 'rgba(255, 152, 0, 0.1)', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Currently Saved:
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {wallet.walletAddress}
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(33, 150, 243, 0.1)', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <InfoIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                What happens after saving?
              </Typography>
              <Typography variant="caption" display="block">
                • Carbon credit tokens will be minted to this wallet
              </Typography>
              <Typography variant="caption" display="block">
                • You can view your token balance in this wallet
              </Typography>
              <Typography variant="caption" display="block">
                • This wallet will be used for all blockchain operations
              </Typography>
            </Box>
          </DialogContent>

          <DialogActions>
            <Button 
              onClick={() => setShowSaveDialog(false)}
              disabled={operationInProgress === 'saving'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveWallet}
              variant="contained"
              disabled={operationInProgress === 'saving'}
              startIcon={operationInProgress === 'saving' ? <CircularProgress size={16} /> : <SyncIcon />}
            >
              {operationInProgress === 'saving' ? 'Saving...' : (wallet.isWalletMismatch ? 'Update' : 'Save')}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}