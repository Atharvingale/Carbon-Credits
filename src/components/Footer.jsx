import React from 'react';
import { Box, Container, Grid, Typography, TextField, Button, Divider, Stack, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TwitterIcon from '@mui/icons-material/Twitter';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const Footer = () => {
  return (
    <Box sx={{ bgcolor: '#0e3538', color: 'white', pt: 6, pb: 4 }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Company Info */}
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box 
                sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 2, 
                  bgcolor: '#0e766e', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  mr: 1
                }}
              >
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#0e766e' }} />
                </Box>
              </Box>
              <Typography variant="h5" component="div" sx={{ fontWeight: 700, color: '#ffffff' }}>
                BlueCarbon
              </Typography>
            </Box>
            
            <Typography variant="body2" sx={{ mb: 3, color: '#e0e0e0' }}>
              Leading the future of blue carbon monitoring and verification.
            </Typography>
            
            <Stack direction="row" spacing={1.5}>
              <SocialIcon icon={<LinkedInIcon />} />
              <SocialIcon icon={<TwitterIcon />} />
              <SocialIcon icon={<FacebookIcon />} />
              <SocialIcon icon={<InstagramIcon />} />
            </Stack>
          </Grid>
          
          {/* Quick Links */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Quick Links
            </Typography>
            <Stack spacing={1}>
              <FooterLink to="/about" text="About Us" />
              <FooterLink to="/projects" text="Our Projects" />
              <FooterLink to="/registry" text="Carbon Registry" />
              <FooterLink to="/blog" text="Blog & News" />
              <FooterLink to="/contact" text="Contact Us" />
            </Stack>
          </Grid>
          
          {/* Resources */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Resources
            </Typography>
            <Stack spacing={1}>
              <FooterLink to="/faq" text="FAQ" />
              <FooterLink to="/documentation" text="Documentation" />
              <FooterLink to="/developers" text="Developers" />
              <FooterLink to="/partners" text="Partners" />
              <FooterLink to="/careers" text="Careers" />
            </Stack>
          </Grid>
          
          {/* Contact */}
          <Grid item xs={12} md={3}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Get in Touch
            </Typography>
            
            <Stack spacing={2} sx={{ mb: 3 }}>
              <ContactItem icon={<EmailIcon />} text="info@bluecarbon.org" />
              <ContactItem icon={<PhoneIcon />} text="+91 98123-45678" />
              <ContactItem icon={<LocationOnIcon />} text="123 Ocean Drive, Blue Bay, CB 90210" />
            </Stack>
            
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Subscribe to our newsletter
            </Typography>
            <Box sx={{ display: 'flex' }}>
              <TextField
                size="small"
                placeholder="Your email"
                variant="outlined"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.05)',
                  borderRadius: 1,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&.Mui-focused fieldset': { borderColor: '#4CAF50' },
                  },
                  '& .MuiInputBase-input': { color: 'white' },
                  flexGrow: 1,
                }}
              />
              <Button 
                variant="contained" 
                sx={{ 
                  ml: 1, 
                  bgcolor: '#4CAF50', 
                  '&:hover': { bgcolor: '#388E3C' } 
                }}
              >
                Subscribe
              </Button>
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.1)' }} />
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'center', sm: 'center' } }}>
          <Typography variant="body2" color="text.secondary" sx={{ color: 'rgba(255,255,255,0.6)', mb: { xs: 2, sm: 0 } }}>
            © {new Date().getFullYear()} BlueCarbon. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={3}>
            <MuiLink component={Link} to="/privacy" color="inherit" underline="hover" sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#4CAF50' } }}>
              Privacy Policy
            </MuiLink>
            <MuiLink component={Link} to="/terms" color="inherit" underline="hover" sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#4CAF50' } }}>
              Terms of Service
            </MuiLink>
            <MuiLink component={Link} to="/cookies" color="inherit" underline="hover" sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#4CAF50' } }}>
              Cookie Policy
            </MuiLink>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

// Helper Components
const SocialIcon = ({ icon }) => (
  <Box
    sx={{
      width: 36,
      height: 36,
      borderRadius: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': {
        bgcolor: '#4CAF50',
        transform: 'translateY(-3px)',
        boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
      }
    }}
  >
    {icon}
  </Box>
);

const FooterLink = ({ to, text }) => (
  <MuiLink
    component={Link}
    to={to}
    underline="none"
    sx={{
      color: '#e0e0e0',
      fontSize: '0.9rem',
      transition: 'all 0.2s',
      '&:hover': {
        color: '#4CAF50',
        pl: 0.5
      }
    }}
  >
    {text}
  </MuiLink>
);

const ContactItem = ({ icon, text }) => (
  <Box sx={{ display: 'flex', alignItems: 'center' }}>
    <Box sx={{ mr: 1.5, color: '#4CAF50' }}>
      {icon}
    </Box>
    <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
      {text}
    </Typography>
  </Box>
);

export default Footer;