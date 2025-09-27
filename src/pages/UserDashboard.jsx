import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { normalizeProject, getProjectDisplayValues, validateForCarbonCalculation } from '../utils/projectColumnMapping';
import { calculateProjectCredits } from '../utils/carbonCreditCalculator';
import { 
  Box, Container, Typography, Grid, CircularProgress, Alert, Card, CardContent, Avatar,
  IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider,
  Chip, Snackbar, Button, Stack, AppBar, Toolbar, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, Badge, Skeleton, Tooltip, Dialog, DialogActions, 
  DialogContent, DialogContentText, DialogTitle, TextField
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as TokenIcon,
  Logout as LogoutIcon,
  Home as HomeIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  Nature as EcoIcon,
  AccountBalanceWallet as WalletIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  AdminPanelSettings as AdminIcon,
  Calculate as CalculateIcon,
  Schedule as PendingIcon,
  Token,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Verified as VerifiedIcon
} from '@mui/icons-material';
import ProjectDetailDialog from '../components/ProjectDetailDialog';
import CarbonCreditCalculatorDialog from '../components/CarbonCreditCalculatorDialog';
import ConnectWallet from '../components/ConnectWallet_New';

const UserDashboard = () => {
  const navigate = useNavigate();
  
  // Main state
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data state
  const [dashboardStats, setDashboardStats] = useState({
    totalProjects: 0,
    pendingProjects: 0,
    approvedProjects: 0,
    rejectedProjects: 0,
    totalCredits: 0,
    mintedCredits: 0,
    estimatedValue: 0
  });
  
  const [userProjects, setUserProjects] = useState([]);
  const [userTokens, setUserTokens] = useState([]);
  
  // Loading states
  const [dataLoading, setDataLoading] = useState({
    projects: false,
    tokens: false,
    stats: false,
    profile: false
  });
  
  // Error states
  const [dataErrors, setDataErrors] = useState({
    projects: null,
    tokens: null,
    stats: null,
    profile: null
  });
  
  // UI states
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'info' 
  });
  
  // Dialog states
  const [projectDetailDialog, setProjectDetailDialog] = useState({ open: false, project: null });
  const [calculatorDialog, setCalculatorDialog] = useState({ open: false, project: null });
  const [walletDialog, setWalletDialog] = useState({ open: false });
  const [walletAddress, setWalletAddress] = useState('');
  
  // Utility functions
  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);
  
  const closeSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);
  
  const setLoadingState = useCallback((section, isLoading) => {
    setDataLoading(prev => ({ ...prev, [section]: isLoading }));
  }, []);
  
  const setErrorState = useCallback((section, error) => {
    setDataErrors(prev => ({ ...prev, [section]: error }));
  }, []);
  
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);


  // Fetch user's projects
  const fetchUserProjects = useCallback(async (userId) => {
    if (!userId) return;
    
    setLoadingState('projects', true);
    setErrorState('projects', null);
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, title, name, description, location, project_type, ecosystem_type,
          area, project_area, estimated_credits, calculated_credits, 
          status, review_notes, carbon_data, methodology, verification_standard,
          user_id, submitted_by_user, reviewed_by, reviewed_at, 
          approved_by, approved_at, calculation_timestamp, verification_date,
          organization_name, organization_email, contact_phone, contact_email,
          wallet_address, mint_address, credits_issued, credits_retired,
          project_start_date, project_end_date, tags,
          created_at, updated_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Normalize projects and calculate estimated credits where missing
      const normalizedProjects = (data || []).map(project => {
        const normalized = normalizeProject(project);
        
        // Calculate estimated credits if missing but carbon data is available
        if (!normalized.estimated_credits && normalized.carbon_data && normalized.project_area) {
          const validation = validateForCarbonCalculation(normalized);
          if (validation.isValid) {
            try {
              const calculation = calculateProjectCredits(normalized.carbon_data, normalized.project_area);
              if (calculation) {
                normalized.estimated_credits = calculation.totalCarbonCredits;
                
                // Update the database with estimated credits (async)
                supabase
                  .from('projects')
                  .update({ estimated_credits: calculation.totalCarbonCredits })
                  .eq('id', normalized.id)
                  .then(({ error }) => {
                    // Silently handle update errors
                  });
              }
            } catch (calcError) {
              // Silently handle calculation errors
            }
          }
        }
        
        return getProjectDisplayValues(normalized);
      });
      
      setUserProjects(normalizedProjects);
      
    } catch (error) {
      const errorMessage = error.code === '42P01'
        ? 'Projects table not found. Please contact system administrator.'
        : `Failed to fetch projects: ${error.message}`;
      setErrorState('projects', errorMessage);
      setUserProjects([]);
    } finally {
      setLoadingState('projects', false);
    }
  }, [setLoadingState, setErrorState]);

  // Fetch user's tokens
  const fetchUserTokens = useCallback(async (userId) => {
    if (!userId) return;
    
    setLoadingState('tokens', true);
    setErrorState('tokens', null);
    
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select(`
          id, mint, project_id, recipient, amount, decimals,
          minted_tx, token_standard, token_symbol, token_name,
          status, retired_at, retirement_reason, created_at,
          projects:project_id (
            title, name, description, user_id
          )
        `)
        .eq('projects.user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error && error.code !== '42P01') throw error;
      
      const userTokens = (data || []).filter(token => 
        token.projects && token.projects.user_id === userId
      );
      
      setUserTokens(userTokens);
      
    } catch (error) {
      const errorMessage = error.code === '42P01'
        ? 'Token system not available yet.'
        : `Failed to fetch tokens: ${error.message}`;
      setErrorState('tokens', errorMessage);
      setUserTokens([]);
    } finally {
      setLoadingState('tokens', false);
    }
  }, [setLoadingState, setErrorState]);

  // Calculate dashboard statistics
  const calculateDashboardStats = useCallback(() => {
    const projects = userProjects || [];
    const tokens = userTokens || [];
    
    const totalProjects = projects.length;
    const pendingProjects = projects.filter(p => p.status === 'pending').length;
    const approvedProjects = projects.filter(p => p.status === 'approved').length;
    const rejectedProjects = projects.filter(p => p.status === 'rejected').length;
    
    // Calculate total potential credits from projects
    const totalCredits = projects.reduce((sum, project) => {
      return sum + (project.calculated_credits || project.estimated_credits || 0);
    }, 0);
    
    // Calculate minted credits from tokens
    const mintedCredits = tokens.reduce((sum, token) => {
      return sum + (token.amount || 0);
    }, 0);
    
    // Estimate value (example: $10 per credit)
    const estimatedValue = mintedCredits * 10;
    
    const stats = {
      totalProjects,
      pendingProjects,
      approvedProjects,
      rejectedProjects,
      totalCredits,
      mintedCredits,
      estimatedValue
    };
    
    setDashboardStats(stats);
  }, [userProjects, userTokens]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      await Promise.allSettled([
        fetchUserProjects(user.id),
        fetchUserTokens(user.id)
      ]);
      showSnackbar('Dashboard refreshed successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to refresh dashboard', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [user, fetchUserProjects, fetchUserTokens, showSnackbar]);

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      setLoading(true);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          showSnackbar('Authentication error occurred', 'error');
          navigate('/login');
          return;
        }
        
        if (!session) {
          navigate('/login');
          return;
        }
        
        setUser(session.user);
        
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profileError) {
          showSnackbar('Failed to load user profile', 'error');
          return;
        }
        
        setUserProfile(profile);
        
        // Fetch data after user is set
        await Promise.allSettled([
          fetchUserProjects(session.user.id),
          fetchUserTokens(session.user.id)
        ]);
        
      } catch (error) {
        showSnackbar('Failed to initialize dashboard', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    initializeDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, showSnackbar]); // Only depend on stable functions

  // Calculate stats when data changes
  useEffect(() => {
    calculateDashboardStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProjects, userTokens]); // Only depend on the actual data

  // Navigation handlers
  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      showSnackbar('Error logging out', 'error');
    }
  }, [navigate, showSnackbar]);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleTabChange = useCallback((event, newValue) => {
    setCurrentTab(newValue);
  }, []);

  // Project handlers
  const handleProjectView = useCallback((project) => {
    setProjectDetailDialog({ open: true, project });
  }, []);

  const handleProjectCalculate = useCallback((project) => {
    setCalculatorDialog({ open: true, project });
  }, []);

  const handleDialogClose = useCallback((dialogType) => {
    if (dialogType === 'detail') {
      setProjectDetailDialog({ open: false, project: null });
    } else if (dialogType === 'calculator') {
      setCalculatorDialog({ open: false, project: null });
    } else if (dialogType === 'wallet') {
      setWalletDialog({ open: false });
    }
  }, []);

  // Wallet connection handler
  const handleWalletConnect = useCallback(async () => {
    if (!walletAddress.trim()) {
      showSnackbar('Please enter a valid wallet address', 'error');
      return;
    }
    
    // Solana wallet address validation
    const walletRegex = /^[A-Za-z0-9]{32,44}$/;
    if (!walletRegex.test(walletAddress.trim())) {
      showSnackbar('Invalid wallet address format', 'error');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ wallet_address: walletAddress.trim() })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setUserProfile(prev => ({ ...prev, wallet_address: walletAddress.trim() }));
      setWalletDialog({ open: false });
      setWalletAddress('');
      showSnackbar('Wallet address connected successfully!', 'success');
    } catch (error) {
      showSnackbar(`Failed to connect wallet: ${error.message}`, 'error');
    }
  }, [walletAddress, user, showSnackbar]);

  // Loading screen
  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: '#0a0f1c', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={60} sx={{ color: '#94a3b8' }} />
          <Typography variant="h6" sx={{ color: '#ffffff' }}>
            Loading Dashboard...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0f1c' }}>
      {/* Modern App Bar */}
      <AppBar position="sticky" sx={{ 
        bgcolor: 'rgba(26, 35, 50, 0.95)', 
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #2d3748'
      }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar sx={{ bgcolor: '#00d4aa' }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                Carbon Credits Dashboard
              </Typography>
              <Typography variant="caption" sx={{ color: '#a0aec0' }}>
                Welcome back, {userProfile?.full_name || user?.email}
              </Typography>
            </Box>
          </Stack>
          
          <Stack direction="row" spacing={2} alignItems="center">            
            <Tooltip title="Create New Project">
              <IconButton 
                onClick={() => navigate('/submit-project')} 
                sx={{ color: '#00d4aa' }}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Refresh Dashboard">
              <IconButton 
                onClick={refreshAllData} 
                disabled={refreshing}
                sx={{ color: '#00d4aa' }}
              >
                {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
            
            <Badge badgeContent={dashboardStats.pendingProjects} color="warning">
              <IconButton sx={{ color: '#ffffff' }}>
                <DashboardIcon />
              </IconButton>
            </Badge>
            
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ color: '#ffffff' }}
            >
              <MoreVertIcon />
            </IconButton>
            
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
              <MenuItem onClick={() => navigate('/')}>
                <ListItemIcon><HomeIcon sx={{ color: '#94a3b8' }} /></ListItemIcon>
                <ListItemText>Home</ListItemText>
              </MenuItem>
              {userProfile?.role === 'admin' && (
                <MenuItem onClick={() => navigate('/admin')}>
                  <ListItemIcon><AdminIcon sx={{ color: '#94a3b8' }} /></ListItemIcon>
                  <ListItemText>Admin Dashboard</ListItemText>
                </MenuItem>
              )}
              <MenuItem onClick={() => setWalletDialog({ open: true })}>
                <ListItemIcon><WalletIcon sx={{ color: '#94a3b8' }} /></ListItemIcon>
                <ListItemText>Connect Wallet</ListItemText>
              </MenuItem>
              <Divider sx={{ bgcolor: '#2d3748' }} />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon><LogoutIcon sx={{ color: '#ff6b6b' }} /></ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Dashboard Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Total Projects */}
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Total Projects"
              value={dashboardStats.totalProjects}
              icon={<EcoIcon />}
              color="#2196f3"
              loading={dataLoading.projects}
              error={dataErrors.projects}
            />
          </Grid>
          
          {/* Pending Projects */}
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Pending Review"
              value={dashboardStats.pendingProjects}
              subtitle={`${dashboardStats.approvedProjects} approved`}
              icon={<PendingIcon />}
              color="#ffa726"
              loading={dataLoading.projects}
              error={dataErrors.projects}
            />
          </Grid>
          
          {/* Total Credits */}
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Potential Credits"
              value={`${Math.floor(dashboardStats.totalCredits).toLocaleString()} CCR`}
              subtitle={`${Math.floor(dashboardStats.mintedCredits).toLocaleString()} minted`}
              icon={<TokenIcon />}
              color="#00d4aa"
              loading={dataLoading.tokens}
              error={dataErrors.tokens}
            />
          </Grid>
          
          {/* Estimated Value */}
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Portfolio Value"
              value={`$${dashboardStats.estimatedValue.toLocaleString()}`}
              subtitle="Estimated"
              icon={<TrendingUpIcon />}
              color="#9c27b0"
              loading={dataLoading.tokens}
              error={dataErrors.tokens}
            />
          </Grid>
        </Grid>

        {/* Creative Welcome Banner */}
        <Card sx={{ 
          bgcolor: 'linear-gradient(135deg, #1a2332 0%, #0f2027 50%, #203a43 100%)', 
          border: '1px solid #2d3748', 
          mb: 4,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <Box sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(0,212,170,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            transform: 'translate(50%, -50%)'
          }} />
          <CardContent sx={{ p: 4, position: 'relative' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" sx={{ 
                  color: '#ffffff', 
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #00d4aa, #4fc3f7)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1
                }}>
                  🌱 Carbon Impact Dashboard
                </Typography>
                <Typography variant="h6" sx={{ color: '#a0aec0', mb: 2 }}>
                  Making a difference, one credit at a time
                </Typography>
                <Stack direction="row" spacing={3}>
                  <Chip 
                    icon={<EcoIcon />} 
                    label={`${dashboardStats.totalProjects} Projects`} 
                    sx={{ 
                      bgcolor: 'rgba(0,212,170,0.2)', 
                      color: '#00d4aa',
                      border: '1px solid #00d4aa'
                    }} 
                  />
                  <Chip 
                    icon={<Token />} 
                    label={`${Math.floor(dashboardStats.totalCredits).toLocaleString()} Credits`} 
                    sx={{ 
                      bgcolor: 'rgba(33,150,243,0.2)', 
                      color: '#2196f3',
                      border: '1px solid #2196f3'
                    }} 
                  />
                </Stack>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(45deg, #00d4aa, #4fc3f7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  animation: 'pulse 2s infinite'
                }}>
                  🌍
                </Box>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Card sx={{ bgcolor: '#1a2332', border: '1px solid #2d3748' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            sx={{
              borderBottom: '1px solid #2d3748',
              '& .MuiTab-root': { 
                color: '#a0aec0',
                '&.Mui-selected': { color: '#cbd5e1' }
              },
              '& .MuiTabs-indicator': { bgcolor: '#64748b' }
            }}
          >
            <Tab label="Overview" icon={<DashboardIcon />} />
            <Tab label="My Projects" icon={<EcoIcon />} />
            <Tab label="My Tokens" icon={<TokenIcon />} />
            <Tab label="Profile" icon={<PersonIcon />} />
          </Tabs>

          <CardContent sx={{ p: 3 }}>
            {currentTab === 0 && <OverviewTab dashboardStats={dashboardStats} userProfile={userProfile} formatDate={formatDate} />}
            {currentTab === 1 && <ProjectsTab dataLoading={dataLoading} dataErrors={dataErrors} userProjects={userProjects} navigate={navigate} handleProjectView={handleProjectView} handleProjectCalculate={handleProjectCalculate} formatDate={formatDate} />}
            {currentTab === 2 && <TokensTab dataLoading={dataLoading} dataErrors={dataErrors} userTokens={userTokens} formatDate={formatDate} showSnackbar={showSnackbar} />}
            {currentTab === 3 && <ProfileTab userProfile={userProfile} user={user} formatDate={formatDate} setWalletDialog={setWalletDialog} />}
          </CardContent>
        </Card>
      </Container>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={closeSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      
      {/* Wallet Connection Dialog */}
      <Dialog 
        open={walletDialog.open} 
        onClose={() => handleDialogClose('wallet')}
        PaperProps={{
          sx: {
            bgcolor: '#1a2332',
            color: '#ffffff',
            border: '1px solid #2d3748'
          }
        }}
      >
        <DialogTitle>Connect Wallet Address</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#a0aec0', mb: 2 }}>
            Enter your Solana wallet address to receive carbon credit tokens
          </DialogContentText>
          <TextField
            fullWidth
            placeholder="Enter Solana wallet address..."
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: '#0a0f1c',
                color: '#ffffff',
                '& fieldset': {
                  borderColor: '#2d3748'
                }
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleDialogClose('wallet')} sx={{ color: '#a0aec0' }}>
            Cancel
          </Button>
          <Button 
            onClick={handleWalletConnect} 
            sx={{ color: '#94a3b8' }}
            variant="outlined"
          >
            Connect Wallet
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Project Detail Dialog */}
      <ProjectDetailDialog
        open={projectDetailDialog.open}
        onClose={() => handleDialogClose('detail')}
        project={projectDetailDialog.project}
        onUpdate={(updatedProject) => {
          // Update the project in local state
          setUserProjects(prev => 
            prev.map(p => p.id === updatedProject.id ? updatedProject : p)
          );
          showSnackbar('Project updated successfully', 'success');
        }}
      />
      
      {/* Carbon Credit Calculator Dialog */}
      <CarbonCreditCalculatorDialog
        open={calculatorDialog.open}
        onClose={() => handleDialogClose('calculator')}
        project={calculatorDialog.project}
        onCreditCalculated={(credits) => {
          showSnackbar(`${credits} credits calculated!`, 'success');
          refreshAllData();
        }}
      />
    </Box>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, subtitle, icon, color, loading, error }) => {
    if (loading) {
      return (
        <Card sx={{ bgcolor: '#1a2332', border: '1px solid #2d3748', height: 140 }}>
          <CardContent>
            <Skeleton variant="rectangular" width="100%" height={100} />
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card sx={{ bgcolor: '#1a2332', border: '1px solid #2d3748', height: 140 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <ErrorIcon sx={{ color: '#ff6b6b' }} />
              <Typography variant="body2" sx={{ color: '#ff6b6b' }}>Error</Typography>
            </Stack>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card sx={{ 
        bgcolor: 'linear-gradient(135deg, #1a2332 0%, #243447 100%)', 
        border: '1px solid #2d3748',
        height: 160,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px) scale(1.02)',
          boxShadow: `0 10px 25px rgba(${color === '#00d4aa' ? '0,212,170' : color === '#2196f3' ? '33,150,243' : color === '#ffa726' ? '255,167,38' : '156,39,176'}, 0.3)`,
          border: `1px solid ${color}40`
        }
      }}>
        {/* Animated background particles */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 20% 50%, ${color}10 0%, transparent 50%)`,
          opacity: 0.6
        }} />
        
        {/* Floating decorative element */}
        <Box sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: `linear-gradient(45deg, ${color}30, transparent)`,
          animation: 'float 3s ease-in-out infinite'
        }} />
        
        <CardContent sx={{ position: 'relative', zIndex: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="body2" sx={{ 
                color: '#a0aec0', 
                mb: 1,
                fontWeight: 500,
                letterSpacing: 0.5
              }}>
                {title}
              </Typography>
              <Typography variant="h3" sx={{ 
                color: '#ffffff', 
                fontWeight: 700, 
                mb: 0.5,
                background: `linear-gradient(45deg, ${color}, ${color}80)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </Typography>
              {subtitle && (
                <Typography variant="caption" sx={{ 
                  color: '#a0aec0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}>
                  • {subtitle}
                </Typography>
              )}
            </Box>
            <Box sx={{
              p: 1.5,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${color}20, ${color}10)`,
              border: `1px solid ${color}30`,
              backdropFilter: 'blur(10px)'
            }}>
              <Box sx={{ color: color, fontSize: '1.75rem' }}>
                {icon}
              </Box>
            </Box>
          </Stack>
        </CardContent>
        
        {/* Enhanced decorative gradient with pulse effect */}
        <Box sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          background: `linear-gradient(90deg, ${color}60, ${color}, ${color}60)`,
          animation: 'glow 2s ease-in-out infinite alternate'
        }} />
      </Card>
    );
  };

// Tab Components
const OverviewTab = ({ dashboardStats, userProfile, formatDate }) => {
    return (
      <Box>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(45deg, #00d4aa, #4fc3f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem'
          }}>
            📈
          </Box>
          <Box>
            <Typography variant="h5" sx={{ 
              color: '#ffffff', 
              fontWeight: 700,
              background: 'linear-gradient(45deg, #00d4aa, #4fc3f7)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Environmental Impact Overview
            </Typography>
            <Typography variant="body2" sx={{ color: '#a0aec0' }}>
              Track your carbon credit journey and environmental contributions
            </Typography>
          </Box>
        </Stack>
        
        <Grid container spacing={3}>
          {/* Enhanced Project Portfolio */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)', 
              border: '1px solid #475569',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Box sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '150px',
                height: '150px',
                background: 'radial-gradient(circle, rgba(148,163,184,0.05) 0%, transparent 70%)',
                borderRadius: '50%',
                transform: 'translate(50%, -50%)'
              }} />
              <CardContent sx={{ position: 'relative' }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Avatar sx={{ 
                    bgcolor: 'rgba(148,163,184,0.2)', 
                    color: '#94a3b8',
                    border: '2px solid rgba(148,163,184,0.3)'
                  }}>
                    <EcoIcon />
                  </Avatar>
                  <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 600 }}>
                    🌱 Project Portfolio
                  </Typography>
                </Stack>
                
                <Stack spacing={3}>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    background: 'linear-gradient(135deg, rgba(148,163,184,0.1), rgba(148,163,184,0.05))',
                    border: '1px solid rgba(148,163,184,0.3)'
                  }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ color: '#94a3b8', fontWeight: 500 }}>Total Projects</Typography>
                      <Typography variant="h5" sx={{ color: '#cbd5e1', fontWeight: 700 }}>
                        {dashboardStats.totalProjects}
                      </Typography>
                    </Stack>
                  </Box>
                  
                  <Stack direction="row" spacing={2}>
                    <Box sx={{ 
                      flex: 1, 
                      p: 2, 
                      borderRadius: 2, 
                      background: 'linear-gradient(135deg, rgba(120,113,108,0.1), rgba(120,113,108,0.05))',
                      border: '1px solid rgba(120,113,108,0.3)',
                      textAlign: 'center'
                    }}>
                      <Typography variant="h6" sx={{ color: '#a8a29e', fontWeight: 700 }}>
                        {dashboardStats.pendingProjects}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        Pending
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      flex: 1, 
                      p: 2, 
                      borderRadius: 2, 
                      background: 'linear-gradient(135deg, rgba(134,239,172,0.1), rgba(134,239,172,0.05))',
                      border: '1px solid rgba(134,239,172,0.3)',
                      textAlign: 'center'
                    }}>
                      <Typography variant="h6" sx={{ color: '#86efac', fontWeight: 700 }}>
                        {dashboardStats.approvedProjects}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        Approved
                      </Typography>
                    </Box>
                  </Stack>
                  
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    background: 'linear-gradient(135deg, rgba(100,116,139,0.1), rgba(100,116,139,0.05))',
                    border: '1px solid rgba(100,116,139,0.3)'
                  }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ color: '#94a3b8', fontWeight: 500 }}>Potential Credits</Typography>
                      <Typography variant="h6" sx={{ color: '#cbd5e1', fontWeight: 700 }}>
                        {Math.floor(dashboardStats.totalCredits).toLocaleString()} CCR
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Enhanced Account Status */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)', 
              border: '1px solid #475569',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '150px',
                height: '150px',
                background: 'radial-gradient(circle, rgba(100,116,139,0.05) 0%, transparent 70%)',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)'
              }} />
              <CardContent sx={{ position: 'relative' }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Avatar sx={{ 
                    bgcolor: 'rgba(100,116,139,0.2)', 
                    color: '#64748b',
                    border: '2px solid rgba(100,116,139,0.3)'
                  }}>
                    <PersonIcon />
                  </Avatar>
                  <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 600 }}>
                    👤 Account Status
                  </Typography>
                </Stack>
                
                <Stack spacing={3}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, rgba(134,239,172,0.1), rgba(134,239,172,0.05))',
                    border: '1px solid rgba(134,239,172,0.3)'
                  }}>
                    <Box sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #86efac, #bbf7d0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <VerifiedIcon sx={{ color: '#1e293b', fontSize: '1rem' }} />
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#f1f5f9', fontWeight: 600 }}>Account Verified</Typography>
                      <Typography variant="caption" sx={{ color: '#86efac' }}>Active & Ready</Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    background: userProfile?.wallet_address 
                      ? 'linear-gradient(135deg, rgba(134,239,172,0.1), rgba(134,239,172,0.05))'
                      : 'linear-gradient(135deg, rgba(168,162,158,0.1), rgba(168,162,158,0.05))',
                    border: userProfile?.wallet_address ? '1px solid rgba(134,239,172,0.3)' : '1px solid rgba(168,162,158,0.3)'
                  }}>
                    <Box sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: userProfile?.wallet_address 
                        ? 'linear-gradient(45deg, #86efac, #bbf7d0)'
                        : 'linear-gradient(45deg, #a8a29e, #d6d3d1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {userProfile?.wallet_address ? (
                        <WalletIcon sx={{ color: '#1e293b', fontSize: '1rem' }} />
                      ) : (
                        <WarningIcon sx={{ color: '#1e293b', fontSize: '1rem' }} />
                      )}
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#f1f5f9', fontWeight: 600 }}>
                        Wallet {userProfile?.wallet_address ? 'Connected' : 'Not Connected'}
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: userProfile?.wallet_address ? '#86efac' : '#a8a29e' 
                      }}>
                        {userProfile?.wallet_address ? 'Ready for Tokens' : 'Setup Required'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, rgba(100,116,139,0.1), rgba(100,116,139,0.05))',
                    border: '1px solid rgba(100,116,139,0.3)'
                  }}>
                    <Box sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #64748b, #94a3b8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      🎉
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#f1f5f9', fontWeight: 600 }}>Member Since</Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        {formatDate(userProfile?.created_at)}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          {/* New Environmental Impact Summary */}
          <Grid item xs={12}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #334155 100%)', 
              border: '1px solid #475569',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Box sx={{
                position: 'absolute',
                top: '50%',
                right: 0,
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(148,163,184,0.03) 0%, transparent 70%)',
                borderRadius: '50%',
                transform: 'translate(50%, -50%)'
              }} />
              <CardContent sx={{ position: 'relative', p: 4 }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Box sx={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #475569, #64748b)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem'
                  }}>
                    🌍
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ 
                      color: '#f1f5f9', 
                      fontWeight: 600,
                      background: 'linear-gradient(45deg, #94a3b8, #cbd5e1)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      Environmental Impact Summary
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      Your contribution to global sustainability
                    </Typography>
                  </Box>
                </Stack>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ 
                      textAlign: 'center', 
                      p: 3,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, rgba(148,163,184,0.1), rgba(148,163,184,0.05))',
                      border: '1px solid rgba(148,163,184,0.2)'
                    }}>
                      <Typography variant="h2" sx={{ 
                        color: '#cbd5e1', 
                        fontWeight: 600,
                        mb: 1
                      }}>
                        {Math.floor(dashboardStats.totalCredits).toLocaleString()}
                      </Typography>
                      <Typography sx={{ color: '#94a3b8', mb: 1, fontWeight: 500 }}>Tons of CO2</Typography>
                      <Typography variant="body2" sx={{ color: '#f1f5f9' }}>Sequestered</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ 
                      textAlign: 'center', 
                      p: 3,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, rgba(100,116,139,0.1), rgba(100,116,139,0.05))',
                      border: '1px solid rgba(100,116,139,0.2)'
                    }}>
                      <Typography variant="h2" sx={{ 
                        color: '#94a3b8', 
                        fontWeight: 600,
                        mb: 1
                      }}>
                        {Math.floor(dashboardStats.totalCredits * 2.4).toLocaleString()}
                      </Typography>
                      <Typography sx={{ color: '#94a3b8', mb: 1, fontWeight: 500 }}>Trees Equivalent</Typography>
                      <Typography variant="body2" sx={{ color: '#f1f5f9' }}>Planted</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ 
                      textAlign: 'center', 
                      p: 3,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, rgba(109,40,217,0.1), rgba(109,40,217,0.05))',
                      border: '1px solid rgba(109,40,217,0.2)'
                    }}>
                      <Typography variant="h2" sx={{ 
                        color: '#c4b5fd', 
                        fontWeight: 600,
                        mb: 1
                      }}>
                        ${Math.floor(dashboardStats.estimatedValue).toLocaleString()}
                      </Typography>
                      <Typography sx={{ color: '#94a3b8', mb: 1, fontWeight: 500 }}>Estimated Value</Typography>
                      <Typography variant="body2" sx={{ color: '#f1f5f9' }}>Portfolio Worth</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

const ProjectsTab = ({ dataLoading, dataErrors, userProjects, navigate, handleProjectView, handleProjectCalculate, formatDate }) => {
    // Show helpful message when no projects exist
    if (!dataLoading.projects && !dataErrors.projects && userProjects.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" sx={{ color: '#ffffff', mb: 2 }}>
            No Projects Yet
          </Typography>
          <Typography variant="body1" sx={{ color: '#a0aec0', mb: 4, maxWidth: '600px', mx: 'auto' }}>
            You haven't created any projects yet. Start your carbon credit journey by creating your first project.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/submit-project')}
            sx={{
              bgcolor: '#64748b',
              color: '#f1f5f9',
              '&:hover': { bgcolor: '#475569' }
            }}
          >
            Create Your First Project
          </Button>
        </Box>
      );
    }
    
    const getProjectActions = (project) => {
      const actions = [
        { label: 'View Details', icon: <ViewIcon />, onClick: handleProjectView }
      ];
      
      // Show Calculate button only if credits haven't been calculated yet
      if (!project.calculated_credits && project.status !== 'credits_calculated' && project.status !== 'credits_minted') {
        actions.push({ 
          label: 'Calculate Credits', 
          icon: <CalculateIcon />, 
          onClick: handleProjectCalculate,
          color: '#ff9800'
        });
      }
      
      return actions;
    };
    
    return (
      <DataTable
        title="My Projects"
        data={userProjects}
        loading={dataLoading.projects}
        error={dataErrors.projects}
        columns={[
          { field: 'title', headerName: 'Project Title', flex: 1 },
          { field: 'project_type', headerName: 'Type', width: 140, render: (value) => (
            <Chip 
              label={value || 'Carbon Seq.'} 
              size="small" 
              sx={{ bgcolor: '#2d3748', color: '#ffffff' }}
            />
          )},
          { field: 'status', headerName: 'Status', width: 140, render: (value) => {
            let bgcolor = '#2d3748';
            
            switch(value) {
              case 'approved': bgcolor = '#2e7d32'; break;
              case 'pending': bgcolor = '#ed6c02'; break;
              case 'rejected': bgcolor = '#d32f2f'; break;
              case 'credits_calculated': bgcolor = '#0288d1'; break;
              case 'credits_minted': bgcolor = '#86efac'; break;
              default: break;
            }
            
            return (
              <Chip 
                label={value?.replace(/_/g, ' ').toUpperCase() || 'PENDING'} 
                size="small" 
                sx={{ 
                  bgcolor: bgcolor,
                  color: '#ffffff',
                  fontWeight: 600
                }}
              />
            );
          }},
          { field: 'estimated_credits', headerName: 'Est. Credits', width: 120, render: (value) => 
            value ? `${parseInt(value).toLocaleString()} CCR` : 'N/A'
          },
          { field: 'calculated_credits', headerName: 'Calc. Credits', width: 120, render: (value) => 
            value ? `${parseInt(value).toLocaleString()} CCR` : 'N/A'
          },
          { field: 'created_at', headerName: 'Submitted', width: 140, render: (value) => formatDate(value) }
        ]}
        getRowActions={getProjectActions}
      />
    );
  };

const TokensTab = ({ dataLoading, dataErrors, userTokens, formatDate, showSnackbar }) => {
    if (!dataLoading.tokens && !dataErrors.tokens && userTokens.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" sx={{ color: '#ffffff', mb: 2 }}>
            No Tokens Yet
          </Typography>
          <Typography variant="body1" sx={{ color: '#a0aec0', mb: 4, maxWidth: '600px', mx: 'auto' }}>
            You don't have any carbon credit tokens yet. Tokens are minted when your projects are approved and processed by administrators.
          </Typography>
          <Typography variant="body2" sx={{ color: '#a0aec0' }}>
            🪙 Create and submit projects to earn carbon credit tokens
          </Typography>
        </Box>
      );
    }
    
    return (
      <DataTable
        title="My Tokens"
        data={userTokens}
        loading={dataLoading.tokens}
        error={dataErrors.tokens}
        columns={[
          { field: 'projects', headerName: 'Project', flex: 1, render: (value) => {
            const projectName = value?.title || value?.name || 'Unknown Project';
            return projectName.length > 40 ? projectName.slice(0, 40) + '...' : projectName;
          }},
          { field: 'amount', headerName: 'Amount', width: 120, render: (value) => (
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                {parseInt(value).toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ color: '#a0aec0' }}>
                CCR
              </Typography>
            </Box>
          )},
          { field: 'status', headerName: 'Status', width: 100, render: (value) => (
            <Chip 
              label={value?.toUpperCase() || 'ACTIVE'} 
              size="small" 
              sx={{
                bgcolor: value === 'active' ? '#86efac' : value === 'retired' ? '#fbbf24' : '#94a3b8',
                color: '#ffffff',
                fontWeight: 600
              }}
            />
          )},
          { field: 'mint', headerName: 'Mint Address', width: 140, render: (value) => 
            value ? (
              <Typography variant="body2" sx={{ color: '#ffffff', fontFamily: 'monospace' }}>
                {`${value.slice(0, 8)}...${value.slice(-6)}`}
              </Typography>
            ) : 'N/A'
          },
          { field: 'created_at', headerName: 'Minted', width: 140, render: (value) => formatDate(value) }
        ]}
        actions={[
          { 
            label: 'View on Explorer', 
            icon: <Token />, 
            onClick: (item) => {
              if (item.minted_tx) {
                window.open(`https://explorer.solana.com/tx/${item.minted_tx}?cluster=devnet`, '_blank');
              } else {
                showSnackbar('No transaction hash available', 'warning');
              }
            },
            color: '#94a3b8'
          }
        ]}
      />
    );
  };

const ProfileTab = ({ userProfile, user, formatDate, setWalletDialog }) => {
    return (
      <Box>
        <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>
          Profile Information
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#243447', border: '1px solid #2d3748' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                  Personal Information
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#a0aec0' }}>Full Name:</Typography>
                    <Typography sx={{ color: '#ffffff' }}>{userProfile?.full_name || 'Not set'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#a0aec0' }}>Email:</Typography>
                    <Typography sx={{ color: '#ffffff' }}>{userProfile?.email || user?.email}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#a0aec0' }}>Phone:</Typography>
                    <Typography sx={{ color: '#ffffff' }}>{userProfile?.phone_number || 'Not set'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#a0aec0' }}>Role:</Typography>
                    <Chip 
                      label={userProfile?.role?.toUpperCase() || 'USER'} 
                      size="small" 
                      sx={{ bgcolor: '#64748b', color: '#f1f5f9' }}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#243447', border: '1px solid #2d3748' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                  Organization Details
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#a0aec0' }}>Organization:</Typography>
                    <Typography sx={{ color: '#ffffff' }}>{userProfile?.organization_name || 'Not set'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#a0aec0' }}>Type:</Typography>
                    <Typography sx={{ color: '#ffffff' }}>{userProfile?.organization_type || 'Not set'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#a0aec0' }}>Wallet Address:</Typography>
                    <Stack alignItems="flex-end">
                      {userProfile?.wallet_address ? (
                        <Typography sx={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                          {`${userProfile.wallet_address.slice(0, 8)}...${userProfile.wallet_address.slice(-6)}`}
                        </Typography>
                      ) : (
                        <Button 
                          size="small" 
                          onClick={() => setWalletDialog({ open: true })}
                          sx={{ color: '#a8a29e' }}
                        >
                          Connect Wallet
                        </Button>
                      )}
                    </Stack>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#a0aec0' }}>Member Since:</Typography>
                    <Typography sx={{ color: '#ffffff' }}>{formatDate(userProfile?.created_at)}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

// Generic Data Table Component
const DataTable = ({ title, data, loading, error, columns, actions = [], getRowActions }) => {
    if (loading) {
      return (
        <Box>
          <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>{title}</Typography>
          <Stack spacing={1}>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={50} sx={{ bgcolor: '#2d3748' }} />
            ))}
          </Stack>
        </Box>
      );
    }

    if (error) {
      return (
        <Box>
          <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>{title}</Typography>
          <Alert severity="error" sx={{ bgcolor: '#2d1b1b', color: '#ffcdd2' }}>
            {error}
          </Alert>
        </Box>
      );
    }

    return (
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#ffffff' }}>{title}</Typography>
          <Typography variant="body2" sx={{ color: '#a0aec0' }}>
            {data.length} items
          </Typography>
        </Stack>

        <TableContainer component={Paper} sx={{ bgcolor: '#1a2332', maxHeight: 400 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell 
                    key={column.field}
                    sx={{ 
                      bgcolor: '#2d3748', 
                      color: '#ffffff',
                      fontWeight: 600,
                      width: column.width,
                      flex: column.flex
                    }}
                  >
                    {column.headerName}
                  </TableCell>
                ))}
                {(actions.length > 0 || getRowActions) && (
                  <TableCell sx={{ bgcolor: '#2d3748', color: '#ffffff', fontWeight: 600, width: 150 }}>
                    Actions
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.slice(0, 50).map((row, index) => (
                <TableRow key={row.id || index} sx={{ '&:hover': { bgcolor: '#243447' } }}>
                  {columns.map((column) => (
                    <TableCell key={column.field} sx={{ color: '#ffffff', borderColor: '#2d3748' }}>
                      {column.render ? column.render(row[column.field], row) : (row[column.field] || 'N/A')}
                    </TableCell>
                  ))}
                  {(actions.length > 0 || getRowActions) && (
                    <TableCell sx={{ color: '#ffffff', borderColor: '#2d3748' }}>
                      <Stack direction="row" spacing={1}>
                        {(getRowActions ? getRowActions(row) : actions).map((action, idx) => (
                          <Tooltip key={idx} title={action.label}>
                            <IconButton
                              size="small"
                              onClick={() => action.onClick(row)}
                              sx={{ color: action.color || '#94a3b8' }}
                            >
                              {action.icon}
                            </IconButton>
                          </Tooltip>
                        ))}
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

export default UserDashboard;

// Add CSS keyframes for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes glow {
    from {
      box-shadow: 0 0 5px rgba(148,163,184,0.4);
    }
    to {
      box-shadow: 0 0 20px rgba(148,163,184,0.8);
    }
  }
`;
document.head.appendChild(style);
