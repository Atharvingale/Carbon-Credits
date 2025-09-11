import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Box, Button, Container, Grid, Typography, Paper, Card, CardContent,
  CardMedia, Stack, Divider
} from '@mui/material';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const Landing = () => {
  return (
    <Box>
      {/* Hero Section with Navbar integrated */}
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
            backgroundImage: 'url(https://trustedcarbon.org/wp-content/uploads/2024/12/AdobeStock_604377529-scaled.webp)',
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
        
        {/* Navbar with transparent background */}
        <Box sx={{ position: 'relative', zIndex: 2 }}>
          <Navbar />
        </Box>
        
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, pt: 12, pb: 12 }}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h1" component="h1" sx={{ fontSize: { xs: '2.5rem', md: '4rem' }, fontWeight: 800, mb: 2 }}>
              BlueCarbon
            </Typography>
            <Typography variant="h4" sx={{ mb: 4, maxWidth: '800px', mx: 'auto' }}>
              Where Oceans Become the New Currency of Climate Action
            </Typography>
            <Typography variant="body1" sx={{ mb: 6, maxWidth: '800px', mx: 'auto' }}>
              Monitor, report, and verify blue carbon projects with blockchain
              transparency. Join the revolution in ocean and climate restoration for a
              sustainable future
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button 
                component={Link}
                to="/signup"
                variant="contained" 
                size="large"
                sx={{ 
                  bgcolor: '#4CAF50', 
                  color: 'white',
                  '&:hover': { bgcolor: '#388E3C' },
                  px: 4,
                  py: 1.5,
                  fontWeight: 600
                }}
              >
                Sign Up
              </Button>
              <Button 
                component={Link}
                to="/login"
                variant="outlined" 
                size="large"
                sx={{ 
                  borderColor: 'white', 
                  color: 'white',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                  px: 4,
                  py: 1.5,
                  fontWeight: 600
                }}
              >
                Log In
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Footer />
      
    </Box>
  );
};

export default Landing;