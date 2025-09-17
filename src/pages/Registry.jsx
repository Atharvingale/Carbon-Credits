import React, { useState, useEffect } from 'react';
import { 
  Box, Button, Container, Typography, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Tab, Tabs, CircularProgress, Alert, Card
} from '@mui/material';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabaseClient';


const Registry = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('PROJECTS');
  const projectsPerPage = 10;

  // Fetch projects from database
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      console.log('🔍 Registry: Fetching all projects from unified table...');
      
      // Fetch from unified projects table
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('❌ Registry: Error fetching projects:', projectsError);
        throw projectsError;
      }

      // Format data for display
      let allProjects = [];
      
      if (projectsData) {
        const formattedProjects = projectsData.map(project => ({
          ...project,
          project_name: project.title || project.name,
          company: project.organization_name,
          credit_type: project.ecosystem_type || project.project_type || project.verification_standard || 'Blue Carbon',
          credits: project.credits_issued || project.calculated_credits || project.estimated_credits || 0
        }));
        allProjects = [...formattedProjects];
      }

      console.log('✅ Registry: Successfully loaded projects:', {
        total: allProjects.length
      });
      
      setProjects(allProjects);
    } catch (err) {
      setError(err.message);
      console.error('❌ Registry: Error fetching projects:', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  // Calculate pagination
  const totalPages = Math.ceil(projects.length / projectsPerPage);
  const startIndex = (currentPage - 1) * projectsPerPage;
  const currentProjects = projects.slice(startIndex, startIndex + projectsPerPage);

  const getStatusChip = (status) => {
    const statusLower = status?.toLowerCase() || 'pending';
    let color = 'default';
    let displayText = status || 'Pending';
    
    switch (statusLower) {
      case 'approved':
        color = 'success';
        displayText = 'Verified';
        break;
      case 'completed':
      case 'active':
        color = 'success';
        displayText = 'Active';
        break;
      case 'pending':
      case 'under_review':
        color = 'warning';
        displayText = 'Under Review';
        break;
      case 'rejected':
      case 'cancelled':
        color = 'error';
        displayText = 'Rejected';
        break;
      case 'credits_calculated':
        color = 'info';
        displayText = 'Credits Calculated';
        break;
      case 'credits_minted':
        color = 'success';
        displayText = 'Credits Issued';
        break;
      case 'draft':
        color = 'default';
        displayText = 'Draft';
        break;
      case 'suspended':
        color = 'warning';
        displayText = 'Suspended';
        break;
      default:
        color = 'default';
        displayText = status?.toUpperCase() || 'UNKNOWN';
    }
    
    return (
      <Chip 
        label={displayText} 
        color={color} 
        size="small" 
        sx={{ 
          borderRadius: '12px',
          fontWeight: 500,
          '&.MuiChip-colorSuccess': {
            backgroundColor: '#e8f5e8',
            color: '#2e7d32'
          },
          '&.MuiChip-colorInfo': {
            backgroundColor: '#e3f2fd',
            color: '#1976d2'
          }
        }}
      />
    );
  };
  return (
    <Box>
      {/* Hero Section */}
      <Box 
        sx={{ 
          background: 'linear-gradient(135deg, rgba(124, 136, 135, 0.9) 0%, rgba(42, 157, 143, 0.85) 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100vh'
        }}
      >
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            opacity: 0.4,
            backgroundImage: 'url(https://trustedcarbon.org/wp-content/uploads/2025/01/1.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(180deg, rgba(14, 118, 110, 0.7) 0%, rgba(42, 157, 143, 0.5) 100%)',
              zIndex: 1
            }
          }} 
        />
        
        {/* Navbar */}
        <Box sx={{ position: 'relative', zIndex: 2 }}>
          <Navbar />
        </Box>
        
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, pt: 12, pb: 12 }}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', md: '4rem' }, fontWeight: 800, mb: 2 }}>
              Registry
            </Typography>
            <Typography variant="body1" sx={{ mb: 6, maxWidth: '800px', mx: 'auto' }}>

            The BlueCarbon Registry is the official system of record for verified, traceable, and auditable carbon projects. Each project is validated to international standards and backed by full documentation — including design, monitoring, issuance, and retirement records. With blockchain-secured tracking and scientific monitoring, the registry ensures every credit is unique and transparent.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Registry Table Section */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ width: '100%' }}>
          {/* Registry Overview Metrics */}
          {!loading && !error && projects.length > 0 && (
            <Box sx={{ mb: 5 }}>
              {/* Section Header */}
              <Box sx={{ mb: 3 }}>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    color: '#1a1a1a',
                    fontWeight: 600,
                    fontSize: '1.25rem',
                    letterSpacing: '-0.025em'
                  }}
                >
                  Registry Overview
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#64748b',
                    mt: 0.5,
                    fontSize: '0.875rem'
                  }}
                >
                  Real-time project metrics and verification status
                </Typography>
              </Box>
              
              {/* Metrics Grid - Horizontal Cards */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'stretch' }}>
                {/* Total Projects Card */}
                <Card 
                  elevation={0}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    border: '1px solid #e2e8f0',
                    borderRadius: 3,
                    px: 2.5,
                    py: 2,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: '#cbd5e1',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box 
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Box sx={{ width: 20, height: 20, bgcolor: '#64748b', borderRadius: '3px' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#64748b',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          mb: 0.5
                        }}
                      >
                        Total Projects
                      </Typography>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          color: '#0f172a',
                          fontWeight: 700,
                          fontSize: '1.5rem',
                          lineHeight: 1,
                          mb: 0.25
                        }}
                      >
                        {projects.length.toLocaleString()}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#94a3b8',
                          fontSize: '0.6875rem'
                        }}
                      >
                        Registered in platform
                      </Typography>
                    </Box>
                  </Box>
                </Card>

                {/* Active Projects Card */}
                <Card 
                  elevation={0}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    border: '1px solid #bbf7d0',
                    borderRadius: 3,
                    px: 2.5,
                    py: 2,
                    bgcolor: '#f0fdf4',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: '#86efac',
                      boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)',
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box 
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid #bbf7d0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Box sx={{ width: 20, height: 20, bgcolor: '#059669', borderRadius: '50%' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#065f46',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          mb: 0.5
                        }}
                      >
                        Active Projects
                      </Typography>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          color: '#059669',
                          fontWeight: 700,
                          fontSize: '1.5rem',
                          lineHeight: 1,
                          mb: 0.25
                        }}
                      >
                        {projects.filter(p => ['approved', 'active', 'credits_calculated', 'credits_minted'].includes(p.status?.toLowerCase())).length.toLocaleString()}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#047857',
                          fontSize: '0.6875rem'
                        }}
                      >
                        Verified & operational
                      </Typography>
                    </Box>
                  </Box>
                </Card>

                {/* Under Review Card */}
                <Card 
                  elevation={0}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    border: '1px solid #fed7aa',
                    borderRadius: 3,
                    px: 2.5,
                    py: 2,
                    bgcolor: '#fffbeb',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: '#fdba74',
                      boxShadow: '0 8px 24px rgba(217, 119, 6, 0.15)',
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box 
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: 'rgba(217, 119, 6, 0.1)',
                        border: '1px solid #fed7aa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Box 
                        sx={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: '50%',
                          border: '2px solid #d97706'
                        }} 
                      />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#92400e',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          mb: 0.5
                        }}
                      >
                        Under Review
                      </Typography>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          color: '#d97706',
                          fontWeight: 700,
                          fontSize: '1.5rem',
                          lineHeight: 1,
                          mb: 0.25
                        }}
                      >
                        {projects.filter(p => ['pending', 'under_review'].includes(p.status?.toLowerCase())).length.toLocaleString()}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#b45309',
                          fontSize: '0.6875rem'
                        }}
                      >
                        Awaiting verification
                      </Typography>
                    </Box>
                  </Box>
                </Card>

                {/* Carbon Credits Card */}
                <Card 
                  elevation={0}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    border: '1px solid #e9d5ff',
                    borderRadius: 3,
                    px: 2.5,
                    py: 2,
                    bgcolor: '#faf5ff',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: '#d8b4fe',
                      boxShadow: '0 8px 24px rgba(124, 58, 237, 0.15)',
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box 
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: 'rgba(124, 58, 237, 0.1)',
                        border: '1px solid #e9d5ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Box 
                        sx={{ 
                          width: 20, 
                          height: 15,
                          borderRadius: '3px',
                          bgcolor: '#7c3aed'
                        }} 
                      />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#581c87',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          mb: 0.5
                        }}
                      >
                        Carbon Credits
                      </Typography>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          color: '#7c3aed',
                          fontWeight: 700,
                          fontSize: '1.5rem',
                          lineHeight: 1,
                          mb: 0.25
                        }}
                      >
                        {projects.reduce((sum, p) => sum + (parseInt(p.credits) || 0), 0).toLocaleString()}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#6b21a8',
                          fontSize: '0.6875rem'
                        }}
                      >
                        Total credits issued
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </Box>
            </Box>
          )}

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="PROJECTS" value="PROJECTS" />
              <Tab label="CREDITS ISSUED" value="CREDITS_ISSUED" />
              <Tab label="RETIREMENTS" value="RETIREMENTS" />
            </Tabs>
          </Box>

          {/* Loading State */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Error State */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Error loading projects: {error}
            </Alert>
          )}

          {/* Table */}
          {!loading && !error && (
            <>
              <TableContainer component={Paper} sx={{ mb: 3, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 600, color: '#666' }}>Name Of Project</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#666' }}>Company</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#666' }}>Type Of Credit</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#666' }}>Location</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#666' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#666' }}>Credits</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#666' }}>Source</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentProjects.length > 0 ? (
                      currentProjects.map((project, index) => (
                        <TableRow key={project.id || index} sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: '#2a9d8f', 
                                cursor: 'pointer',
                                '&:hover': { textDecoration: 'underline' }
                              }}
                            >
                              {project.project_name || project.name || 'Unnamed Project'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {project.company || project.organization_name || project.profiles?.organization_name || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {project.credit_type || project.project_type || project.verification_standard || 'Carbon Credit'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {project.location || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {getStatusChip(project.status)}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {project.credits || project.credits_issued || project.estimated_credits || project.total_tokens_minted || project.tokens?.reduce((sum, token) => sum + Number(token.amount), 0) || '0'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={project.source_type === 'submission' ? 'Submission' : 'Registry'}
                              size="small"
                              sx={{
                                bgcolor: project.source_type === 'submission' ? '#e3f2fd' : '#f3e5f5',
                                color: project.source_type === 'submission' ? '#1976d2' : '#7b1fa2',
                                fontWeight: 500
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                          <Typography variant="body1" color="text.secondary">
                            No projects found. Projects will appear here once they are submitted and verified.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {projects.length > projectsPerPage && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    PAGE {currentPage} OF {totalPages}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button 
                      variant="outlined" 
                      size="small"
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(null, currentPage - 1)}
                      sx={{ minWidth: 'auto', px: 2 }}
                    >
                      ← PREVIOUS
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="small"
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(null, currentPage + 1)}
                      sx={{ minWidth: 'auto', px: 2 }}
                    >
                      NEXT →
                    </Button>
                  </Stack>
                </Box>
              )}
            </>
          )}
        </Box>
      </Container>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default Registry;
