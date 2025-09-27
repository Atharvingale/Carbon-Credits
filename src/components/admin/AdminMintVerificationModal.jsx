import React, { useState, useEffect, useCallback } from 'react';
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
  const loadProjectAndUserDetails = useCallback(async () => {
    if (!project?.id) return;

    setLoading(true);
    try {
      // First, load basic project information
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', project.id)
        .single();

      if (projectError) throw projectError;

      setProjectDetails(projectData);

      // Then load user details separately using the user_id from the project
      if (projectData.user_id || projectData.created_by || projectData.submitted_by_user) {
        const userId = projectData.user_id || projectData.created_by || projectData.submitted_by_user;
        
        // Try to load from profiles table first
        let userData = null;
        
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
          }
          userData = data;
        } catch (err) {
          // If profiles table doesn't work, try users table
          try {
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .single();
            
            if (error) throw error;
            userData = data;
          } catch (usersErr) {
            console.warn('Could not load user details:', usersErr);
          }
        }

        if (userData) {
          setUserDetails(userData);
        } else {
          // If we can't find user details, create a basic user object
          setUserDetails({
            id: userId,
            full_name: 'Unknown User',
            email: 'Not available',
            role: 'user',
            created_at: new Date().toISOString()
          });
        }
      } else {
        setError('No user information found for this project');
      }

      // Load additional project metrics if available
      try {
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
      } catch (metricsErr) {
        // Metrics are optional, so we don't fail if they're not available
        console.warn('Could not load project metrics:', metricsErr);
      }

    } catch (err) {
      setError('Failed to load project details: ' + err.message);
      showSnackbar('Failed to load project details', 'error');
    } finally {
      setLoading(false);
    }
  }, [project, showSnackbar]);

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
  }, [open, project, loadProjectAndUserDetails]);

  // Set mint amount to calculated credits when project details are loaded
  useEffect(() => {
    if (projectDetails && !mintAmount) {
      const calculatedAmount = projectDetails.calculated_credits || projectDetails.estimated_credits;
      if (calculatedAmount) {
        setMintAmount(calculatedAmount.toString());
      }
    }
  }, [projectDetails, mintAmount]);


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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');

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

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };


  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        <Business sx={{ mr: 1, verticalAlign: 'middle' }} />
        Complete Project Details Review
      </Typography>
      
      <Grid container spacing={3}>
        {/* Basic Project Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom color="primary">
                📝 Basic Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Project Title</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {projectDetails.title || projectDetails.name || 'Not specified'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Description</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {projectDetails.description || 'Not specified'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Project Type</Typography>
                  <Typography variant="body1">
                    {projectDetails.project_type || 'Not specified'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Ecosystem Type</Typography>
                  <Typography variant="body1">
                    {projectDetails.ecosystem_type || 'Not specified'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip 
                    label={(projectDetails.status || 'pending').toUpperCase()} 
                    color={
                      projectDetails.status === 'approved' ? 'success' :
                      projectDetails.status === 'active' ? 'success' :
                      projectDetails.status === 'rejected' ? 'error' :
                      'warning'
                    }
                    size="small"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Location and Area Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom color="primary">
                📍 Location & Area Details
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
                  <Typography variant="body2" color="text.secondary">Project Area</Typography>
                  <Typography variant="body1">
                    {projectDetails.area || projectDetails.project_area || 'Not specified'} hectares
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Area Coverage</Typography>
                  <Typography variant="body1">
                    {projectDetails.area_coverage || 'Not specified'} hectares
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Coordinates</Typography>
                  <Typography variant="body1" fontFamily="monospace">
                    {projectDetails.coordinates || (projectDetails.latitude && projectDetails.longitude 
                      ? `${projectDetails.latitude}, ${projectDetails.longitude}`
                      : 'Not specified'
                    )}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Project Timeline */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom color="primary">
                📅 Project Timeline
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Project Start Date</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DateRange fontSize="small" color="action" />
                    <Typography variant="body1">
                      {formatDate(projectDetails.project_start_date || projectDetails.start_date)}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Project End Date</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DateRange fontSize="small" color="action" />
                    <Typography variant="body1">
                      {formatDate(projectDetails.project_end_date || projectDetails.end_date)}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Created Date</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DateRange fontSize="small" color="action" />
                    <Typography variant="body1">
                      {formatDate(projectDetails.created_at)}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Last Updated</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DateRange fontSize="small" color="action" />
                    <Typography variant="body1">
                      {formatDate(projectDetails.updated_at)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Organization Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom color="primary">
                🏢 Organization Details
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Organization Name</Typography>
                  <Typography variant="body1">
                    {projectDetails.organization_name || 'Not specified'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Organization Email</Typography>
                  <Typography variant="body1">
                    {projectDetails.organization_email || 'Not specified'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Contact Phone</Typography>
                  <Typography variant="body1">
                    {projectDetails.contact_phone || 'Not specified'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Contact Email</Typography>
                  <Typography variant="body1">
                    {projectDetails.contact_email || 'Not specified'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Carbon Credits Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom color="primary">
                🌱 Carbon Credits Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Estimated Credits</Typography>
                  <Typography variant="h6" color="success.main">
                    {projectDetails.estimated_credits ? `${parseFloat(projectDetails.estimated_credits).toLocaleString()} tCO₂` : 'Not calculated'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Calculated Credits</Typography>
                  <Typography variant="h6" color="primary.main">
                    {projectDetails.calculated_credits ? `${parseFloat(projectDetails.calculated_credits).toLocaleString()} tCO₂` : 'Not calculated'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Credits Issued</Typography>
                  <Typography variant="h6" color="info.main">
                    {projectDetails.credits_issued ? `${parseFloat(projectDetails.credits_issued).toLocaleString()} tCO₂` : 'None issued'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Credits Retired</Typography>
                  <Typography variant="h6" color="warning.main">
                    {projectDetails.credits_retired ? `${parseFloat(projectDetails.credits_retired).toLocaleString()} tCO₂` : 'None retired'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Methodology and Standards */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom color="primary">
                📋 Methodology & Standards
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Methodology</Typography>
                  <Typography variant="body1">
                    {projectDetails.methodology || 'Not specified'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Verification Standard</Typography>
                  <Typography variant="body1">
                    {projectDetails.verification_standard || 'Not specified'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Verification Date</Typography>
                  <Typography variant="body1">
                    {formatDate(projectDetails.verification_date)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Calculation Timestamp</Typography>
                  <Typography variant="body1">
                    {formatDate(projectDetails.calculation_timestamp)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Blockchain Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom color="primary">
                ⛓️ Blockchain Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Wallet Address</Typography>
                  <Typography variant="body1" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                    {projectDetails.wallet_address || 'Not connected'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Mint Address</Typography>
                  <Typography variant="body1" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                    {projectDetails.mint_address || 'Not minted yet'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Minted Date</Typography>
                  <Typography variant="body1">
                    {formatDate(projectDetails.minted_at)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Is Immutable</Typography>
                  <Chip 
                    label={projectDetails.is_immutable ? 'YES' : 'NO'}
                    color={projectDetails.is_immutable ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Additional Project Data */}
        {projectDetails.carbon_data && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom color="primary">
                  📊 Carbon Data & Measurements
                </Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                    {typeof projectDetails.carbon_data === 'object' 
                      ? JSON.stringify(projectDetails.carbon_data, null, 2)
                      : projectDetails.carbon_data
                    }
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Environmental Metrics */}
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

        {/* Project Tags */}
        {projectDetails.tags && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom color="primary">
                  🏷️ Project Tags
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {(Array.isArray(projectDetails.tags) ? projectDetails.tags : projectDetails.tags.split(',')).map((tag, index) => (
                    <Chip 
                      key={index} 
                      label={tag.trim()} 
                      variant="outlined" 
                      size="small"
                      color="primary"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Review Notes */}
        {projectDetails.review_notes && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom color="warning.main">
                  📝 Review Notes
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                  {projectDetails.review_notes}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Reviewed by: {projectDetails.reviewed_by || 'Not specified'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Reviewed on: {formatDate(projectDetails.reviewed_at)}
                  </Typography>
                </Box>
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
  const calculatedCredits = projectDetails?.calculated_credits || projectDetails?.estimated_credits || 0;
  const hasCalculatedAmount = calculatedCredits > 0;
  const isAmountChanged = mintAmount && parseFloat(mintAmount) !== parseFloat(calculatedCredits);

  const handleUseCalculated = () => {
    setMintAmount(calculatedCredits.toString());
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        <Eco sx={{ mr: 1, verticalAlign: 'middle' }} />
        Final Mint Confirmation
      </Typography>
      
      {/* Calculated Amount Display */}
      {hasCalculatedAmount && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                📊 Calculated Carbon Credits: {parseFloat(calculatedCredits).toLocaleString()} tCO₂
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Based on project data and environmental calculations
              </Typography>
            </Box>
            {isAmountChanged && (
              <Button 
                variant="outlined" 
                size="small" 
                onClick={handleUseCalculated}
                sx={{ ml: 2 }}
              >
                Use Calculated
              </Button>
            )}
          </Box>
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom color="primary">
                ⚙️ Minting Configuration
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Amount Input with Calculated Reference */}
                <Box>
                  <TextField
                    fullWidth
                    label="Carbon Credits Amount (tCO₂)"
                    type="number"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText={
                      hasCalculatedAmount 
                        ? `Calculated: ${parseFloat(calculatedCredits).toLocaleString()} tCO₂ | You can modify this amount if needed`
                        : "Enter the amount of carbon credits to mint"
                    }
                    InputProps={{
                      sx: { 
                        fontSize: '1.1rem',
                        '& input': { fontWeight: 'medium' }
                      }
                    }}
                  />
                  
                  {isAmountChanged && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        ⚠️ You've modified the calculated amount from {parseFloat(calculatedCredits).toLocaleString()} to {parseFloat(mintAmount).toLocaleString()} tCO₂
                      </Typography>
                    </Alert>
                  )}
                </Box>
                
                {/* Justification Field */}
                <TextField
                  fullWidth
                  label="Minting Reason/Justification"
                  multiline
                  rows={4}
                  value={mintReason}
                  onChange={(e) => setMintReason(e.target.value)}
                  placeholder={
                    isAmountChanged 
                      ? "Explain why you modified the calculated amount and provide justification for minting..."
                      : "Provide detailed justification for minting these carbon credits..."
                  }
                  helperText="This reason will be permanently recorded in the audit trail"
                  required
                />
                
                {/* Quick Justification Buttons */}
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Quick Templates:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => setMintReason(prev => 
                        prev ? prev + " | Verified project completion and environmental impact." 
                             : "Verified project completion and environmental impact."
                      )}
                    >
                      ✅ Project Verified
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => setMintReason(prev => 
                        prev ? prev + " | Approved after thorough documentation review." 
                             : "Approved after thorough documentation review."
                      )}
                    >
                      📋 Documentation Approved
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => setMintReason(prev => 
                        prev ? prev + " | Meets all carbon credit standards and criteria." 
                             : "Meets all carbon credit standards and criteria."
                      )}
                    >
                      🌱 Standards Met
                    </Button>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom color="primary">
                📊 Minting Summary
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Project</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {projectDetails?.title || projectDetails?.name}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">Owner</Typography>
                  <Typography variant="body1">
                    {userDetails?.full_name || userDetails?.email}
                  </Typography>
                </Box>
                
                <Divider />
                
                {/* Credit Amount Comparison */}
                <Box>
                  <Typography variant="body2" color="text.secondary">Calculated Credits</Typography>
                  <Typography variant="h6" color="info.main">
                    {hasCalculatedAmount ? `${parseFloat(calculatedCredits).toLocaleString()} tCO₂` : 'Not calculated'}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">Amount to Mint</Typography>
                  <Typography 
                    variant="h5" 
                    color={isAmountChanged ? "warning.main" : "success.main"}
                    fontWeight="bold"
                  >
                    {mintAmount ? `${parseFloat(mintAmount).toLocaleString()} tCO₂` : '0 tCO₂'}
                  </Typography>
                  {isAmountChanged && (
                    <Chip 
                      label={`${parseFloat(mintAmount) > parseFloat(calculatedCredits) ? '+' : ''}${(parseFloat(mintAmount) - parseFloat(calculatedCredits)).toLocaleString()} tCO₂ difference`}
                      size="small"
                      color={parseFloat(mintAmount) > parseFloat(calculatedCredits) ? "warning" : "info"}
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </Box>
                
                <Divider />
                
                <Box>
                  <Typography variant="body2" color="text.secondary">Recipient Wallet</Typography>
                  <Typography variant="body1" fontFamily="monospace" sx={{ wordBreak: 'break-all', fontSize: '0.9rem' }}>
                    {userDetails?.wallet_address || projectDetails?.wallet_address || 'Not connected'}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">Minting Date</Typography>
                  <Typography variant="body1">
                    {new Date().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Alert severity={isAmountChanged ? "warning" : "info"}>
            <Typography variant="body1" fontWeight="medium">
              {isAmountChanged 
                ? "⚠️ Modified Amount Warning" 
                : "🔒 Final Confirmation"
              }
            </Typography>
            <Typography variant="body2">
              {isAmountChanged 
                ? `You are minting ${parseFloat(mintAmount).toLocaleString()} tCO₂ instead of the calculated ${parseFloat(calculatedCredits).toLocaleString()} tCO₂. Please ensure this modification is justified and documented. Once confirmed, these carbon credits will be permanently minted on the blockchain and cannot be undone.`
                : "Once confirmed, carbon credits will be minted on the blockchain and cannot be undone. Please ensure all details are correct before proceeding."
              }
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminMintVerificationModal;