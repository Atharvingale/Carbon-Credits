import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Box, Button, Container, Grid, Typography, Paper, Card, CardContent,
  CardMedia, Stack, Divider
} from '@mui/material';
import Navbar from '../components/Navbar';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const Landing = () => {
  return (
    <Box>
      <Navbar />
      
      {/* Hero Section */}
      <Box 
        sx={{ 
          background: 'linear-gradient(135deg, #0e766e 0%, #2a9d8f 100%)',
          color: 'white',
          py: 12,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            opacity: 0.2,
            backgroundImage: 'url(https://source.unsplash.com/random/1600x900/?mangrove,ocean)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0
          }} 
        />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h1" component="h1" sx={{ fontSize: { xs: '2.5rem', md: '4rem' }, fontWeight: 700, mb: 2 }}>
              BlueCarbon
            </Typography>
            <Typography variant="h5" sx={{ mb: 4, maxWidth: '800px', mx: 'auto' }}>
              Where Oceans Become the New Currency of Climate Action.
            </Typography>
            <Typography variant="body1" sx={{ mb: 6, maxWidth: '800px', mx: 'auto' }}>
              Monitor, report, and verify blue carbon projects with blockchain
              transparency. Join the revolution in ocean and climate restoration for a
              sustainable future.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button 
                variant="contained" 
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{ 
                  bgcolor: '#4CAF50', 
                  '&:hover': { bgcolor: '#388E3C' },
                  px: 4,
                  py: 1.5
                }}
              >
                Explore Projects
              </Button>
              <Button 
                variant="outlined" 
                size="large"
                sx={{ 
                  borderColor: 'white', 
                  color: 'white',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                  px: 4,
                  py: 1.5
                }}
              >
                Buy Credits
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>
      
      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" align="center" sx={{ mb: 6 }}>
          Buy with Trusted Confidence
        </Typography>
        <Typography variant="body1" align="center" sx={{ mb: 8, maxWidth: '800px', mx: 'auto' }}>
          Our blue carbon credits are backed by rigorous verification, transparent monitoring,
          and measurable impact on ocean restoration
        </Typography>
        
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
              <Box sx={{ 
                width: 80, 
                height: 80, 
                borderRadius: '50%', 
                bgcolor: '#e8f5f3', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mb: 2
              }}>
                <Box sx={{ color: '#0e766e', fontSize: '2rem' }}>🛡️</Box>
              </Box>
              <Typography variant="h6" align="center" gutterBottom>
                Verified Projects
              </Typography>
              <Typography variant="body2" align="center" color="text.secondary">
                All projects undergo rigorous third-party verification and monitoring
              </Typography>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
              <Box sx={{ 
                width: 80, 
                height: 80, 
                borderRadius: '50%', 
                bgcolor: '#e8f5f3', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mb: 2
              }}>
                <Box sx={{ color: '#0e766e', fontSize: '2rem' }}>📜</Box>
              </Box>
              <Typography variant="h6" align="center" gutterBottom>
                Certified Standards
              </Typography>
              <Typography variant="body2" align="center" color="text.secondary">
                Compliant with international carbon credit standards and protocols
              </Typography>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
              <Box sx={{ 
                width: 80, 
                height: 80, 
                borderRadius: '50%', 
                bgcolor: '#e8f5f3', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mb: 2
              }}>
                <Box sx={{ color: '#0e766e', fontSize: '2rem' }}>👥</Box>
              </Box>
              <Typography variant="h6" align="center" gutterBottom>
                Transparent Tracking
              </Typography>
              <Typography variant="body2" align="center" color="text.secondary">
                Blockchain-based registry ensures full transparency and traceability
              </Typography>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
              <Box sx={{ 
                width: 80, 
                height: 80, 
                borderRadius: '50%', 
                bgcolor: '#e8f5f3', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mb: 2
              }}>
                <Box sx={{ color: '#0e766e', fontSize: '2rem' }}>✅</Box>
              </Box>
              <Typography variant="h6" align="center" gutterBottom>
                Impact Guarantee
              </Typography>
              <Typography variant="body2" align="center" color="text.secondary">
                Guaranteed measurable environmental and social impact outcomes
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Container>
      
      {/* Call to Action */}
      <Box sx={{ bgcolor: '#e8f5f3', py: 8 }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" component="h2" gutterBottom>
              Ready to Make an Impact?
            </Typography>
            <Typography variant="body1" sx={{ mb: 4 }}>
              Join thousands of organizations investing in verified blue carbon projects
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              sx={{ 
                bgcolor: '#0e766e', 
                '&:hover': { bgcolor: '#0a5c55' },
                px: 4,
                py: 1.5
              }}
            >
              Browse Carbon Credits
            </Button>
          </Box>
        </Container>
      </Box>
      
      {/* Footer */}
      <Box sx={{ bgcolor: '#0a2f2a', color: 'white', py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                  <circle cx="12" cy="12" r="10" fill="#ffffff" />
                </svg>
                BlueCarbon
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Leading the future of blue carbon monitoring and verification through blockchain
                technology and community engagement.
              </Typography>
              <Stack direction="row" spacing={1}>
                <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}>🌐</Box>
                <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}>📱</Box>
                <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}>📧</Box>
                <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}>🔗</Box>
              </Stack>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Typography variant="h6" sx={{ mb: 2 }}>Quick Links</Typography>
              <Stack spacing={1}>
                <Link to="/about" style={{ color: 'white', textDecoration: 'none' }}>About Us</Link>
                <Link to="/projects" style={{ color: 'white', textDecoration: 'none' }}>Projects</Link>
                <Link to="/registry" style={{ color: 'white', textDecoration: 'none' }}>Registry</Link>
                <Link to="/blog" style={{ color: 'white', textDecoration: 'none' }}>Blog</Link>
                <Link to="/contact" style={{ color: 'white', textDecoration: 'none' }}>Contact</Link>
              </Stack>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Typography variant="h6" sx={{ mb: 2 }}>Contact Info</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>📧 info@bluecarbon.org</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>📞 +91 98123-4567</Typography>
              <Typography variant="body2">
                🏢 123 Ocean Drive<br />
                Blue Bay, CB 90210
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Typography variant="h6" sx={{ mb: 2 }}>Get In Touch</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Whether you're interested in purchasing carbon credits, partnering with us, or learning more about
                our verification process, our team is here to help.
              </Typography>
              <Button 
                variant="outlined" 
                fullWidth
                sx={{ 
                  borderColor: 'white', 
                  color: 'white',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                Send Message
              </Button>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default Landing;