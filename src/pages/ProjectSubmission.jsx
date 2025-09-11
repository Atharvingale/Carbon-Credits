import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../lib/supabaseClient';
import ConnectWallet from '../components/ConnectWallet';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Chip
} from '@mui/material';
import {
  Nature as NatureIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  AccountBalanceWallet as WalletIcon,
  Send as SendIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

const ProjectSubmission = () => {
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    projectType: '',
    area: '',
    estimatedCredits: '',
    submittedBy: '',
    organizationName: '',
    contactEmail: '',
    contactPhone: '',
    walletAddress: ''
  });

  const steps = ['Project Details', 'Organization Info', 'Wallet & Submit'];
  
  const projectTypes = [
    'Mangrove Restoration',
    'Seagrass Conservation',
    'Salt Marsh Restoration',
    'Coastal Wetland Protection',
    'Marine Protected Areas',
    'Other Blue Carbon Project'
  ];

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      setUser(session.user);
    };
    checkAuth();
  }, [navigate]);

  // Auto-fill wallet address when connected
  useEffect(() => {
    if (connected && publicKey) {
      setFormData(prev => ({
        ...prev,
        walletAddress: publicKey.toString()
      }));
    }
  }, [connected, publicKey]);

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 0:
        return formData.name && formData.description && formData.location && formData.projectType;
      case 1:
        return formData.submittedBy && formData.organizationName && formData.contactEmail;
      case 2:
        return formData.walletAddress && connected;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setError(null);
      setActiveStep(prev => prev + 1);
    } else {
      setError('Please fill in all required fields for this step.');
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) {
      setError('Please complete all required fields and connect your wallet.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: submitError } = await supabase
        .from('projects')
        .insert([{
          name: formData.name,
          description: formData.description,
          location: formData.location,
          project_type: formData.projectType,
          area: formData.area || null,
          estimated_credits: formData.estimatedCredits ? parseInt(formData.estimatedCredits) : null,
          submitted_by: formData.submittedBy,
          organization_name: formData.organizationName,
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone || null,
          wallet_address: formData.walletAddress,
          status: 'pending',
          submitted_by_user: user.id
        }]);

      if (submitError) throw submitError;

      setSuccess(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);

    } catch (err) {
      console.error('Error submitting project:', err);
      setError('Failed to submit project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 6, textAlign: 'center' }}>
          <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom color="success.main">
            Project Submitted Successfully!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Your blue carbon project has been submitted for review. 
            An admin will review your submission and notify you once it's approved.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Redirecting to dashboard...
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Submit Blue Carbon Project
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Submit your blue carbon project for verification and carbon credit minting
        </Typography>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={2} sx={{ p: 4 }}>
        {/* Step 1: Project Details */}
        {activeStep === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NatureIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Project Details</Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Project Name"
                value={formData.name}
                onChange={handleInputChange('name')}
                placeholder="e.g., Sundarbans Mangrove Restoration"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Project Type</InputLabel>
                <Select
                  value={formData.projectType}
                  onChange={handleInputChange('projectType')}
                  label="Project Type"
                >
                  {projectTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Location"
                value={formData.location}
                onChange={handleInputChange('location')}
                placeholder="e.g., Sundarbans, Bangladesh"
                InputProps={{
                  startAdornment: <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Project Area (hectares)"
                type="number"
                value={formData.area}
                onChange={handleInputChange('area')}
                placeholder="e.g., 500"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Estimated Carbon Credits"
                type="number"
                value={formData.estimatedCredits}
                onChange={handleInputChange('estimatedCredits')}
                placeholder="e.g., 10000"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                multiline
                rows={4}
                label="Project Description"
                value={formData.description}
                onChange={handleInputChange('description')}
                placeholder="Describe your blue carbon project, its environmental impact, methodology, and expected outcomes..."
              />
            </Grid>
          </Grid>
        )}

        {/* Step 2: Organization Info */}
        {activeStep === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Organization Information</Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Organization Name"
                value={formData.organizationName}
                onChange={handleInputChange('organizationName')}
                placeholder="e.g., Green Ocean Foundation"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Primary Contact Name"
                value={formData.submittedBy}
                onChange={handleInputChange('submittedBy')}
                placeholder="e.g., Dr. Jane Smith"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="email"
                label="Contact Email"
                value={formData.contactEmail}
                onChange={handleInputChange('contactEmail')}
                placeholder="contact@organization.org"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Phone"
                value={formData.contactPhone}
                onChange={handleInputChange('contactPhone')}
                placeholder="+1-234-567-8900"
              />
            </Grid>
          </Grid>
        )}

        {/* Step 3: Wallet & Submit */}
        {activeStep === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WalletIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Wallet Connection & Submission</Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Connect Your Solana Wallet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Connect your Solana wallet to receive carbon credits once your project is approved.
                  </Typography>
                  <ConnectWallet />
                </CardContent>
              </Card>
            </Grid>
            
            {connected && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Wallet Address"
                  value={formData.walletAddress}
                  onChange={handleInputChange('walletAddress')}
                  InputProps={{
                    readOnly: true,
                    style: { fontFamily: 'monospace', fontSize: '0.9rem' }
                  }}
                  helperText="This wallet address will receive the carbon credit tokens once approved"
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Submission Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Project:</Typography>
                  <Typography variant="body1">{formData.name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Organization:</Typography>
                  <Typography variant="body1">{formData.organizationName}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Type:</Typography>
                  <Chip label={formData.projectType} size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Location:</Typography>
                  <Typography variant="body1">{formData.location}</Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        )}

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
            sx={{ visibility: activeStep === 0 ? 'hidden' : 'visible' }}
          >
            Back
          </Button>
          
          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              sx={{ ml: 'auto' }}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || !connected}
              endIcon={<SendIcon />}
              sx={{ ml: 'auto' }}
            >
              {loading ? 'Submitting...' : 'Submit Project'}
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default ProjectSubmission;
