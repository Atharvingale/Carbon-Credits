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
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  Assignment as ProjectIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const NGODashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
      return;
    }
    setUser(session.user);
    fetchUserProjects();
  };

  const fetchUserProjects = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Fetching user projects directly from projects...');
      
      // Get current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }
      
      // Query projects for current user's projects
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('✅ User projects loaded:', { count: data?.length, userId: session.user.id });
      console.log('✅ Raw user data:', data);
      console.log('✅ First user item:', data?.[0]);
      setProjects(data || []);
      console.log('✅ Projects set to state:', data?.length, 'items');
    } catch (error) {
      console.error('❌ Error fetching projects:', error);
      setError(error.message);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'under_review': return '#3B82F6';
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'credits_calculated': return '#8B5CF6';
      case 'credits_minted': return '#00d4aa';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <PendingIcon />;
      case 'under_review': return <AssessmentIcon />;
      case 'approved': return <CheckIcon />;
      case 'rejected': return <CancelIcon />;
      case 'credits_calculated': return <TrendingUpIcon />;
      case 'credits_minted': return <TrendingUpIcon />;
      default: return <ProjectIcon />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending Review';
      case 'under_review': return 'Under Review';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'credits_calculated': return 'Credits Calculated';
      case 'credits_minted': return 'Credits Minted';
      default: return status?.toUpperCase() || 'UNKNOWN';
    }
  };

  const handleMenuOpen = (event, project) => {
    setAnchorEl(event.currentTarget);
    setSelectedProject(project);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProject(null);
  };

  const getProjectStats = () => {
    const total = projects.length;
    const pending = projects.filter(p => p.status === 'pending').length;
    const approved = projects.filter(p => p.status === 'approved').length;
    const totalCredits = projects.reduce((sum, p) => sum + (p.calculated_credits || 0), 0);
    
    return { total, pending, approved, totalCredits };
  };

  const stats = getProjectStats();

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress sx={{ bgcolor: '#2d3748', '& .MuiLinearProgress-bar': { bgcolor: '#00d4aa' } }} />
        <Typography variant="h4" sx={{ color: '#ffffff', mt: 2, textAlign: 'center' }}>
          Loading Your Projects...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 700, mb: 1 }}>
            My Projects
          </Typography>
          <Typography variant="body1" sx={{ color: '#a0a9ba' }}>
            Track your blue carbon project submissions and their progress
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/project-submission')}
          sx={{
            bgcolor: '#00d4aa',
            color: '#ffffff',
            fontWeight: 600,
            px: 3,
            '&:hover': {
              bgcolor: '#00b894'
            }
          }}
        >
          Submit New Project
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography>Error loading projects: {error}</Typography>
          <Button onClick={fetchUserProjects} sx={{ mt: 1 }}>
            Try Again
          </Button>
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ color: '#00d4aa', fontWeight: 700 }}>
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0a9ba' }}>
                    Total Projects
                  </Typography>
                </Box>
                <ProjectIcon sx={{ color: '#00d4aa', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ color: '#F59E0B', fontWeight: 700 }}>
                    {stats.pending}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0a9ba' }}>
                    Pending Review
                  </Typography>
                </Box>
                <PendingIcon sx={{ color: '#F59E0B', fontSize: 40 }} />
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
                    {stats.approved}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0a9ba' }}>
                    Approved
                  </Typography>
                </Box>
                <CheckIcon sx={{ color: '#10B981', fontSize: 40 }} />
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
                    {stats.totalCredits.toFixed(0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0a9ba' }}>
                    Carbon Credits
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ color: '#8B5CF6', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Projects Grid */}
      {projects.length > 0 ? (
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
                      <Typography variant="body2" sx={{ color: '#a0a9ba', mb: 1 }}>
                        {project.location}
                      </Typography>
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
                      Organization: {project.organization_name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#a0a9ba', mb: 1 }}>
                      Ecosystem: {project.ecosystem_type || 'N/A'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#a0a9ba', mb: 1 }}>
                      Area: {project.project_area} hectares
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#a0a9ba', mb: 2 }}>
                      Submitted: {new Date(project.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>

                  {/* Status and Credits */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Chip
                      icon={getStatusIcon(project.status)}
                      label={getStatusText(project.status)}
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

                  {/* Source Type Indicator */}
                  {project.source_type && (
                    <Box sx={{ mb: 2 }}>
                      <Chip
                        label={project.source_type === 'submission' ? 'Submission' : 'Project'}
                        size="small"
                        sx={{
                          bgcolor: project.source_type === 'submission' ? '#3B82F6' : '#10B981',
                          color: '#ffffff'
                        }}
                      />
                    </Box>
                  )}

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                    <Button
                      variant="outlined"
                      startIcon={<ViewIcon />}
                      fullWidth
                      sx={{
                        borderColor: '#2d3748',
                        color: '#a0a9ba',
                        '&:hover': {
                          borderColor: '#00d4aa',
                          color: '#00d4aa'
                        }
                      }}
                      onClick={() => {/* Handle view project */}}
                    >
                      View Details
                    </Button>
                    {project.status === 'pending' || project.status === 'rejected' ? (
                      <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        sx={{
                          borderColor: '#F59E0B',
                          color: '#F59E0B',
                          '&:hover': {
                            borderColor: '#F59E0B',
                            bgcolor: 'rgba(245, 158, 11, 0.1)'
                          }
                        }}
                        onClick={() => {/* Handle edit project */}}
                      >
                        Edit
                      </Button>
                    ) : null}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748', p: 6, textAlign: 'center' }}>
          <ProjectIcon sx={{ fontSize: 64, color: '#2d3748', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
            No Projects Found
          </Typography>
          <Typography variant="body2" sx={{ color: '#a0a9ba', mb: 3 }}>
            You haven't submitted any projects yet. Start by submitting your first blue carbon project.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/project-submission')}
            sx={{
              bgcolor: '#00d4aa',
              color: '#ffffff',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#00b894'
              }
            }}
          >
            Submit Your First Project
          </Button>
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
        <MenuItem onClick={() => {/* Handle view */}}>
          <ViewIcon sx={{ mr: 2, color: '#00d4aa' }} />
          View Details
        </MenuItem>
        {(selectedProject?.status === 'pending' || selectedProject?.status === 'rejected') && (
          <MenuItem onClick={() => {/* Handle edit */}}>
            <EditIcon sx={{ mr: 2, color: '#F59E0B' }} />
            Edit Project
          </MenuItem>
        )}
      </Menu>
    </Container>
  );
};

export default NGODashboard;