import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  LinearProgress,
  Snackbar
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Calculate as CalculateIcon,
  Visibility as ViewIcon,
  Token as TokenIcon,
  CheckCircle as ApproveIcon,
  Close as RejectIcon,
  LocationOn as LocationIcon,
  Nature as NatureIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { createClient } from '@supabase/supabase-js';
import CarbonCreditCalculatorDialog from './CarbonCreditCalculatorDialog';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const AdminDashboardExample = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [actionProject, setActionProject] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching projects directly from project_submissions table...');
      
      const { data, error } = await supabase
        .from('project_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📋 Fetch result:', { data, error, count: data?.length });
      console.log('📋 Raw data:', data);

      if (error) {
        console.error('❌ Supabase error:', error);
        console.error('❌ Error details:', error.details, error.hint, error.code);
        showNotification(`Error fetching projects: ${error.message}`, 'error');
        setProjects([]);
      } else {
        console.log('✅ Data type:', typeof data, 'Is array:', Array.isArray(data));
        console.log('✅ First item:', data?.[0]);
        setProjects(data || []);
        console.log('✅ Successfully loaded', data?.length, 'projects to state');
      }
    } catch (error) {
      console.error('❌ Error fetching projects:', error);
      showNotification(`Error fetching projects: ${error.message}`, 'error');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const handleCalculateCredits = (project) => {
    setSelectedProject(project);
    setCalculatorOpen(true);
    handleMenuClose();
  };

  const handleCreditCalculated = async (creditAmount, calculationData) => {
    try {
      // Update project with calculated credits and mint status
      const { error: updateError } = await supabase
        .from('project_submissions')
        .update({ 
          status: 'credits_calculated',
          calculated_credits: creditAmount,
          calculation_data: calculationData,
          calculation_timestamp: new Date().toISOString()
        })
        .eq('id', selectedProject.id);

      if (updateError) throw updateError;

      // Here you would typically interact with your blockchain/smart contract
      // to actually mint the carbon credits
      console.log('Minting credits:', creditAmount, 'for project:', selectedProject.title);
      
      showNotification(`Successfully calculated ${creditAmount} carbon credits for ${selectedProject.title}`);
      fetchProjects(); // Refresh the projects list
    } catch (error) {
      console.error('Error updating project:', error);
      showNotification('Error updating project with calculated credits', 'error');
    }
  };

  const handleApproveProject = async (projectId) => {
    try {
      const { error } = await supabase
        .from('project_submissions')
        .update({ status: 'approved' })
        .eq('id', projectId);

      if (error) throw error;
      showNotification('Project approved successfully');
      fetchProjects();
    } catch (error) {
      console.error('Error approving project:', error);
      showNotification('Error approving project', 'error');
    }
    handleMenuClose();
  };

  const handleRejectProject = async (projectId) => {
    try {
      const { error } = await supabase
        .from('project_submissions')
        .update({ status: 'rejected' })
        .eq('id', projectId);

      if (error) throw error;
      showNotification('Project rejected');
      fetchProjects();
    } catch (error) {
      console.error('Error rejecting project:', error);
      showNotification('Error rejecting project', 'error');
    }
    handleMenuClose();
  };

  const handleMenuOpen = (event, project) => {
    setAnchorEl(event.currentTarget);
    setActionProject(project);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setActionProject(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'credits_calculated': return '#8B5CF6';
      case 'credits_minted': return '#00d4aa';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <ApproveIcon />;
      case 'rejected': return <RejectIcon />;
      case 'credits_calculated': return <CalculateIcon />;
      case 'credits_minted': return <TokenIcon />;
      default: return <AnalyticsIcon />;
    }
  };

  const hasValidCarbonData = (project) => {
    try {
      if (!project.carbon_data) return false;
      const data = typeof project.carbon_data === 'string' 
        ? JSON.parse(project.carbon_data) 
        : project.carbon_data;
      
      // Check for required fields
      return data.bulk_density && data.depth && data.carbon_percent && 
             data.agb_biomass && data.bgb_biomass;
    } catch (error) {
      return false;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress sx={{ bgcolor: '#2d3748', '& .MuiLinearProgress-bar': { bgcolor: '#00d4aa' } }} />
        <Typography variant="h4" sx={{ color: '#ffffff', mt: 2, textAlign: 'center' }}>
          Loading Projects...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 700, mb: 1 }}>
          Project Administration Dashboard
        </Typography>
        <Typography variant="body1" sx={{ color: '#a0a9ba' }}>
          Review, calculate, and manage carbon credit projects
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ color: '#00d4aa', fontWeight: 700 }}>
                    {projects.filter(p => p.status === 'pending').length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0a9ba' }}>
                    Pending Review
                  </Typography>
                </Box>
                <AnalyticsIcon sx={{ color: '#F59E0B', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ color: '#10B981', fontWeight: 700 }}>
                    {projects.filter(p => p.status === 'approved').length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0a9ba' }}>
                    Approved
                  </Typography>
                </Box>
                <ApproveIcon sx={{ color: '#10B981', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ color: '#8B5CF6', fontWeight: 700 }}>
                    {projects.filter(p => p.calculated_credits).reduce((sum, p) => sum + (p.calculated_credits || 0), 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0a9ba' }}>
                    Total Credits
                  </Typography>
                </Box>
                <TokenIcon sx={{ color: '#8B5CF6', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ color: '#00d4aa', fontWeight: 700 }}>
                    {projects.reduce((sum, p) => sum + (p.project_area || 0), 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0a9ba' }}>
                    Total Hectares
                  </Typography>
                </Box>
                <NatureIcon sx={{ color: '#00d4aa', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Projects Grid */}
      <Grid container spacing={3}>
        {projects.map((project) => (
          <Grid item xs={12} md={6} lg={4} key={project.id}>
            <Card 
              sx={{ 
                bgcolor: '#0f1419', 
                border: '1px solid #2d3748',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: '#00d4aa',
                  transform: 'translateY(-4px)'
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, p: 3 }}>
                {/* Project Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600, mb: 1 }}>
                      {project.title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LocationIcon sx={{ color: '#a0a9ba', fontSize: 16, mr: 0.5 }} />
                      <Typography variant="body2" sx={{ color: '#a0a9ba' }}>
                        {project.location}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton 
                    onClick={(e) => handleMenuOpen(e, project)}
                    sx={{ color: '#a0a9ba' }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>

                {/* Project Details */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ color: '#a0a9ba', mb: 1 }}>
                    Organization: {project.organization_name || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0a9ba', mb: 1 }}>
                    User ID: {project.user_id?.substring(0, 8) || 'N/A'}...
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0a9ba', mb: 1 }}>
                    Ecosystem: {project.ecosystem_type}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0a9ba', mb: 2 }}>
                    Area: {project.project_area} hectares
                  </Typography>
                </Box>

                {/* Status and Credits */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Chip
                    icon={getStatusIcon(project.status)}
                    label={project.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                    sx={{
                      bgcolor: getStatusColor(project.status),
                      color: '#ffffff',
                      fontWeight: 600,
                      '& .MuiChip-icon': { color: '#ffffff' }
                    }}
                  />
                  {project.calculated_credits && (
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ color: '#a0a9ba' }}>
                        Credits
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#00d4aa', fontWeight: 600 }}>
                        {project.calculated_credits}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Carbon Data Status */}
                <Box sx={{ mb: 3 }}>
                  {hasValidCarbonData(project) ? (
                    <Alert 
                      severity="success" 
                      sx={{ 
                        bgcolor: '#1b2d1b', 
                        color: '#c8e6c9',
                        '& .MuiAlert-icon': { color: '#4caf50' }
                      }}
                    >
                      Carbon data complete
                    </Alert>
                  ) : (
                    <Alert 
                      severity="warning" 
                      sx={{ 
                        bgcolor: '#2d2413', 
                        color: '#fff3cd',
                        '& .MuiAlert-icon': { color: '#F59E0B' }
                      }}
                    >
                      Incomplete carbon data
                    </Alert>
                  )}
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                  <Button
                    variant="outlined"
                    startIcon={<ViewIcon />}
                    sx={{
                      borderColor: '#2d3748',
                      color: '#a0a9ba',
                      '&:hover': {
                        borderColor: '#00d4aa',
                        color: '#00d4aa'
                      }
                    }}
                    onClick={() => {/* Handle view project details */}}
                  >
                    View
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<CalculateIcon />}
                    disabled={!hasValidCarbonData(project)}
                    sx={{
                      bgcolor: '#00d4aa',
                      color: '#ffffff',
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: '#00b894'
                      },
                      '&:disabled': {
                        bgcolor: '#2d3748',
                        color: '#6b7280'
                      }
                    }}
                    onClick={() => handleCalculateCredits(project)}
                  >
                    Calculate
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {projects.length === 0 && (
        <Paper sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748', p: 6, textAlign: 'center' }}>
          <NatureIcon sx={{ fontSize: 64, color: '#2d3748', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#ffffff', mb: 1 }}>
            No Projects Found
          </Typography>
          <Typography variant="body2" sx={{ color: '#a0a9ba' }}>
            Projects will appear here once they are submitted for review.
          </Typography>
        </Paper>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: '#1a2332',
            border: '1px solid #2d3748',
            color: '#ffffff'
          }
        }}
      >
        <MenuItem onClick={() => handleCalculateCredits(actionProject)} disabled={!hasValidCarbonData(actionProject)}>
          <CalculateIcon sx={{ mr: 2, color: '#00d4aa' }} />
          Calculate Credits
        </MenuItem>
        <MenuItem onClick={() => handleApproveProject(actionProject?.id)} disabled={actionProject?.status === 'approved'}>
          <ApproveIcon sx={{ mr: 2, color: '#10B981' }} />
          Approve Project
        </MenuItem>
        <MenuItem onClick={() => handleRejectProject(actionProject?.id)} disabled={actionProject?.status === 'rejected'}>
          <RejectIcon sx={{ mr: 2, color: '#EF4444' }} />
          Reject Project
        </MenuItem>
      </Menu>

      {/* Carbon Credit Calculator Dialog */}
      <CarbonCreditCalculatorDialog
        open={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        project={selectedProject}
        onCreditCalculated={handleCreditCalculated}
      />

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotification({ ...notification, open: false })} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminDashboardExample;