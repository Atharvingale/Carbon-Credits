import React from 'react';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';

const Navbar = () => {
  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ bgcolor: 'white' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Typography
              variant="h6"
              component={Link}
              to="/"
              sx={{
                mr: 2,
                fontWeight: 700,
                color: '#0e766e',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                <circle cx="12" cy="12" r="10" fill="#0e766e" />
              </svg>
              BlueCarbon
            </Typography>
            
            <Box sx={{ display: { xs: 'none', md: 'flex' }, ml: 4 }}>
              <Button component={Link} to="/" color="inherit" sx={{ mx: 1 }}>
                Home
              </Button>
              <Button component={Link} to="/about" color="inherit" sx={{ mx: 1 }}>
                About Us
              </Button>
              <Button component={Link} to="/registry" color="inherit" sx={{ mx: 1 }}>
                Registry
              </Button>
              <Button component={Link} to="/new-registry" color="inherit" sx={{ mx: 1 }}>
                New Registry
              </Button>
              <Button component={Link} to="/blog" color="inherit" sx={{ mx: 1 }}>
                Blog & Newsletter
              </Button>
            </Box>
          </Box>
          
          <Box>
            <Button component={Link} to="/login" color="inherit" sx={{ mx: 1 }}>
              Login
            </Button>
            <Button 
              component={Link} 
              to="/signup" 
              variant="contained" 
              sx={{ 
                mx: 1, 
                bgcolor: '#0e766e', 
                '&:hover': { bgcolor: '#0a5c55' } 
              }}
            >
              Sign Up
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;