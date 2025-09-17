import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
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
  Tooltip
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Sync as SyncIcon,
  Logout as DisconnectIcon
} from '@mui/icons-material';
import { formatPublicKey } from '../lib/solana';
import { supabase } from '../lib/supabaseClient';

export default function ConnectWallet({ onWalletSaved, showSaveButton = true, compact = false }) {
  const { publicKey, connected, disconnect } = useWallet();
  const [user, setUser] = useState(null);
  const [savedWalletAddress, setSavedWalletAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isWalletMismatch, setIsWalletMismatch] = useState(false);
  
  // Define fetchSavedWalletAddress first
  const fetchSavedWalletAddress = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const response = await fetch('http://localhost:3001/wallet', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSavedWalletAddress(data.walletAddress);
      } else if (response.status === 404) {
        // API endpoint not found, wallet API server may not be running
        console.warn('Wallet API server not available. Some features may be limited.');
      } else {
        console.error('Failed to fetch wallet:', response.status, response.statusText);
      }
    } catch (error) {
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        // Network error - wallet API server likely not running
        console.warn('Wallet API server not accessible. Please ensure it is running on port 3001.');
      } else {
        console.error('Error fetching saved wallet:', error);
      }
    }
  }, [user]);

  // Check user authentication status
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  // Fetch saved wallet address when user changes
  useEffect(() => {
    if (user) {
      fetchSavedWalletAddress();
    } else {
      setSavedWalletAddress(null);
    }
  }, [user, fetchSavedWalletAddress]);
  
  // Check for wallet address mismatch
  useEffect(() => {
    if (publicKey && savedWalletAddress && connected) {
      const currentWallet = publicKey.toBase58();
      setIsWalletMismatch(currentWallet !== savedWalletAddress);
    } else {
      setIsWalletMismatch(false);
    }
  }, [publicKey, savedWalletAddress, connected]);
  
  const saveWalletAddress = async () => {
    if (!user || !publicKey || !connected) {
      setError('Please connect your wallet and ensure you\'re logged in');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in to save your wallet address');
        return;
      }
      
      const walletAddress = publicKey.toBase58();
      
      const response = await fetch('http://localhost:3001/wallet', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ walletAddress })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSavedWalletAddress(walletAddress);
        setSuccess('Wallet address saved successfully!');
        setIsWalletMismatch(false);
        setShowSaveDialog(false);
        
        // Call callback if provided
        if (onWalletSaved) {
          onWalletSaved(walletAddress);
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to save wallet address');
      }
    } catch (error) {
      console.error('Error saving wallet:', error);
      setError('Failed to connect to wallet service');
    } finally {
      setLoading(false);
    }
  };
  
  const disconnectWallet = async () => {
    try {
      await disconnect();
      setIsWalletMismatch(false);
      setError(null);
      setSuccess(null);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };
  
  const removeSavedWallet = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in to remove your wallet address');
        return;
      }
      
      const response = await fetch('http://localhost:3001/wallet', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setSavedWalletAddress(null);
        setSuccess('Wallet address removed successfully!');
        setIsWalletMismatch(false);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to remove wallet address');
      }
    } catch (error) {
      console.error('Error removing wallet:', error);
      setError('Failed to connect to wallet service');
    } finally {
      setLoading(false);
    }
  };
  
  const getWalletStatus = () => {
    if (!user) {
      return { type: 'info', message: 'Please log in to save your wallet address', icon: <InfoIcon /> };
    }
    
    if (!connected) {
      return { type: 'info', message: 'Connect your wallet to get started', icon: <InfoIcon /> };
    }
    
    if (isWalletMismatch) {
      return { 
        type: 'warning', 
        message: 'Connected wallet differs from saved wallet address', 
        icon: <ErrorIcon /> 
      };
    }
    
    if (connected && savedWalletAddress) {
      return { 
        type: 'success', 
        message: 'Wallet connected and saved to your account', 
        icon: <CheckCircleIcon /> 
      };
    }
    
    if (connected && !savedWalletAddress) {
      return { 
        type: 'warning', 
        message: 'Wallet connected but not saved to your account', 
        icon: <InfoIcon /> 
      };
    }
    
    return { type: 'info', message: 'Ready to connect', icon: <InfoIcon /> };
  };
  
  const walletStatus = getWalletStatus();
  
  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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