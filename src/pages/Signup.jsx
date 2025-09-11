import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Grid,
  InputAdornment,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

const Signup = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeStep, setActiveStep] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const steps = ['Personal Information', 'Account Details'];

  const handleNext = () => {
    if (activeStep === 0) {
      if (!firstName || !lastName) {
        setError('Please fill in all required fields');
        return;
      }
      setError(null);
      setActiveStep(1);
    } else {
      handleSignup();
    }
  };

  const handleBack = () => {
    setActiveStep(0);
    setError(null);
  };

  const handleSignup = async () => {
    // Validate form
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    // Validate password strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    
    setError(null);
    setLoading(true);
    
    try {
      // Sign up with metadata that will be used by the trigger
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'user'
          }
        }
      });
      
      if (error) {
        // Provide more detailed error messages
        let errorMessage = error.message;
        if (error.message.includes('Database error')) {
          errorMessage = 'There was an issue creating your account. Please try again or contact support if the problem persists.';
        } else if (error.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please try logging in instead.';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        }
        throw new Error(errorMessage);
      }
      
      // Check if user was created successfully
      if (!data.user) {
        throw new Error('Account creation failed. Please try again.');
      }
      
      // Profile is now created automatically by the database trigger
      // No need to manually insert into profiles table
      
      // Redirect to login with success message
      const successMessage = data.user.email_confirmed_at 
        ? 'Registration successful! You can now log in.' 
        : 'Registration successful! Please check your email for confirmation before logging in.';
        
      navigate('/login', { 
        state: { message: successMessage } 
      });
    } catch (error) {
      console.error('Signup error:', error);
      setError(error.message || 'An unexpected error occurred. Please try again.');
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
              Create Your Account
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Join the carbon credit marketplace and start making a difference
            </Typography>
          </Box>
          
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{!isMobile && label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form">
            {activeStep === 0 ? (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="firstName"
                    label="First Name"
                    name="firstName"
                    autoFocus
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon sx={{ color: '#6c757d' }} />
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
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="lastName"
                    label="Last Name"
                    name="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon sx={{ color: '#6c757d' }} />
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
                </Grid>
              </Grid>
            ) : (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
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
                  autoComplete="new-password"
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
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
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
              </>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              {activeStep > 0 && (
                <Button
                  onClick={handleBack}
                  startIcon={<ArrowBackIcon />}
                  sx={{
                    color: '#2a9d8f',
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Back
                </Button>
              )}
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={activeStep === steps.length - 1 ? null : <ArrowForwardIcon />}
                sx={{
                  ml: activeStep === 0 ? 'auto' : 0,
                  backgroundColor: '#2a9d8f',
                  '&:hover': {
                    backgroundColor: '#238276',
                  },
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  px: 3,
                  py: 1.5,
                  boxShadow: '0 4px 12px rgba(42, 157, 143, 0.4)',
                }}
                disabled={loading}
              >
                {activeStep === steps.length - 1 ? (loading ? 'Signing up...' : 'Sign Up') : 'Next'}
              </Button>
            </Box>
            
            {activeStep === steps.length - 1 && (
              <>
                <Divider sx={{ my: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    OR
                  </Typography>
                </Divider>
                
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="body2">
                    Already have an account?{' '}
                    <Link to="/login" style={{ textDecoration: 'none', color: '#2a9d8f', fontWeight: 600 }}>
                      Log In
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

export default Signup;