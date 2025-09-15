import React, { useState, useEffect } from 'react';
import { 
  Box, Button, Container, Grid, Typography, Stack, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Pagination, Tab, Tabs, CircularProgress, Alert
} from '@mui/material';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
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
      // Try to use the registry_view first, fallback to projects table
      let { data, error } = await supabase
        .from('registry_view')
        .select('*')
        .order('created_at', { ascending: false });

      // If registry_view doesn't exist, use projects table with joins
      if (error && error.message.includes('relation "registry_view" does not exist')) {
        const result = await supabase
          .from('projects')
          .select(`
            *,
            profiles!projects_submitted_by_user_fkey(full_name, organization_name),
            tokens(amount)
          `)
          .order('created_at', { ascending: false });
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching projects:', err);
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
        color = 'success';
        displayText = 'Completed';
        break;
      case 'pending':
        color = 'warning';
        displayText = 'Pending';
        break;
      case 'rejected':
        color = 'error';
        displayText = 'Rejected';
        break;
      default:
        color = 'default';
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
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
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
