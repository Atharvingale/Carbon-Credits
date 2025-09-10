import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
  Box, Container, Typography, Paper, Grid, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogActions, DialogContent, DialogTitle,
  CircularProgress, Alert, Tabs, Tab
} from '@mui/material';

const AdminDashboard = () => {
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingProjects, setPendingProjects] = useState([]);
  const [approvedProjects, setApprovedProjects] = useState([]);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Mint dialog state
  const [openMintDialog, setOpenMintDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [recipientWallet, setRecipientWallet] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [mintLoading, setMintLoading] = useState(false);
  const [mintError, setMintError] = useState(null);
  const [mintSuccess, setMintSuccess] = useState(null);

  // Check if user is authenticated and is admin
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      
      setUser(session.user);
      
      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.role !== 'admin') {
        navigate('/dashboard');
        return;
      }
      
      setIsAdmin(true);
      setLoading(false);
      
      // Fetch projects
      fetchProjects();
    };
    
    checkUser();
  }, [navigate]);

  const fetchProjects = async () => {
    try {
      // Fetch pending projects
      const { data: pending, error: pendingError } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'pending');
      
      if (pendingError) throw pendingError;
      setPendingProjects(pending || []);
      
      // Fetch approved projects
      const { data: approved, error: approvedError } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'approved');
      
      if (approvedError) throw approvedError;
      setApprovedProjects(approved || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to fetch projects. Please try again.');
    }
  };

  const handleApproveProject = async (projectId) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'approved' })
        .eq('id', projectId);
      
      if (error) throw error;
      
      // Refresh projects
      fetchProjects();
    } catch (err) {
      console.error('Error approving project:', err);
      setError('Failed to approve project. Please try again.');
    }
  };

  const handleOpenMintDialog = (project) => {
    setSelectedProject(project);
    setRecipientWallet(project.wallet_address || '');
    setMintAmount('');
    setMintError(null);
    setMintSuccess(null);
    setOpenMintDialog(true);
  };

  const handleCloseMintDialog = () => {
    setOpenMintDialog(false);
    setSelectedProject(null);
  };

  const handleMintTokens = async () => {
    if (!selectedProject || !recipientWallet || !mintAmount) {
      setMintError('Please fill in all fields');
      return;
    }
    
    setMintLoading(true);
    setMintError(null);
    setMintSuccess(null);
    
    try {
      // Get JWT token for authorization
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session.access_token;
      
      // Call server endpoint to mint tokens
      const response = await fetch('/api/mint', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${jwt}` 
        },
        body: JSON.stringify({ 
          projectId: selectedProject.id, 
          recipientWallet, 
          amount: parseInt(mintAmount, 10) 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mint tokens');
      }
      
      const result = await response.json();
      
      setMintSuccess(`Successfully minted ${mintAmount} tokens to ${recipientWallet}. Transaction: ${result.tx}`);
      
      // Refresh projects after successful mint
      fetchProjects();
    } catch (err) {
      console.error('Error minting tokens:', err);
      setMintError(err.message || 'Failed to mint tokens. Please try again.');
    } finally {
      setMintLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Dashboard
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Pending Projects" />
            <Tab label="Approved Projects" />
          </Tabs>
        </Box>
        
        {/* Pending Projects Tab */}
        {tabValue === 0 && (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pending Projects
            </Typography>
            
            {pendingProjects.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No pending projects found.
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Project Name</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Submitted By</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell component="th" scope="row">
                          {project.name}
                        </TableCell>
                        <TableCell>{project.location}</TableCell>
                        <TableCell>{project.submitted_by}</TableCell>
                        <TableCell>
                          {new Date(project.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          <Button 
                            variant="contained" 
                            size="small"
                            onClick={() => handleApproveProject(project.id)}
                            sx={{ mr: 1 }}
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="outlined" 
                            size="small"
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}
        
        {/* Approved Projects Tab */}
        {tabValue === 1 && (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Approved Projects
            </Typography>
            
            {approvedProjects.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No approved projects found.
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Project Name</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Wallet Address</TableCell>
                      <TableCell>Approval Date</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {approvedProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell component="th" scope="row">
                          {project.name}
                        </TableCell>
                        <TableCell>{project.location}</TableCell>
                        <TableCell>
                          {project.wallet_address ? 
                            `${project.wallet_address.slice(0, 6)}...${project.wallet_address.slice(-4)}` : 
                            'Not set'}
                        </TableCell>
                        <TableCell>
                          {new Date(project.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          <Button 
                            variant="contained" 
                            color="primary"
                            size="small"
                            onClick={() => handleOpenMintDialog(project)}
                            sx={{ mr: 1 }}
                          >
                            Mint Credits
                          </Button>
                          <Button 
                            variant="outlined" 
                            size="small"
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}
      </Box>
      
      {/* Mint Dialog */}
      <Dialog open={openMintDialog} onClose={handleCloseMintDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Mint Carbon Credits</DialogTitle>
        <DialogContent>
          {selectedProject && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Project: {selectedProject.name}
              </Typography>
              
              {mintError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {mintError}
                </Alert>
              )}
              
              {mintSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {mintSuccess}
                </Alert>
              )}
              
              <TextField
                margin="dense"
                label="Recipient Wallet Address"
                type="text"
                fullWidth
                value={recipientWallet}
                onChange={(e) => setRecipientWallet(e.target.value)}
                sx={{ mb: 2 }}
              />
              
              <TextField
                margin="dense"
                label="Amount to Mint"
                type="number"
                fullWidth
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMintDialog}>Cancel</Button>
          <Button 
            onClick={handleMintTokens} 
            variant="contained" 
            disabled={mintLoading}
          >
            {mintLoading ? 'Minting...' : 'Mint Tokens'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboard;