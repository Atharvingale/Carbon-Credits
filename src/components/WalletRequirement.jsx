import React, { useState, useEffect } from 'react';
import {
  Box,
  Alert,
  Button,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useWalletRequirement } from '../hooks/useWallet';
import ConnectWallet from './ConnectWallet_New';
import walletService from '../services/walletService';

/**
 * Component that checks wallet requirement and blocks actions if wallet not connected
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to show when wallet requirement is met
 * @param {string} props.context - Context for wallet requirement message
 * @param {string} props.actionName - Name of the action being blocked (e.g., "create project")
 * @param {boolean} props.showWalletConnection - Whether to show wallet connection component
 * @param {function} props.onWalletConnected - Callback when wallet is connected
 */
export default function WalletRequirement({ 
  children, 
  context = 'project_creation',
  actionName = 'perform this action',
  showWalletConnection = true,
  onWalletConnected 
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [walletStatus, setWalletStatus] = useState({
    loading: true,
    hasWallet: false,
    walletAddress: null,
    error: null
  });

  // Check user authentication
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      setUser(session.user);
    };
    
    checkUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Check wallet status when user changes
  useEffect(() => {
    if (user) {
      checkWalletStatus();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkWalletStatus = async () => {
    if (!user) return;
    
    setWalletStatus(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await walletService.checkWalletStatus(user.id, false);
      setWalletStatus({
        loading: false,
        hasWallet: result.hasWallet,
        walletAddress: result.walletAddress,
        error: result.error
      });
    } catch (error) {
      setWalletStatus({
        loading: false,
        hasWallet: false,
        walletAddress: null,
        error: error.message
      });
    }
  };

  const handleWalletSaved = (walletAddress) => {
    setWalletStatus(prev => ({
      ...prev,
      hasWallet: true,
      walletAddress,
      error: null
    }));
    
    if (onWalletConnected) {
      onWalletConnected(walletAddress);
    }
  };

  // Loading state
  if (walletStatus.loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '200px',
        gap: 2
      }}>
        <CircularProgress sx={{ color: '#00d4aa' }} />
        <Typography variant="body2" color="text.secondary">
          Checking wallet connection...
        </Typography>
      </Box>
    );
  }

  // Wallet requirement met - show children
  if (walletStatus.hasWallet) {
    return (
      <Box>
        {/* Optional: Show wallet status at the top */}
        <Alert 
          severity="success" 
          icon={<CheckIcon />}
          sx={{ 
            mb: 2,
            bgcolor: 'rgba(76, 175, 80, 0.1)',
            color: '#4caf50',
            border: '1px solid rgba(76, 175, 80, 0.3)'
          }}
        >
          <Typography variant="body2">
            ✅ Wallet connected: {walletStatus.walletAddress?.slice(0, 8)}...{walletStatus.walletAddress?.slice(-6)}
          </Typography>
        </Alert>
        {children}
      </Box>
    );
  }

  // Wallet requirement not met - show requirement screen
  return (
    <Card sx={{ 
      bgcolor: '#1a2332', 
      border: '2px solid #ff9800',
      borderRadius: 3,
      maxWidth: '800px',
      mx: 'auto',
      mt: 4
    }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <WalletIcon sx={{ 
            fontSize: 64, 
            color: '#ff9800', 
            mb: 2 
          }} />
          <Typography variant="h4" sx={{ 
            color: '#ffffff', 
            fontWeight: 700,
            mb: 2
          }}>
            Wallet Connection Required
          </Typography>
          <Typography variant="h6" sx={{ 
            color: '#a0a9ba',
            mb: 3,
            maxWidth: '600px',
            mx: 'auto'
          }}>
            You need to connect and save a wallet address before you can {actionName}.
          </Typography>
        </Box>

        <Alert 
          severity="warning" 
          icon={<WarningIcon />}
          sx={{ 
            mb: 4,
            bgcolor: 'rgba(255, 152, 0, 0.1)',
            color: '#ff9800',
            border: '1px solid rgba(255, 152, 0, 0.3)'
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
            Why is a wallet required?
          </Typography>
          <Typography variant="body2">
            {walletService.getRequirementMessage(context)}
          </Typography>
        </Alert>

        {walletStatus.error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 4,
              bgcolor: 'rgba(244, 67, 54, 0.1)',
              color: '#f44336',
              border: '1px solid rgba(244, 67, 54, 0.3)'
            }}
          >
            <Typography variant="body2">
              Error checking wallet: {walletStatus.error}
            </Typography>
          </Alert>
        )}

        {showWalletConnection && (
          <Box>
            <Divider sx={{ 
              my: 4, 
              borderColor: '#2d3748'
            }} />
            
            <Typography variant="h6" sx={{ 
              color: '#ffffff', 
              mb: 3,
              textAlign: 'center'
            }}>
              Connect Your Wallet
            </Typography>
            
            <ConnectWallet 
              onWalletSaved={handleWalletSaved}
              showSaveButton={true}
            />
            
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button 
                variant="outlined"
                onClick={checkWalletStatus}
                sx={{
                  color: '#00d4aa',
                  borderColor: '#00d4aa',
                  '&:hover': {
                    borderColor: '#00d4aa',
                    bgcolor: 'rgba(0, 212, 170, 0.1)'
                  }
                }}
              >
                Refresh Wallet Status
              </Button>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}