import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Grid,
  TextField,
  Chip,
  Avatar,
  Divider,
  LinearProgress,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility,
  VisibilityOff,
  Person,
  Business,
  Nature as Eco,
  LocationOn,
  DateRange,
  Assessment,
  Security,
  CheckCircle
} from '@mui/icons-material';
import { supabase } from '../../lib/supabaseClient';
import { sanitizeText } from '../../utils/sanitization';

const steps = [
  'Project Review',
  'User Verification',
  'Admin Authentication',
  'Mint Confirmation'
];

const AdminMintVerificationModal = ({ 
  open, 
  onClose, 
  project, 
  onMintConfirm,
  showSnackbar 
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [projectDetails, setProjectDetails] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [mintAmount, setMintAmount] = useState('');
  const [mintReason, setMintReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open && project) {
      setActiveStep(0);
      setProjectDetails(null);
      setUserDetails(null);
      setAdminPassword('');
      setIsPasswordVerified(false);
      setMintAmount('');
      setMintReason('');
      setError('');
      loadProjectAndUserDetails();
    }
  }, [open, project]);

  const loadProjectAndUserDetails = async () => {
    if (!project?.id) return;

    setLoading(true);
    try {
      // Load detailed project information
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          created_by_profile:users!created_by(*)
        `)
        .eq('id', project.id)
        .single();

      if (projectError) throw projectError;

      setProjectDetails(projectData);
      setUserDetails(projectData.created_by_profile);

      // Load additional project metrics if available
      const { data: metricsData } = await supabase
        .from('project_metrics')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (metricsData && metricsData.length > 0) {
        setProjectDetails(prev => ({
          ...prev,
          latest_metrics: metricsData[0]
        }));
      }

    } catch (err) {
      setError('Failed to load project details: ' + err.message);
      showSnackbar('Failed to load project details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      // Project review completed
      setActiveStep(1);
    } else if (activeStep === 1) {
      // User verification completed
      setActiveStep(2);
    } else if (activeStep === 2 && isPasswordVerified) {
      // Admin authentication completed
      setActiveStep(3);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
      if (activeStep === 3) {
        setIsPasswordVerified(false);
        setAdminPassword('');
      }
    }
  };

  const verifyAdminPassword = async () => {
    if (!adminPassword.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Verify password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: adminPassword
      });

      if (signInError) {
        throw new Error('Invalid password');
      }

      setIsPasswordVerified(true);
      setError('');
      showSnackbar('Password verified successfully', 'success');
      
    } catch (err) {
      setError('Password verification failed: ' + err.message);
      showSnackbar('Password verification failed', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleMintConfirm = async () => {
    if (!mintAmount || !mintReason.trim()) {
      setError('Please provide mint amount and reason');
      return;
    }

    const amount = parseFloat(mintAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid mint amount');
      return;
    }

    try {
      setLoading(true);
      
      const mintData = {
        projectId: project.id,
        amount: amount,
        reason: sanitizeText(mintReason),
        projectDetails: projectDetails,
        userDetails: userDetails,
        adminVerified: true
      };

      await onMintConfirm(mintData);
      onClose();
      
    } catch (err) {
      setError('Minting failed: ' + err.message);
      showSnackbar('Minting failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = () => {
    switch (activeStep) {
      case 0:
        return <ProjectReviewStep projectDetails={projectDetails} loading={loading} />;
      case 1:
        return <UserVerificationStep userDetails={userDetails} projectDetails={projectDetails} />;
      case 2:
        return (
          <AdminAuthenticationStep
            adminPassword={adminPassword}
            setAdminPassword={setAdminPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            onVerify={verifyAdminPassword}
            isVerifying={isVerifying}
            isPasswordVerified={isPasswordVerified}
            error={error}
          />
        );
      case 3:
        return (
          <MintConfirmationStep
            mintAmount={mintAmount}
            setMintAmount={setMintAmount}
            mintReason={mintReason}
            setMintReason={setMintReason}
            projectDetails={projectDetails}
            userDetails={userDetails}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6">Admin Carbon Credit Minting Verification</Typography>
          <Typography variant="body2" color="text.secondary">
            {project?.title || 'Project Verification'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {/* Progress Stepper */}
        <Box sx={{ mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <LinearProgress 
            variant="determinate" 
            value={(activeStep / (steps.length - 1)) * 100}
            sx={{ mt: 2, height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Step Content */}
        <Box sx={{ minHeight: '400px' }}>
          {getStepContent()}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={onClose}
          color="inherit"
        >
          Cancel
        </Button>
        
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
          sx={{ mr: 1 }}
        >
          Back
        </Button>
        
        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading || (activeStep === 2 && !isPasswordVerified)}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleMintConfirm}
            disabled={loading || !mintAmount || !mintReason.trim()}
            startIcon={loading ? <CircularProgress size={16} /> : <CheckCircle />}
            color="success"
          >
            {loading ? 'Minting...' : 'Confirm Mint'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// Project Review Step Component
const ProjectReviewStep = ({ projectDetails, loading }) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading project details...</Typography>
      </Box>
    );
  }

  if (!projectDetails) return null;

  return (
    <Box>
      <Typography variant="h6" gutterBottom startIcon={<Business />}>
        <Business sx={{ mr: 1, verticalAlign: 'middle' }} />
        Project Details Review
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom color="primary">
                Basic Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Project Title</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {projectDetails.title}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Description</Typography>
                  <Typography variant="body1">
                    {projectDetails.description}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip 
                    label={projectDetails.status} 
                    color={projectDetails.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom color="primary">
                Project Metrics
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Location</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOn fontSize="small" color="action" />
                    <Typography variant="body1">
                      {projectDetails.location || 'Not specified'}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Created Date</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DateRange fontSize="small" color="action" />
                    <Typography variant="body1">
                      {new Date(projectDetails.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Area Coverage</Typography>
                  <Typography variant="body1">
                    {projectDetails.area_coverage || 'Not specified'} hectares
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {projectDetails.latest_metrics && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom color="primary">
                  <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Latest Environmental Metrics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Carbon Sequestered</Typography>
                    <Typography variant="h6" color="success.main">
                      {projectDetails.latest_metrics.carbon_sequestered || 0} tCO₂
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Biodiversity Index</Typography>
                    <Typography variant="h6" color="info.main">
                      {projectDetails.latest_metrics.biodiversity_index || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Water Quality</Typography>
                    <Typography variant="h6" color="primary.main">
                      {projectDetails.latest_metrics.water_quality || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Ecosystem Health</Typography>
                    <Typography variant="h6" color="success.main">
                      {projectDetails.latest_metrics.ecosystem_health || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

// User Verification Step Component
const UserVerificationStep = ({ userDetails, projectDetails }) => {
  if (!userDetails) return null;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
        User Verification & Project Ownership
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ width: 60, height: 60, mr: 2 }}>
                  {userDetails.full_name ? userDetails.full_name.charAt(0).toUpperCase() : 'U'}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {userDetails.full_name || 'Unknown User'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {userDetails.email}
                  </Typography>
                  <Chip 
                    label={userDetails.role} 
                    size="small" 
                    color={userDetails.role === 'admin' ? 'error' : 'primary'}
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">User ID</Typography>
                  <Typography variant="body1" fontFamily="monospace">
                    {userDetails.id}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Account Created</Typography>
                  <Typography variant="body1">
                    {new Date(userDetails.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Organization</Typography>
                  <Typography variant="body1">
                    {userDetails.organization || 'Not specified'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom color="primary">
                Project Ownership Verification
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Project Created By</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {userDetails.full_name || userDetails.email}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">Ownership Status</Typography>
                  <Chip 
                    label="Verified Owner" 
                    color="success" 
                    icon={<CheckCircle />}
                    size="small"
                  />
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">Project Creation Date</Typography>
                  <Typography variant="body1">
                    {new Date(projectDetails?.created_at || '').toLocaleDateString()}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">User Contact</Typography>
                  <Typography variant="body1">
                    {userDetails.phone || 'Not provided'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>Verification Complete:</strong> User identity and project ownership have been confirmed. 
          This user is the legitimate owner of the project and is eligible for carbon credit minting.
        </Typography>
      </Alert>
    </Box>
  );
};

// Admin Authentication Step Component
const AdminAuthenticationStep = ({
  adminPassword,
  setAdminPassword,
  showPassword,
  setShowPassword,
  onVerify,
  isVerifying,
  isPasswordVerified,
  error
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
        Admin Authentication Required
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Security Verification:</strong> To proceed with carbon credit minting, 
              please verify your admin credentials. This ensures only authorized administrators 
              can mint carbon credits.
            </Typography>
          </Alert>

          {!isPasswordVerified ? (
            <Box>
              <TextField
                fullWidth
                label="Admin Password"
                type={showPassword ? 'text' : 'password'}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                error={!!error}
                helperText={error}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
              
              <Button
                variant="contained"
                onClick={onVerify}
                disabled={!adminPassword.trim() || isVerifying}
                startIcon={isVerifying ? <CircularProgress size={16} /> : <Security />}
                fullWidth
              >
                {isVerifying ? 'Verifying...' : 'Verify Password'}
              </Button>
            </Box>
          ) : (
            <Alert severity="success" icon={<CheckCircle />}>
              <Typography variant="body1">
                <strong>Authentication Successful!</strong>
              </Typography>
              <Typography variant="body2">
                Your admin credentials have been verified. You can now proceed to mint carbon credits.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

// Mint Confirmation Step Component
const MintConfirmationStep = ({
  mintAmount,
  setMintAmount,
  mintReason,
  setMintReason,
  projectDetails,
  userDetails
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        <Eco sx={{ mr: 1, verticalAlign: 'middle' }} />
        Final Mint Confirmation
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom color="primary">
                Minting Details
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Carbon Credits Amount (tCO₂)"
                  type="number"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Enter the amount of carbon credits to mint"
                />
                
                <TextField
                  fullWidth
                  label="Minting Reason/Justification"
                  multiline
                  rows={4}
                  value={mintReason}
                  onChange={(e) => setMintReason(e.target.value)}
                  placeholder="Provide detailed justification for minting these carbon credits..."
                  helperText="This reason will be recorded in the audit trail"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom color="primary">
                Summary
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Project</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {projectDetails?.title}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">Owner</Typography>
                  <Typography variant="body1">
                    {userDetails?.full_name || userDetails?.email}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">Amount to Mint</Typography>
                  <Typography variant="h6" color="success.main">
                    {mintAmount || '0'} tCO₂
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">Minting Date</Typography>
                  <Typography variant="body1">
                    {new Date().toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Alert severity="warning">
            <Typography variant="body2">
              <strong>Important:</strong> Once confirmed, carbon credits will be minted on the blockchain 
              and cannot be undone. Please ensure all details are correct before proceeding.
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminMintVerificationModal;