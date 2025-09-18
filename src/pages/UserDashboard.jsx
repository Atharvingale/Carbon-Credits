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
import { walletDatabaseTest } from '../utils/walletDatabaseTest';

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
  const [walletTestResults, setWalletTestResults] = useState(null);
  const [testingWallet, setTestingWallet] = useState(false);
  
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
      console.log('📁 Fetching user projects...');
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
      
      console.log(`✅ Loaded ${data?.length || 0} user projects`);
      
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
                console.log(`🧮 Calculated estimated credits for project ${normalized.title}: ${calculation.totalCarbonCredits}`);
                
                // Update the database with estimated credits (async)
                supabase
                  .from('projects')
                  .update({ estimated_credits: calculation.totalCarbonCredits })
                  .eq('id', normalized.id)
                  .then(({ error }) => {
                    if (error) console.warn('Failed to update estimated credits:', error);
                  });
              }
            } catch (calcError) {
              console.warn(`Failed to calculate estimated credits for project ${normalized.id}:`, calcError);
            }
          }
        }
        
        return getProjectDisplayValues(normalized);
      });
      
      setUserProjects(normalizedProjects);
      
    } catch (error) {
      console.error('❌ Projects fetch error:', error);
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
      console.log('🪙 Fetching user tokens...');
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
      
      console.log(`✅ Loaded ${userTokens.length} user tokens`);
      setUserTokens(userTokens);
      
    } catch (error) {
      console.error('❌ Tokens fetch error:', error);
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
    
    console.log('✅ Dashboard statistics calculated:', stats);
    setDashboardStats(stats);
  }, [userProjects, userTokens]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      console.log('🔄 Refreshing all user dashboard data...');
      await Promise.allSettled([
        fetchUserProjects(user.id),
        fetchUserTokens(user.id)
      ]);
      console.log('✅ All data refreshing completed');
      showSnackbar('Dashboard refreshed successfully', 'success');
    } catch (error) {
      console.error('Refresh failed:', error);
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
          console.error('Session error:', sessionError);
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
          console.error('Profile fetch error:', profileError);
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
        console.error('Initialization failed:', error);
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
      console.error('Error logging out:', error);
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
    console.log('Opening project view for:', project.title);
    setProjectDetailDialog({ open: true, project });
  }, []);

  const handleProjectCalculate = useCallback((project) => {
    console.log('Opening calculator for:', project.title);
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
    
    // Basic wallet address validation (Solana format)
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
      console.error('Error updating wallet:', error);
      showSnackbar(`Failed to connect wallet: ${error.message}`, 'error');
    }
  }, [walletAddress, user, showSnackbar]);

  // Wallet testing handler
  const handleWalletTest = useCallback(async () => {
    if (!user) {
      showSnackbar('Please log in to test wallet functionality', 'error');
      return;
    }

    setTestingWallet(true);
    setWalletTestResults(null);

    try {
      // Get user's auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Generate a test wallet address for testing purposes
      const testWalletAddress = userProfile?.wallet_address || 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';

      // Run comprehensive wallet test
      const results = await walletDatabaseTest.runFullTest(
        user.id,
        session.access_token,
        testWalletAddress
      );

      setWalletTestResults(results);

      if (results.summary.success) {
        showSnackbar(`Wallet test passed! (${results.summary.passed}/${results.summary.total} tests)`, 'success');
      } else {
        showSnackbar(`Wallet test failed: ${results.summary.passed}/${results.summary.total} tests passed`, 'warning');
      }
    } catch (error) {
      console.error('Wallet test failed:', error);
      showSnackbar(`Wallet test error: ${error.message}`, 'error');
    } finally {
      setTestingWallet(false);
    }
  }, [user, userProfile, showSnackbar]);

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
          <CircularProgress size={60} sx={{ color: '#00d4aa' }} />
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
                <ListItemIcon><HomeIcon sx={{ color: '#00d4aa' }} /></ListItemIcon>
                <ListItemText>Home</ListItemText>
              </MenuItem>
              {userProfile?.role === 'admin' && (
                <MenuItem onClick={() => navigate('/admin')}>
                  <ListItemIcon><AdminIcon sx={{ color: '#00d4aa' }} /></ListItemIcon>
                  <ListItemText>Admin Dashboard</ListItemText>
                </MenuItem>
              )}
              <MenuItem onClick={() => setWalletDialog({ open: true })}>
                <ListItemIcon><WalletIcon sx={{ color: '#00d4aa' }} /></ListItemIcon>
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

        {/* Wallet Connection Section */}
        <Card sx={{ bgcolor: '#1a2332', border: '1px solid #2d3748', mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ color: '#ffffff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <WalletIcon sx={{ color: '#00d4aa' }} />
              Wallet Connection
            </Typography>
            <Typography variant="body2" sx={{ color: '#a0aec0', mb: 3 }}>
              Connect your Solana wallet to receive carbon credit tokens and perform blockchain operations.
            </Typography>
            <ConnectWallet
              showSaveButton={true}
              showDetails={true}
              autoSave={false}
              size="medium"
              onWalletSaved={() => {
                showSnackbar('Wallet connected successfully!', 'success');
                refreshAllData();
              }}
            />
            
            {/* Wallet Test Button */}
            <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #2d3748' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                  Test wallet database integration
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleWalletTest}
                  disabled={testingWallet}
                  startIcon={testingWallet ? <CircularProgress size={16} /> : <VerifiedIcon />}
                  sx={{
                    color: '#00d4aa',
                    borderColor: '#00d4aa',
                    '&:hover': {
                      borderColor: '#00d4aa',
                      bgcolor: 'rgba(0, 212, 170, 0.1)'
                    }
                  }}
                >
                  {testingWallet ? 'Testing...' : 'Test Database'}
                </Button>
              </Stack>
              
              {/* Test Results */}
              {walletTestResults && (
                <Alert
                  severity={walletTestResults.summary.success ? 'success' : 'warning'}
                  sx={{ mt: 2 }}
                >
                  <Typography variant="body2" gutterBottom>
                    Database Test Results: {walletTestResults.summary.passed}/{walletTestResults.summary.total} tests passed
                  </Typography>
                  {!walletTestResults.summary.success && (
                    <Typography variant="caption" display="block">
                      Check browser console for detailed error information.
                    </Typography>
                  )}
                </Alert>
              )}
            </Box>
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
                '&.Mui-selected': { color: '#00d4aa' }
              },
              '& .MuiTabs-indicator': { bgcolor: '#00d4aa' }
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
            sx={{ color: '#00d4aa' }}
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
        bgcolor: '#1a2332', 
        border: '1px solid #2d3748',
        height: 140,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="body2" sx={{ color: '#a0aec0', mb: 1 }}>
                {title}
              </Typography>
              <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 700, mb: 0.5 }}>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </Typography>
              {subtitle && (
                <Typography variant="caption" sx={{ color: '#a0aec0' }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Avatar sx={{ bgcolor: `${color}20`, color }}>
              {icon}
            </Avatar>
          </Stack>
        </CardContent>
        
        {/* Decorative gradient */}
        <Box sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, transparent, ${color})`
        }} />
      </Card>
    );
  };

// Tab Components
const OverviewTab = ({ dashboardStats, userProfile, formatDate }) => {
    return (
      <Box>
        <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>
          Dashboard Overview
        </Typography>
        
        <Grid container spacing={3}>
          {/* Project Status Summary */}
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#243447', border: '1px solid #2d3748' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                  Project Portfolio
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#a0aec0' }}>Total Projects:</Typography>
                    <Typography sx={{ color: '#ffffff', fontWeight: 600 }}>{dashboardStats.totalProjects}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#a0aec0' }}>Pending Review:</Typography>
                    <Typography sx={{ color: '#ffa726', fontWeight: 600 }}>{dashboardStats.pendingProjects}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#a0aec0' }}>Approved:</Typography>
                    <Typography sx={{ color: '#4caf50', fontWeight: 600 }}>{dashboardStats.approvedProjects}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#a0aec0' }}>Potential Credits:</Typography>
                    <Typography sx={{ color: '#00d4aa', fontWeight: 600 }}>{Math.floor(dashboardStats.totalCredits).toLocaleString()} CCR</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Account Status */}
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#243447', border: '1px solid #2d3748' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                  Account Status
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CheckCircleIcon sx={{ color: '#4caf50' }} />
                    <Typography sx={{ color: '#ffffff' }}>Account Verified</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {userProfile?.wallet_address ? (
                      <CheckCircleIcon sx={{ color: '#4caf50' }} />
                    ) : (
                      <WarningIcon sx={{ color: '#ffa726' }} />
                    )}
                    <Typography sx={{ color: '#ffffff' }}>
                      Wallet {userProfile?.wallet_address ? 'Connected' : 'Not Connected'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <InfoIcon sx={{ color: '#2196f3' }} />
                    <Typography sx={{ color: '#ffffff' }}>
                      Member since {formatDate(userProfile?.created_at)}
                    </Typography>
                  </Box>
                </Stack>
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
              bgcolor: '#00d4aa',
              color: '#ffffff',
              '&:hover': { bgcolor: '#00c097' }
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
              case 'credits_minted': bgcolor = '#00d4aa'; break;
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
              <Typography variant="body2" sx={{ color: '#00d4aa', fontWeight: 600 }}>
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
                bgcolor: value === 'active' ? '#4caf50' : value === 'retired' ? '#ff9800' : '#2196f3',
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
            color: '#00d4aa'
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
                      sx={{ bgcolor: '#00d4aa', color: '#ffffff' }}
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
                        <Typography sx={{ color: '#00d4aa', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                          {`${userProfile.wallet_address.slice(0, 8)}...${userProfile.wallet_address.slice(-6)}`}
                        </Typography>
                      ) : (
                        <Button 
                          size="small" 
                          onClick={() => setWalletDialog({ open: true })}
                          sx={{ color: '#ffa726' }}
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
                              sx={{ color: action.color || '#00d4aa' }}
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
