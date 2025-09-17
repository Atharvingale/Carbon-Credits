import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Button, Container, Grid, Typography, Stack, Divider, Alert, Snackbar 
} from '@mui/material';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { supabase } from '../lib/supabaseClient';
import { checkUserWallet } from '../utils/walletUtils';

const NewRegistry = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const [showWalletAlert, setShowWalletAlert] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
    };
    checkAuth();
  }, []);

  // Handle Start Registration button click
  const handleStartRegistration = async () => {
    if (!user) {
      // User is not logged in, show alert and redirect to login
      setShowLoginAlert(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return;
    }

    // User is logged in, check wallet requirement
    setWalletLoading(true);
    try {
      const walletResult = await checkUserWallet(user.id);
      
      if (walletResult.hasWallet) {
        // User has wallet, proceed to project submission
        navigate('/submit-project');
      } else {
        // User doesn't have wallet, show alert
        setShowWalletAlert(true);
        setTimeout(() => {
          navigate('/dashboard'); // Redirect to dashboard where they can connect wallet
        }, 3000);
      }
    } catch (error) {
      console.error('Error checking wallet:', error);
      // On error, show wallet alert as precaution
      setShowWalletAlert(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } finally {
      setWalletLoading(false);
    }
  };

  return (
    <Box>
      {/* Hero Section */}
      <Box 
        sx={{ 
          background: 'linear-gradient(135deg, rgba(124, 136, 135, 0.9) 0%, rgba(42, 157, 143, 0.85) 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100vh'
        }}
      >
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            opacity: 0.4,
            backgroundImage: 'url(https://trustedcarbon.org/wp-content/uploads/2025/01/1.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(180deg, rgba(14, 118, 110, 0.7) 0%, rgba(42, 157, 143, 0.5) 100%)',
              zIndex: 1
            }
          }} 
        />
        
        {/* Navbar */}
        <Box sx={{ position: 'relative', zIndex: 2 }}>
          <Navbar />
        </Box>
        
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, pt: 12, pb: 12 }}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', md: '4rem' }, fontWeight: 800, mb: 2 }}>
              New Registry
            </Typography>
            <Typography variant="body1" sx={{ mb: 6, maxWidth: '800px', mx: 'auto' }}>
              Create and register new blue carbon projects on the BlueCarbon platform. 
              Our streamlined process ensures your project meets all verification standards 
              and blockchain requirements for transparent carbon credit generation.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button 
                variant="outlined" 
                size="large"
                endIcon={walletLoading ? null : <ArrowForwardIcon />}
                onClick={handleStartRegistration}
                disabled={walletLoading}
                sx={{ 
                  borderColor: 'white', 
                  color: 'white',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                  '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.5)', color: 'rgba(255,255,255,0.5)' },
                  px: 4,
                  py: 1.5,
                  minWidth: '200px'
                }}
              >
                {walletLoading ? (
                  <>
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box 
                        sx={{ 
                          width: 20, 
                          height: 20, 
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          '@keyframes spin': {
                            '0%': { transform: 'rotate(0deg)' },
                            '100%': { transform: 'rotate(360deg)' }
                          }
                        }} 
                      />
                      Checking...
                    </Box>
                  </>
                ) : (
                  'Start Registration'
                )}
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

     

      {/* Footer */}
      <Footer />
      
      {/* Login Alert Snackbar */}
      <Snackbar
        open={showLoginAlert}
        autoHideDuration={2000}
        onClose={() => setShowLoginAlert(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity="info" 
          onClose={() => setShowLoginAlert(false)}
          sx={{ width: '100%' }}
        >
          Please login to submit a project. Redirecting to login page...
        </Alert>
      </Snackbar>
      
      {/* Wallet Alert Snackbar */}
      <Snackbar
        open={showWalletAlert}
        autoHideDuration={3000}
        onClose={() => setShowWalletAlert(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity="warning" 
          onClose={() => setShowWalletAlert(false)}
          sx={{ width: '100%' }}
        >
          🔒 Wallet connection required to create projects. Redirecting to dashboard to connect your wallet...
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default NewRegistry;
