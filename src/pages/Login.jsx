import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
  Tabs,
  Tab,
  Divider,
  InputAdornment,
  IconButton,
  Checkbox,
  FormControlLabel,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';

const Login = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginType, setLoginType] = useState('user'); // 'user' or 'admin'
  const navigate = useNavigate();
  const location = useLocation();

  // Check for message from signup page
  const message = location.state?.message;

  const handleLoginTypeChange = (event, newValue) => {
    setLoginType(newValue);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      
      // Check user role to redirect to appropriate dashboard
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
      
      // For admin login, verify the user has admin role
      if (loginType === 'admin' && profileData?.role !== 'admin') {
        throw new Error('You do not have admin privileges');
      }
      
      if (profileData?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(14, 118, 110, 0.9) 0%, rgba(42, 157, 143, 0.8) 100%)',
        py: 4
      }}
    >
      <Container maxWidth="sm">
        <Paper 
          elevation={6} 
          sx={{ 
            p: { xs: 3, md: 5 },
            borderRadius: 3,
            boxShadow: '0 8px 40px rgba(0,0,0,0.12)'
          }}
        >
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography 
              variant="h4" 
              component="h1" 
              gutterBottom 
              sx={{ 
                fontWeight: 700,
                color: '#264653'
              }}
            >
              {loginType === 'admin' ? (
                <>
                  <AdminIcon sx={{ fontSize: 36, mr: 1, verticalAlign: 'middle', color: '#2a9d8f' }} />
                  Admin Login
                </>
              ) : 'Welcome Back'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {loginType === 'admin' 
                ? 'Access the admin dashboard to manage carbon credits' 
                : 'Log in to access your carbon credit dashboard'}
            </Typography>
          </Box>

          {message && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {message}
            </Alert>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Tabs 
            value={loginType} 
            onChange={handleLoginTypeChange} 
            variant="fullWidth"
            sx={{ 
              mb: 4,
              '& .MuiTab-root': {
                fontWeight: 600,
                fontSize: '1rem',
              },
              '& .Mui-selected': {
                color: '#2a9d8f',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#2a9d8f',
              }
            }}
          >
            <Tab label="User Login" value="user" />
            <Tab label="Admin Login" value="admin" />
          </Tabs>
          
          <Box component="form" onSubmit={handleLogin}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: '#6c757d' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: '#2a9d8f',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#2a9d8f',
                },
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: '#6c757d' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: '#2a9d8f',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#2a9d8f',
                },
              }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={rememberMe} 
                    onChange={(e) => setRememberMe(e.target.checked)} 
                    sx={{
                      color: '#2a9d8f',
                      '&.Mui-checked': {
                        color: '#2a9d8f',
                      },
                    }}
                  />
                }
                label="Remember me"
              />
              <Typography variant="body2" color="primary" sx={{ cursor: 'pointer', color: '#2a9d8f' }}>
                Forgot password?
              </Typography>
            </Box>
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                backgroundColor: '#2a9d8f',
                '&:hover': {
                  backgroundColor: '#238276',
                },
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(42, 157, 143, 0.4)',
              }}
              disabled={loading}
            >
              {loading ? 'Logging in...' : loginType === 'admin' ? 'Login as Admin' : 'Login'}
            </Button>
            
            {loginType === 'user' && (
              <>
                <Divider sx={{ my: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    OR
                  </Typography>
                </Divider>
                
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="body2">
                    Don't have an account?{' '}
                    <Link to="/signup" style={{ textDecoration: 'none', color: '#2a9d8f', fontWeight: 600 }}>
                      Sign Up
                    </Link>
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;