import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
  Box, Container, Typography, Paper, Grid, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogActions, DialogContent, DialogTitle,
  CircularProgress, Alert, Card, CardContent, Avatar,
  IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider,
  Chip, Select, FormControl,
  InputLabel, Tooltip, Snackbar
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as ProjectsIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as TokenIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Home as HomeIcon,
  BarChart as BarChartIcon,
  CheckCircle as ApprovedIcon,
  Schedule as PendingIcon,
  Token as MintIcon,
  Gavel as ApprovalIcon,
  SupervisorAccount as UsersIcon,
  Block as BlockIcon,
  PersonOff as BlockedIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  AttachMoney as MoneyIcon,
  History as HistoryIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Token
} from '@mui/icons-material';

const AdminDashboard = () => {
  const navigate = useNavigate();
  
  // Main state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  // Removed tabValue as we're using card-based layout
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Data state
  const [allUsers, setAllUsers] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [allTokens, setAllTokens] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  
  // Dialog states
  const [openMintDialog, setOpenMintDialog] = useState(false);
  const [openEditUserDialog, setOpenEditUserDialog] = useState(false);
  const [openEditProjectDialog, setOpenEditProjectDialog] = useState(false);
  const [openBlockUserDialog, setOpenBlockUserDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  
  // Selected items
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  
  // Form states
  const [recipientWallet, setRecipientWallet] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [editUserData, setEditUserData] = useState({});
  const [editProjectData, setEditProjectData] = useState({});
  
  // Filter and search states
  const [userFilter, setUserFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Loading states
  const [mintLoading, setMintLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  
  // Success/Error states
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Show snackbar helper
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

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
      
      // Fetch all dashboard data
      fetchDashboardData();
    };
    
    checkUser();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      // Fetch all users with detailed info
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (usersError) throw usersError;
      setAllUsers(usersData || []);
      
      // Fetch all projects with user info
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          profiles!projects_user_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });
      
      if (projectsError) throw projectsError;
      setAllProjects(projectsData || []);
      
      // Fetch all tokens with project and user info
      const { data: tokensData, error: tokensError } = await supabase
        .from('tokens')
        .select(`
          *,
          projects(title, user_id),
          profiles!tokens_user_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });
      
      if (tokensError) throw tokensError;
      setAllTokens(tokensData || []);
      
      // Fetch admin logs if table exists
      const { data: logsData } = await supabase
        .from('admin_logs')
        .select(`
          *,
          profiles!admin_logs_admin_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      setAdminLogs(logsData || []);
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to fetch dashboard data. Please try again.');
    }
  };

  // Log admin actions
  const logAdminAction = async (action, targetType, targetId, details = '') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.from('admin_logs').insert({
        admin_id: session.user.id,
        action,
        target_type: targetType,
        target_id: targetId,
        details,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error logging admin action:', err);
    }
  };

  // User Management Functions
  const handleBlockUser = async (userId, reason = '') => {
    setBlockLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_blocked: true, 
          block_reason: reason,
          blocked_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      await logAdminAction('block_user', 'user', userId, reason);
      showSnackbar('User blocked successfully', 'success');
      setOpenBlockUserDialog(false);
      fetchDashboardData();
    } catch (err) {
      console.error('Error blocking user:', err);
      showSnackbar('Failed to block user', 'error');
    } finally {
      setBlockLoading(false);
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_blocked: false, 
          block_reason: null,
          blocked_at: null
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      await logAdminAction('unblock_user', 'user', userId);
      showSnackbar('User unblocked successfully', 'success');
      fetchDashboardData();
    } catch (err) {
      console.error('Error unblocking user:', err);
      showSnackbar('Failed to unblock user', 'error');
    }
  };

  const handleEditUser = async (userId, userData) => {
    setEditLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(userData)
        .eq('id', userId);
      
      if (error) throw error;
      
      await logAdminAction('edit_user', 'user', userId, 
        `Updated: ${Object.keys(userData).join(', ')}`);
      showSnackbar('User updated successfully', 'success');
      setOpenEditUserDialog(false);
      fetchDashboardData();
    } catch (err) {
      console.error('Error updating user:', err);
      showSnackbar('Failed to update user', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
      
      await logAdminAction('delete_user', 'user', userId);
      showSnackbar('User deleted successfully', 'success');
      setOpenDeleteDialog(false);
      fetchDashboardData();
    } catch (err) {
      console.error('Error deleting user:', err);
      showSnackbar('Failed to delete user', 'error');
    }
  };

  // Project Management Functions
  const handleApproveProject = async (projectId) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'approved' })
        .eq('id', projectId);
      
      if (error) throw error;
      
      await logAdminAction('approve_project', 'project', projectId);
      showSnackbar('Project approved successfully', 'success');
      fetchDashboardData();
    } catch (err) {
      console.error('Error approving project:', err);
      showSnackbar('Failed to approve project', 'error');
    }
  };

  const handleRejectProject = async (projectId, reason = '') => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', projectId);
      
      if (error) throw error;
      
      await logAdminAction('reject_project', 'project', projectId, reason);
      showSnackbar('Project rejected', 'success');
      fetchDashboardData();
    } catch (err) {
      console.error('Error rejecting project:', err);
      showSnackbar('Failed to reject project', 'error');
    }
  };

  const handleEditProject = async (projectId, projectData) => {
    setEditLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update(projectData)
        .eq('id', projectId);
      
      if (error) throw error;
      
      await logAdminAction('edit_project', 'project', projectId,
        `Updated: ${Object.keys(projectData).join(', ')}`);
      showSnackbar('Project updated successfully', 'success');
      setOpenEditProjectDialog(false);
      fetchDashboardData();
    } catch (err) {
      console.error('Error updating project:', err);
      showSnackbar('Failed to update project', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      
      if (error) throw error;
      
      await logAdminAction('delete_project', 'project', projectId);
      showSnackbar('Project deleted successfully', 'success');
      setOpenDeleteDialog(false);
      fetchDashboardData();
    } catch (err) {
      console.error('Error deleting project:', err);
      showSnackbar('Failed to delete project', 'error');
    }
  };

  const handleOpenMintDialog = (project) => {
    setSelectedProject(project);
    setRecipientWallet(project?.wallet_address || '');
    setMintAmount('');
    setOpenMintDialog(true);
  };

  const handleCloseMintDialog = () => {
    setOpenMintDialog(false);
    setSelectedProject(null);
  };

  // Token Management Functions
  const handleMintTokens = async () => {
    if (!selectedProject || !recipientWallet || !mintAmount) {
      showSnackbar('Please fill in all fields', 'error');
      return;
    }
    
    setMintLoading(true);
    
    try {
      // Insert token record directly into database
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase
        .from('tokens')
        .insert({
          user_id: session.user.id,
          project_id: selectedProject.id,
          amount: parseInt(mintAmount, 10),
          wallet_address: recipientWallet,
          transaction_type: 'mint',
          status: 'completed',
          transaction_hash: 'admin_mint_' + Date.now() // Placeholder for actual blockchain tx
        });
      
      if (error) throw error;
      
      await logAdminAction('mint_tokens', 'token', selectedProject.id, 
        `Minted ${mintAmount} tokens to ${recipientWallet}`);
      showSnackbar(`Successfully minted ${mintAmount} tokens`, 'success');
      setOpenMintDialog(false);
      fetchDashboardData();
    } catch (err) {
      console.error('Error minting tokens:', err);
      showSnackbar('Failed to mint tokens', 'error');
    } finally {
      setMintLoading(false);
    }
  };

  const handleBurnTokens = async (tokenId, amount) => {
    try {
      const { error } = await supabase
        .from('tokens')
        .update({ 
          status: 'burned',
          burned_at: new Date().toISOString()
        })
        .eq('id', tokenId);
      
      if (error) throw error;
      
      await logAdminAction('burn_tokens', 'token', tokenId, 
        `Burned ${amount} tokens`);
      showSnackbar('Tokens burned successfully', 'success');
      fetchDashboardData();
    } catch (err) {
      console.error('Error burning tokens:', err);
      showSnackbar('Failed to burn tokens', 'error');
    }
  };

  // Dialog handlers
  const handleOpenBlockDialog = (user) => {
    setSelectedUser(user);
    setBlockReason('');
    setOpenBlockUserDialog(true);
  };

  const handleOpenEditUserDialog = (user) => {
    setSelectedUser(user);
    setEditUserData({
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role || 'user',
      wallet_address: user.wallet_address || ''
    });
    setOpenEditUserDialog(true);
  };

  const handleOpenEditProjectDialog = (project) => {
    setSelectedProject(project);
    setEditProjectData({
      title: project.title || '',
      description: project.description || '',
      location: project.location || '',
      estimated_credits: project.estimated_credits || '',
      status: project.status || 'pending'
    });
    setOpenEditProjectDialog(true);
  };

  const handleOpenDeleteDialog = (type, item) => {
    if (type === 'user') {
      setSelectedUser(item);
    } else if (type === 'project') {
      setSelectedProject(item);
    }
    setOpenDeleteDialog(true);
  };

  // Removed handleTabChange - using card-based layout

  // Menu handlers
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Navigation handlers
  const handleNavigation = (path) => {
    navigate(path);
    handleMenuClose();
  };

  // Logout function
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
    handleMenuClose();
  };

  // Helper functions
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: '#0a0f1c', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <CircularProgress sx={{ color: '#00d4aa' }} />
      </Box>
    );
  }

  const open = Boolean(anchorEl);
  
  // Calculate stats
  const totalCredits = allTokens.reduce((sum, token) => sum + (token.amount || 0), 0);
  const adminUsers = allUsers.filter(u => u.role === 'admin').length;
  const regularUsers = allUsers.filter(u => u.role === 'user').length;
  const pendingProjects = allProjects.filter(p => p.status === 'pending');
  const approvedProjects = allProjects.filter(p => p.status === 'approved');
  const projects = allProjects;
  const tokens = allTokens;

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#0a0f1c', 
      color: '#ffffff',
      p: 3
    }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4,
          pt: 2
        }}>
          <Typography variant="h4" sx={{ 
            color: '#ffffff', 
            fontWeight: 600,
            fontSize: '2rem'
          }}>
            Admin Dashboard
          </Typography>
          <Box sx={{ position: 'relative' }}>
            <IconButton
              onClick={handleMenuClick}
              sx={{ 
                p: 0,
                '&:hover': { bgcolor: 'rgba(0, 212, 170, 0.1)' }
              }}
            >
              <Avatar sx={{ 
                bgcolor: '#1a2332', 
                border: '2px solid #00d4aa',
                width: 48,
                height: 48
              }}>
                <AdminIcon sx={{ color: '#00d4aa' }} />
              </Avatar>
            </IconButton>
            
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              onClick={handleMenuClose}
              PaperProps={{
                elevation: 8,
                sx: {
                  bgcolor: '#1a2332',
                  border: '1px solid #2d3748',
                  minWidth: 200,
                  '& .MuiMenuItem-root': {
                    color: '#ffffff',
                    '&:hover': {
                      bgcolor: 'rgba(0, 212, 170, 0.1)'
                    }
                  }
                }
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => handleNavigation('/')}>  
                <ListItemIcon>
                  <HomeIcon sx={{ color: '#00d4aa' }} />
                </ListItemIcon>
                <ListItemText>Home</ListItemText>
              </MenuItem>
              
              <MenuItem onClick={() => handleNavigation('/admin')}>
                <ListItemIcon>
                  <AdminIcon sx={{ color: '#00d4aa' }} />
                </ListItemIcon>
                <ListItemText>Admin Dashboard</ListItemText>
              </MenuItem>
              
              <Divider sx={{ bgcolor: '#2d3748' }} />
              
              <MenuItem onClick={() => handleNavigation('/settings')}>
                <ListItemIcon>
                  <SettingsIcon sx={{ color: '#00d4aa' }} />
                </ListItemIcon>
                <ListItemText>Settings</ListItemText>
              </MenuItem>
              
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon sx={{ color: '#ff6b6b' }} />
                </ListItemIcon>
                <ListItemText sx={{ color: '#ff6b6b' }}>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, bgcolor: '#2d1b1b', color: '#ffcdd2' }}>
            {error}
          </Alert>
        )}
        
        {/* Main Grid - Same layout as UserDashboard */}
        <Grid container spacing={3}>
          {/* Row 1: Admin Stats Cards */}
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              bgcolor: '#1a2332', 
              border: '1px solid #2d3748',
              height: '200px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <CardContent sx={{ flex: 1, p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ApprovalIcon sx={{ color: '#00d4aa', mr: 1, fontSize: 24 }} />
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                    Project Approvals
                  </Typography>
                </Box>
                
                <Typography variant="h3" sx={{ color: '#00d4aa', fontWeight: 700, mb: 1 }}>
                  {pendingProjects.length}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                  Pending Approval
                </Typography>
                <Box sx={{ mt: 2, position: 'relative', height: 60 }}>
                  <Box sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '40px',
                    background: 'linear-gradient(to right, transparent, rgba(255, 167, 38, 0.2))',
                    borderRadius: '4px'
                  }} />
                  <PendingIcon sx={{ 
                    position: 'absolute', 
                    right: 0, 
                    bottom: 10, 
                    color: '#ffa726', 
                    fontSize: 20 
                  }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ 
              bgcolor: '#1a2332', 
              border: '1px solid #2d3748',
              height: '200px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <CardContent sx={{ flex: 1, p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <UsersIcon sx={{ color: '#00d4aa', mr: 1, fontSize: 24 }} />
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                    Platform Users
                  </Typography>
                </Box>
                
                <Typography variant="h3" sx={{ color: '#00d4aa', fontWeight: 700, mb: 1 }}>
                  {allUsers.length}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                  {adminUsers} Admins • {regularUsers} Users
                </Typography>
                <Box sx={{ mt: 2, position: 'relative', height: 60 }}>
                  <Box sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '40px',
                    background: 'linear-gradient(to right, transparent, rgba(0, 212, 170, 0.2))',
                    borderRadius: '4px'
                  }} />
                  <TrendingUpIcon sx={{ 
                    position: 'absolute', 
                    right: 0, 
                    bottom: 10, 
                    color: '#00d4aa', 
                    fontSize: 20 
                  }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ 
              bgcolor: '#1a2332', 
              border: '1px solid #2d3748',
              height: '200px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <CardContent sx={{ flex: 1, p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TokenIcon sx={{ color: '#00d4aa', mr: 1, fontSize: 24 }} />
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                    Carbon Credits Issued
                  </Typography>
                </Box>
                
                <Typography variant="h3" sx={{ color: '#00d4aa', fontWeight: 700, mb: 1 }}>
                  {totalCredits.toLocaleString()} CCRs
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                  From {tokens.length} token batches
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Row 2: Recent Pending Projects, Recent Approved Projects */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              bgcolor: '#1a2332', 
              border: '1px solid #2d3748',
              height: '400px'
            }}>
              <CardContent sx={{ p: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <PendingIcon sx={{ color: '#ffa726', mr: 1, fontSize: 24 }} />
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                    Pending Projects ({allProjects.filter(p => p.status === 'pending').length})
                  </Typography>
                </Box>
                
                {pendingProjects.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#a0aec0', textAlign: 'center', mt: 4 }}>
                    No pending projects
                  </Typography>
                ) : (
                  <Box sx={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {pendingProjects.slice(0, 6).map((project, index) => (
                      <Box key={project.id} sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        py: 2,
                        borderBottom: index < 5 ? '1px solid #2d3748' : 'none'
                      }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                            {project.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#a0aec0' }}>
                            {project.description?.slice(0, 50)}...
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', color: '#a0aec0' }}>
                            Credits: {project.estimated_credits}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button 
                            size="small" 
                            variant="contained"
                            onClick={() => handleApproveProject(project.id)}
                            sx={{ 
                              bgcolor: '#00d4aa',
                              color: '#ffffff',
                              fontSize: '0.75rem',
                              minWidth: 'auto',
                              px: 2,
                              '&:hover': { bgcolor: '#00b899' }
                            }}
                          >
                            <CheckIcon fontSize="small" />
                          </Button>
                          <Button 
                            size="small" 
                            variant="outlined"
                            onClick={() => handleRejectProject(project.id, 'Admin rejected')}
                            sx={{ 
                              color: '#ff4444',
                              borderColor: '#ff4444',
                              fontSize: '0.75rem',
                              minWidth: 'auto',
                              px: 2,
                              '&:hover': { bgcolor: 'rgba(255, 68, 68, 0.1)', borderColor: '#ff4444' }
                            }}
                          >
                            <CloseIcon fontSize="small" />
                          </Button>
                          <Button 
                            size="small" 
                            onClick={() => handleOpenEditProjectDialog(project)}
                            sx={{ 
                              color: '#00d4aa',
                              minWidth: 'auto',
                              px: 1
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </Button>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ 
              bgcolor: '#1a2332', 
              border: '1px solid #2d3748',
              height: '400px'
            }}>
              <CardContent sx={{ p: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <UsersIcon sx={{ color: '#2196f3', mr: 1, fontSize: 24 }} />
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                    Platform Users ({allUsers.length})
                  </Typography>
                </Box>
                
                <Box sx={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {allUsers.slice(0, 6).map((user, index) => (
                    <Box key={user.id} sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      py: 2,
                      borderBottom: index < 5 ? '1px solid #2d3748' : 'none'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <Avatar sx={{ 
                          bgcolor: user.is_blocked ? '#ff4444' : '#00d4aa', 
                          width: 32, 
                          height: 32,
                          mr: 2
                        }}>
                          {user.is_blocked ? <BlockIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                            {user.full_name || user.email}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label={user.role} 
                              size="small" 
                              sx={{ 
                                bgcolor: user.role === 'admin' ? '#00d4aa' : '#2d3748',
                                color: '#ffffff',
                                fontSize: '0.7rem',
                                height: '20px'
                              }} 
                            />
                            {user.is_blocked && (
                              <Chip 
                                label="Blocked" 
                                size="small" 
                                sx={{ 
                                  bgcolor: '#ff4444',
                                  color: '#ffffff',
                                  fontSize: '0.7rem',
                                  height: '20px'
                                }} 
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                          size="small" 
                          onClick={() => handleOpenEditUserDialog(user)}
                          sx={{ color: '#00d4aa', minWidth: 'auto', px: 1 }}
                        >
                          <EditIcon fontSize="small" />
                        </Button>
                        <Button 
                          size="small" 
                          onClick={() => handleOpenBlockDialog(user)}
                          sx={{ color: user.is_blocked ? '#ff8800' : '#ff4444', minWidth: 'auto', px: 1 }}
                        >
                          {user.is_blocked ? <CheckIcon fontSize="small" /> : <BlockIcon fontSize="small" />}
                        </Button>
                        <Button 
                          size="small" 
                          onClick={() => handleOpenDeleteDialog('user', user)}
                          sx={{ color: '#ff4444', minWidth: 'auto', px: 1 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Row 3: Token Management & Audit Logs */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              bgcolor: '#1a2332', 
              border: '1px solid #2d3748',
              height: '400px'
            }}>
              <CardContent sx={{ p: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Token sx={{ color: '#00d4aa', mr: 1, fontSize: 24 }} />
                    <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                      Token Transactions ({tokens.length})
                    </Typography>
                  </Box>
                  <Button 
                    variant="contained"
                    size="small"
                    onClick={() => setOpenMintDialog(true)}
                    sx={{ 
                      bgcolor: '#00d4aa',
                      color: '#ffffff',
                      '&:hover': { bgcolor: '#00b899' }
                    }}
                  >
                    <Token sx={{ mr: 1, fontSize: 16 }} />
                    Mint
                  </Button>
                </Box>
                
                <Box sx={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {tokens.slice(0, 6).map((token, index) => {
                    const project = projects.find(p => p.id === token.project_id);
                    return (
                      <Box key={token.id} sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        py: 2,
                        borderBottom: index < 5 ? '1px solid #2d3748' : 'none'
                      }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                            {token.amount} Credits
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#a0aec0' }}>
                            {project?.title || 'Unknown Project'}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip 
                              label={token.transaction_type} 
                              size="small" 
                              sx={{ 
                                bgcolor: token.transaction_type === 'mint' ? '#00d4aa' : '#ff8800',
                                color: '#ffffff',
                                fontSize: '0.7rem',
                                height: '20px'
                              }} 
                            />
                            {token.status === 'burned' && (
                              <Chip 
                                label="Burned" 
                                size="small" 
                                sx={{ 
                                  bgcolor: '#ff4444',
                                  color: '#ffffff',
                                  fontSize: '0.7rem',
                                  height: '20px'
                                }} 
                              />
                            )}
                          </Box>
                        </Box>
                        {token.status !== 'burned' && (
                          <Button 
                            size="small" 
                            onClick={() => handleBurnTokens(token.id, token.amount)}
                            sx={{ color: '#ff4444', minWidth: 'auto', px: 1 }}
                          >
                            <DeleteIcon fontSize="small" />
                          </Button>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ 
              bgcolor: '#1a2332', 
              border: '1px solid #2d3748',
              height: '400px'
            }}>
              <CardContent sx={{ p: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <HistoryIcon sx={{ color: '#9c27b0', mr: 1, fontSize: 24 }} />
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                    Admin Activity Logs ({adminLogs.length})
                  </Typography>
                </Box>
                
                <Box sx={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {adminLogs.slice(0, 8).map((log, index) => (
                    <Box key={index} sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      py: 1.5,
                      borderBottom: index < 7 ? '1px solid #2d3748' : 'none'
                    }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600, fontSize: '0.85rem' }}>
                          {log.action.replace('_', ' ').toUpperCase()}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#a0aec0', display: 'block' }}>
                          {log.details?.slice(0, 40)}...
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#a0aec0' }}>
                          {formatDate(log.created_at)}
                        </Typography>
                      </Box>
                      <Chip 
                        label={log.target_type} 
                        size="small" 
                        sx={{ 
                          bgcolor: '#2d3748',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          height: '20px'
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Row 4: Admin Quick Actions */}
          <Grid item xs={12}>
            <Card sx={{ 
              bgcolor: '#1a2332', 
              border: '1px solid #2d3748'
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AdminIcon sx={{ color: '#00d4aa', mr: 1, fontSize: 24 }} />
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                    Admin Quick Actions
                  </Typography>
                </Box>
                
                <Typography variant="body2" sx={{ color: '#a0aec0', mb: 3 }}>
                  Manage the carbon credit platform with these administrative tools.
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button 
                      variant="contained"
                      fullWidth
                      startIcon={<PendingIcon />}
                      onClick={() => console.log('Review pending projects')}
                      sx={{ 
                        bgcolor: '#ffa726',
                        color: '#ffffff',
                        py: 2,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: 600,
                        '&:hover': { 
                          bgcolor: '#ff9800'
                        }
                      }}
                    >
                      Review Pending ({pendingProjects.length})
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Button 
                      variant="contained"
                      fullWidth
                      startIcon={<UsersIcon />}
                      sx={{ 
                        bgcolor: '#2196f3',
                        color: '#ffffff',
                        py: 2,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: 600,
                        '&:hover': { 
                          bgcolor: '#1976d2'
                        }
                      }}
                    >
                      Manage Users ({allUsers.length})
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Button 
                      variant="contained"
                      fullWidth
                      startIcon={<Token />}
                      onClick={() => setOpenMintDialog(true)}
                      sx={{ 
                        bgcolor: '#00d4aa',
                        color: '#ffffff',
                        py: 2,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: 600,
                        '&:hover': { 
                          bgcolor: '#00b899'
                        }
                      }}
                    >
                      Mint Tokens ({tokens.length})
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Button 
                      variant="contained"
                      fullWidth
                      startIcon={<HistoryIcon />}
                      sx={{ 
                        bgcolor: '#9c27b0',
                        color: '#ffffff',
                        py: 2,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: 600,
                        '&:hover': { 
                          bgcolor: '#7b1fa2'
                        }
                      }}
                    >
                      Audit Logs ({adminLogs.length})
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
      
      {/* Token Minting Dialog */}
      <Dialog
        open={openMintDialog}
        onClose={() => setOpenMintDialog(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1a2332',
            border: '1px solid #2d3748',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ color: '#ffffff', borderBottom: '1px solid #2d3748' }}>
          Mint Tokens to Project
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: '#00d4aa' }}>Select Project</InputLabel>
            <Select
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const project = projects.find(p => p.id === e.target.value);
                setSelectedProject(project);
              }}
              sx={{
                color: '#ffffff',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2d3748'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#00d4aa'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#00d4aa'
                }
              }}
            >
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id} sx={{ color: '#ffffff' }}>
                  {project.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Recipient Wallet Address"
            value={recipientWallet}
            onChange={(e) => setRecipientWallet(e.target.value)}
            placeholder="Enter wallet address"
            sx={{
              mb: 2,
              '& .MuiInputLabel-root': { color: '#00d4aa' },
              '& .MuiOutlinedInput-root': {
                color: '#ffffff',
                '& fieldset': { borderColor: '#2d3748' },
                '&:hover fieldset': { borderColor: '#00d4aa' },
                '&.Mui-focused fieldset': { borderColor: '#00d4aa' }
              }
            }}
          />
          
          <TextField
            fullWidth
            label="Amount to Mint"
            type="number"
            value={mintAmount}
            onChange={(e) => setMintAmount(e.target.value)}
            placeholder="Enter amount"
            sx={{
              '& .MuiInputLabel-root': { color: '#00d4aa' },
              '& .MuiOutlinedInput-root': {
                color: '#ffffff',
                '& fieldset': { borderColor: '#2d3748' },
                '&:hover fieldset': { borderColor: '#00d4aa' },
                '&.Mui-focused fieldset': { borderColor: '#00d4aa' }
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #2d3748' }}>
          <Button 
            onClick={() => setOpenMintDialog(false)}
            sx={{ color: '#ffffff' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMintTokens}
            variant="contained"
            disabled={mintLoading}
            sx={{
              bgcolor: '#00d4aa',
              color: '#ffffff',
              '&:hover': { bgcolor: '#00b894' }
            }}
          >
            {mintLoading ? 'Minting...' : 'Mint Tokens'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={openEditUserDialog}
        onClose={() => setOpenEditUserDialog(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1a2332',
            border: '1px solid #2d3748',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ color: '#ffffff', borderBottom: '1px solid #2d3748' }}>
          Edit User
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="Full Name"
            value={editUserData.full_name}
            onChange={(e) => setEditUserData({...editUserData, full_name: e.target.value})}
            sx={{
              mb: 2,
              '& .MuiInputLabel-root': { color: '#00d4aa' },
              '& .MuiOutlinedInput-root': {
                color: '#ffffff',
                '& fieldset': { borderColor: '#2d3748' },
                '&:hover fieldset': { borderColor: '#00d4aa' },
                '&.Mui-focused fieldset': { borderColor: '#00d4aa' }
              }
            }}
          />
          <TextField
            fullWidth
            label="Email"
            value={editUserData.email}
            onChange={(e) => setEditUserData({...editUserData, email: e.target.value})}
            sx={{
              mb: 2,
              '& .MuiInputLabel-root': { color: '#00d4aa' },
              '& .MuiOutlinedInput-root': {
                color: '#ffffff',
                '& fieldset': { borderColor: '#2d3748' },
                '&:hover fieldset': { borderColor: '#00d4aa' },
                '&.Mui-focused fieldset': { borderColor: '#00d4aa' }
              }
            }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: '#00d4aa' }}>Role</InputLabel>
            <Select
              value={editUserData.role}
              onChange={(e) => setEditUserData({...editUserData, role: e.target.value})}
              sx={{
                color: '#ffffff',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2d3748'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#00d4aa'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#00d4aa'
                }
              }}
            >
              <MenuItem value="user" sx={{ color: '#ffffff' }}>User</MenuItem>
              <MenuItem value="admin" sx={{ color: '#ffffff' }}>Admin</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Wallet Address"
            value={editUserData.wallet_address}
            onChange={(e) => setEditUserData({...editUserData, wallet_address: e.target.value})}
            sx={{
              '& .MuiInputLabel-root': { color: '#00d4aa' },
              '& .MuiOutlinedInput-root': {
                color: '#ffffff',
                '& fieldset': { borderColor: '#2d3748' },
                '&:hover fieldset': { borderColor: '#00d4aa' },
                '&.Mui-focused fieldset': { borderColor: '#00d4aa' }
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #2d3748' }}>
          <Button onClick={() => setOpenEditUserDialog(false)} sx={{ color: '#ffffff' }}>
            Cancel
          </Button>
          <Button
            onClick={() => handleEditUser(selectedUser?.id, editUserData)}
            variant="contained"
            sx={{
              bgcolor: '#00d4aa',
              color: '#ffffff',
              '&:hover': { bgcolor: '#00b894' }
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Block User Dialog */}
      <Dialog
        open={openBlockUserDialog}
        onClose={() => setOpenBlockUserDialog(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1a2332',
            border: '1px solid #2d3748',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ color: '#ffffff', borderBottom: '1px solid #2d3748' }}>
          {selectedUser?.is_blocked ? 'Unblock User' : 'Block User'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography sx={{ color: '#a0a9ba', mb: 2 }}>
            {selectedUser?.is_blocked 
              ? `Unblock ${selectedUser?.full_name || selectedUser?.email}?`
              : `Block ${selectedUser?.full_name || selectedUser?.email}?`
            }
          </Typography>
          {!selectedUser?.is_blocked && (
            <TextField
              fullWidth
              label="Block Reason"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              multiline
              rows={3}
              sx={{
                '& .MuiInputLabel-root': { color: '#00d4aa' },
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  '& fieldset': { borderColor: '#2d3748' },
                  '&:hover fieldset': { borderColor: '#00d4aa' },
                  '&.Mui-focused fieldset': { borderColor: '#00d4aa' }
                }
              }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #2d3748' }}>
          <Button onClick={() => setOpenBlockUserDialog(false)} sx={{ color: '#ffffff' }}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (selectedUser?.is_blocked) {
                handleUnblockUser(selectedUser.id);
              } else {
                handleBlockUser(selectedUser.id, blockReason);
              }
            }}
            variant="contained"
            sx={{
              bgcolor: selectedUser?.is_blocked ? '#00d4aa' : '#ff4444',
              color: '#ffffff',
              '&:hover': { bgcolor: selectedUser?.is_blocked ? '#00b894' : '#cc0000' }
            }}
          >
            {selectedUser?.is_blocked ? 'Unblock' : 'Block'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog
        open={openEditProjectDialog}
        onClose={() => setOpenEditProjectDialog(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1a2332',
            border: '1px solid #2d3748',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ color: '#ffffff', borderBottom: '1px solid #2d3748' }}>
          Edit Project
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="Title"
            value={editProjectData.title}
            onChange={(e) => setEditProjectData({...editProjectData, title: e.target.value})}
            sx={{
              mb: 2,
              '& .MuiInputLabel-root': { color: '#00d4aa' },
              '& .MuiOutlinedInput-root': {
                color: '#ffffff',
                '& fieldset': { borderColor: '#2d3748' },
                '&:hover fieldset': { borderColor: '#00d4aa' },
                '&.Mui-focused fieldset': { borderColor: '#00d4aa' }
              }
            }}
          />
          <TextField
            fullWidth
            label="Description"
            value={editProjectData.description}
            onChange={(e) => setEditProjectData({...editProjectData, description: e.target.value})}
            multiline
            rows={3}
            sx={{
              mb: 2,
              '& .MuiInputLabel-root': { color: '#00d4aa' },
              '& .MuiOutlinedInput-root': {
                color: '#ffffff',
                '& fieldset': { borderColor: '#2d3748' },
                '&:hover fieldset': { borderColor: '#00d4aa' },
                '&.Mui-focused fieldset': { borderColor: '#00d4aa' }
              }
            }}
          />
          <TextField
            fullWidth
            label="Location"
            value={editProjectData.location}
            onChange={(e) => setEditProjectData({...editProjectData, location: e.target.value})}
            sx={{
              mb: 2,
              '& .MuiInputLabel-root': { color: '#00d4aa' },
              '& .MuiOutlinedInput-root': {
                color: '#ffffff',
                '& fieldset': { borderColor: '#2d3748' },
                '&:hover fieldset': { borderColor: '#00d4aa' },
                '&.Mui-focused fieldset': { borderColor: '#00d4aa' }
              }
            }}
          />
          <TextField
            fullWidth
            label="Estimated Credits"
            type="number"
            value={editProjectData.estimated_credits}
            onChange={(e) => setEditProjectData({...editProjectData, estimated_credits: e.target.value})}
            sx={{
              mb: 2,
              '& .MuiInputLabel-root': { color: '#00d4aa' },
              '& .MuiOutlinedInput-root': {
                color: '#ffffff',
                '& fieldset': { borderColor: '#2d3748' },
                '&:hover fieldset': { borderColor: '#00d4aa' },
                '&.Mui-focused fieldset': { borderColor: '#00d4aa' }
              }
            }}
          />
          <FormControl fullWidth>
            <InputLabel sx={{ color: '#00d4aa' }}>Status</InputLabel>
            <Select
              value={editProjectData.status}
              onChange={(e) => setEditProjectData({...editProjectData, status: e.target.value})}
              sx={{
                color: '#ffffff',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2d3748'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#00d4aa'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#00d4aa'
                }
              }}
            >
              <MenuItem value="pending" sx={{ color: '#ffffff' }}>Pending</MenuItem>
              <MenuItem value="approved" sx={{ color: '#ffffff' }}>Approved</MenuItem>
              <MenuItem value="rejected" sx={{ color: '#ffffff' }}>Rejected</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #2d3748' }}>
          <Button onClick={() => setOpenEditProjectDialog(false)} sx={{ color: '#ffffff' }}>
            Cancel
          </Button>
          <Button
            onClick={() => handleEditProject(selectedProject?.id, editProjectData)}
            variant="contained"
            sx={{
              bgcolor: '#00d4aa',
              color: '#ffffff',
              '&:hover': { bgcolor: '#00b894' }
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1a2332',
            border: '1px solid #2d3748',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ color: '#ffffff', borderBottom: '1px solid #2d3748' }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography sx={{ color: '#a0a9ba' }}>
            Are you sure you want to delete this {selectedUser ? 'user' : 'project'}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #2d3748' }}>
          <Button onClick={() => setOpenDeleteDialog(false)} sx={{ color: '#ffffff' }}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (selectedUser) {
                handleDeleteUser(selectedUser.id);
              } else if (selectedProject) {
                handleDeleteProject(selectedProject.id);
              }
            }}
            variant="contained"
            sx={{
              bgcolor: '#ff4444',
              color: '#ffffff',
              '&:hover': { bgcolor: '#cc0000' }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminDashboard;