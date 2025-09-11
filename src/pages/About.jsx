import React from 'react';
import { 
  Box, Button, Container, Grid, Typography, Stack, Divider 
} from '@mui/material';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const About = () => {
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
            backgroundImage: 'url(https://trustedcarbon.org/wp-content/uploads/2025/01/Untitled-design-41-1.webp)',
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
              About Us
            </Typography>
            <Typography variant="body1" sx={{ mb: 6, maxWidth: '800px', mx: 'auto' }}>
             Trusted Carbon is a nature-based carbon registry that creates, validates, and manages high-quality carbon credits. Using blockchain technology, Trusted Carbon ensures transparency, traceability, and integrity in carbon credit transactions.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button 
                variant="outlined" 
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{ 
                  borderColor: 'white', 
                  color: 'white',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                  px: 4,
                  py: 1.5
                }}
              >
                Explore Registry
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* About Section (text left + image right) */}
      {/* About Section (text left + image right) */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Grid 
          container 
          spacing={6} 
          alignItems="center" 
          justifyContent="space-between"
        >
          {/* Text Left */}
          <Grid item xs={12} md={5}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 3 }}>
              ENSURING TRUSTED TRANSPARENCY
            </Typography>
            <Divider sx={{ width: 80, height: 4, bgcolor: "#4CAF50", mb: 3 }} />
            <Typography variant="body1" sx={{ mb: 3 }}>
              By leveraging blockchain technology, all carbon credit transactions and project
              validations are recorded on a secure, immutable ledger. This ensures stakeholders
              can verify the authenticity and impact of every carbon credit.
            </Typography>
          </Grid>
          
          {/* Image Right */}
          <Grid item xs={12} md={5} sx={{ display: "flex", justifyContent: "center" }}>
            <Box
              component="img"
              src="https://trustedcarbon.org/wp-content/uploads/2025/01/1.webp"
              alt="About Us"
              sx={{
                width: "100%",
                maxWidth: 500,
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              }}
            />
          </Grid>
        </Grid>
      </Container>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default About;