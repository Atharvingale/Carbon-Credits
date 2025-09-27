import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { normalizeProject, getProjectDisplayValues, validateForCarbonCalculation } from '../utils/projectColumnMapping';
import { calculateProjectCredits } from '../utils/carbonCreditCalculator';
import { 
  Box, Container, Typography, Grid, CircularProgress, Alert, Card, CardContent, Avatar,
  IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider,
  Chip, Snackbar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Tabs, Tab, Badge, Skeleton,
  Tooltip, Stack, AppBar, Toolbar
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as TokenIcon,
  Logout as LogoutIcon,
  Home as HomeIcon,
  Schedule as PendingIcon,
  Gavel as ApprovalIcon,
  SupervisorAccount as UsersIcon,
  Block as BlockIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Check as CheckIcon,
  Token,
  Calculate as CalculateIcon,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  Visibility as ViewIcon,
  MoreVert as MoreVertIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import ProjectDetailDialog from '../components/ProjectDetailDialog';
import CarbonCreditCalculatorDialog from '../components/CarbonCreditCalculatorDialog';
import AdminMintVerificationModal from '../components/admin/AdminMintVerificationModal';

const AdminDashboard = () => {
  const navigate = useNavigate();
  
  // Main state
  // const [user, setUser] = useState(null); // Removed - gets user info dynamically
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data state
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    pendingProjects: 0,
    approvedProjects: 0,
    rejectedProjects: 0,
    totalTokens: 0,
    totalCredits: 0,
    recentActivity: 0
  });
  
  const [allUsers, setAllUsers] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [allTokens, setAllTokens] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  
  // Loading states
  const [dataLoading, setDataLoading] = useState({
    users: false,
    projects: false,
    tokens: false,
    logs: false,
    stats: false
  });
  
  // Error states
  const [dataErrors, setDataErrors] = useState({
    users: null,
    projects: null,
    tokens: null,
    logs: null,
    stats: null
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
  const [mintVerificationModal, setMintVerificationModal] = useState({ open: false, project: null });
  const [selectedProject, setSelectedProject] = useState(null);

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
  
  // Utility function to format credits with proper decimals
  const formatCredits = useCallback((value) => {
    if (!value || value === 0) return 'N/A';
    
    const numValue = parseFloat(value);
    return numValue.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }) + ' CCR';
  }, []);

  // Authentication check
  const checkAuthentication = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        showSnackbar('Authentication error occurred', 'error');
        navigate('/login');
        return false;
      }
      
      if (!session) {
        navigate('/login');
        return false;
      }
      
      // User session is valid - no need to store in state
      
      // Check admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, email')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        showSnackbar('Failed to verify admin access', 'error');
        return false;
      }
      
      if (profile?.role !== 'admin') {
        showSnackbar('Access denied. Admin privileges required.', 'error');
        navigate('/dashboard');
        return false;
      }
      
      return true;
    } catch (error) {
      showSnackbar('Authentication failed', 'error');
      navigate('/login');
      return false;
    }
  }, [navigate, showSnackbar]);

  // Individual data fetching functions
  const fetchUsers = useCallback(async () => {
    setLoadingState('users', true);
    setErrorState('users', null);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, email, full_name, role, organization_name, organization_type,
          phone_number, is_blocked, block_reason, blocked_at,
          is_verified, verification_date, created_at, updated_at,
          wallet_address, wallet_connected_at, wallet_verified
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setAllUsers(data || []);
      
    } catch (error) {
      const errorMessage = error.code === '42P01' 
        ? 'Profiles table not found. Please run database setup.'
        : `Failed to fetch users: ${error.message}`;
      setErrorState('users', errorMessage);
      setAllUsers([]);
    } finally {
      setLoadingState('users', false);
    }
  }, [setLoadingState, setErrorState]);

  const fetchProjects = useCallback(async () => {
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
          created_at, updated_at,
          profiles:user_id (
            id, full_name, email, wallet_address, wallet_connected_at, wallet_verified
          ),
          reviewer:reviewed_by (
            full_name, email
          ),
          approver:approved_by (
            full_name, email
          )
        `)
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
                
                // Update the database with estimated credits asynchronously
                supabase
                  .from('projects')
                  .update({ estimated_credits: calculation.totalCarbonCredits })
                  .eq('id', normalized.id);
              }
            } catch (calcError) {
              // Silently continue if calculation fails
            }
          }
        }
        
        return getProjectDisplayValues(normalized);
      });
      
      setAllProjects(normalizedProjects);
      
    } catch (error) {
      const errorMessage = error.code === '42P01'
        ? 'Projects table not found. Please run database setup and migration.'
        : `Failed to fetch projects: ${error.message}`;
      setErrorState('projects', errorMessage);
      setAllProjects([]);
    } finally {
      setLoadingState('projects', false);
    }
  }, [setLoadingState, setErrorState]);

  const fetchTokens = useCallback(async () => {
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
            title, name, description
          ),
          minter:minted_by (
            full_name, email
          ),
          retiree:retired_by (
            full_name, email
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setAllTokens(data || []);
      
    } catch (error) {
      const errorMessage = error.code === '42P01'
        ? 'Tokens table not found. Token management unavailable.'
        : `Failed to fetch tokens: ${error.message}`;
      setErrorState('tokens', errorMessage);
      setAllTokens([]);
    } finally {
      setLoadingState('tokens', false);
    }
  }, [setLoadingState, setErrorState]);

  const fetchAdminLogs = useCallback(async () => {
    setLoadingState('logs', true);
    setErrorState('logs', null);
    
    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select(`
          id, admin_id, action, target_type, target_id,
          details, created_at,
          profiles:admin_id (
            full_name, email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      setAdminLogs(data || []);
      
    } catch (error) {
      const errorMessage = error.code === '42P01'
        ? 'Admin logs table not found. Activity logging unavailable.'
        : `Failed to fetch admin logs: ${error.message}`;
      setErrorState('logs', errorMessage);
      setAdminLogs([]);
    } finally {
      setLoadingState('logs', false);
    }
  }, [setLoadingState, setErrorState]);
  
  // Fetch dashboard statistics
  const fetchDashboardStats = useCallback(async () => {
    setLoadingState('stats', true);
    setErrorState('stats', null);
    
    try {
      // Calculate stats from existing data or fetch fresh counts
      const statsPromises = [
        // User counts
        supabase.from('profiles').select('role', { count: 'exact' }),
        // Project counts by status
        supabase.from('projects').select('status', { count: 'exact' }),
        supabase.from('projects').select('status').eq('status', 'pending'),
        supabase.from('projects').select('status').eq('status', 'approved'),
        supabase.from('projects').select('status').eq('status', 'rejected'),
        // Token statistics
        supabase.from('tokens').select('amount', { count: 'exact' }),
        supabase.from('tokens').select('amount'),
        // Recent activity count
        supabase.from('admin_logs').select('id', { count: 'exact' })
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ];
      
      const results = await Promise.allSettled(statsPromises);
      
      // Process results safely
      const totalUsers = results[0].status === 'fulfilled' ? results[0].value.count || 0 : 0;
      const totalProjects = results[1].status === 'fulfilled' ? results[1].value.count || 0 : 0;
      const pendingProjects = results[2].status === 'fulfilled' ? results[2].value.data?.length || 0 : 0;
      const approvedProjects = results[3].status === 'fulfilled' ? results[3].value.data?.length || 0 : 0;
      const rejectedProjects = results[4].status === 'fulfilled' ? results[4].value.data?.length || 0 : 0;
      const totalTokens = results[5].status === 'fulfilled' ? results[5].value.count || 0 : 0;
      const tokenAmounts = results[6].status === 'fulfilled' ? results[6].value.data || [] : [];
      const totalCredits = tokenAmounts.reduce((sum, token) => sum + (token.amount || 0), 0);
      const recentActivity = results[7].status === 'fulfilled' ? results[7].value.count || 0 : 0;
      
      const stats = {
        totalUsers,
        totalProjects,
        pendingProjects,
        approvedProjects,
        rejectedProjects,
        totalTokens,
        totalCredits,
        recentActivity
      };
      
      setDashboardStats(stats);
      
    } catch (error) {
      setErrorState('stats', `Failed to calculate statistics: ${error.message}`);
    } finally {
      setLoadingState('stats', false);
    }
  }, [setLoadingState, setErrorState]);

  // Main data fetching function
  const fetchAllData = useCallback(async () => {
    // Fetch all data in parallel for better performance
    const dataPromises = [
      fetchUsers(),
      fetchProjects(),
      fetchTokens(),
      fetchAdminLogs(),
      fetchDashboardStats()
    ];
    
    try {
      await Promise.allSettled(dataPromises);
    } catch (error) {
      showSnackbar('Some data could not be loaded', 'warning');
    }
  }, [fetchUsers, fetchProjects, fetchTokens, fetchAdminLogs, fetchDashboardStats, showSnackbar]);
  
  // Refresh all data
  const refreshAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAllData();
      showSnackbar('Dashboard refreshed successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to refresh dashboard', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [fetchAllData, showSnackbar]);

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      setLoading(true);
      const isAuthenticated = await checkAuthentication();
      
      if (isAuthenticated) {
        await fetchAllData();
      }
      
      setLoading(false);
    };
    
    initializeDashboard();
  }, [checkAuthentication, fetchAllData]);

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

  // Project action handlers
  const handleProjectReview = useCallback((project) => {
    setProjectDetailDialog({ open: true, project });
  }, []);

  const handleProjectCalculate = useCallback((project) => {
    setCalculatorDialog({ open: true, project });
  }, []);

  const handleProjectApprove = useCallback(async (project) => {
    try {
      setLoadingState('projects', true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('projects')
        .update({ 
          status: 'approved', 
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', project.id);
      
      if (error) throw error;
      
      // Log admin action
      await supabase.from('admin_logs').insert([{
        admin_id: user?.id,
        action: 'project_approved',
        target_type: 'project',
        target_id: project.id,
        details: `Approved project: ${project.title}`
      }]);
      
      showSnackbar(`Project "${project.title}" approved successfully`, 'success');
      await fetchProjects(); // Refresh projects
      
    } catch (error) {
      showSnackbar(`Failed to approve project: ${error.message}`, 'error');
    } finally {
      setLoadingState('projects', false);
    }
  }, [fetchProjects, showSnackbar, setLoadingState]);

  const handleCreditCalculated = useCallback(async (credits, calculationDetails) => {
    try {
      if (!selectedProject) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // FIXED: Properly handle decimal credits storage
      // Ensure the value is stored as a proper decimal number
      const creditsToStore = parseFloat(credits);
      
      // Validate that we have a reasonable credit value
      if (isNaN(creditsToStore) || creditsToStore <= 0) {
        throw new Error('Invalid credits value for storage');
      }
      
      const { error } = await supabase
        .from('projects')
        .update({ 
          calculated_credits: creditsToStore,
          status: 'credits_calculated',
          calculation_data: calculationDetails,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', selectedProject.id);
      
      if (error) throw error;
      
      // Log admin action
      await supabase.from('admin_logs').insert([{
        admin_id: user?.id,
        action: 'credits_calculated',
        target_type: 'project',
        target_id: selectedProject.id,
        details: `Calculated ${credits} credits for project: ${selectedProject.title}`
      }]);
      
      showSnackbar(`${credits} credits calculated successfully`, 'success');
      await fetchProjects(); // Refresh projects
      
    } catch (error) {
      showSnackbar(`Failed to update credits: ${error.message}`, 'error');
    }
  }, [selectedProject, fetchProjects, showSnackbar]);

  const handleDialogClose = useCallback((dialogType) => {
    if (dialogType === 'detail') {
      setProjectDetailDialog({ open: false, project: null });
    } else if (dialogType === 'calculator') {
      setCalculatorDialog({ open: false, project: null });
      setSelectedProject(null);
    } else if (dialogType === 'mint') {
      setMintVerificationModal({ open: false, project: null });
    }
  }, []);

  const handleProjectUpdate = useCallback(async (updatedProject) => {
    // Update the project in the local state
    setAllProjects(prev => 
      prev.map(p => p.id === updatedProject.id ? updatedProject : p)
    );
    
    // Refresh data to ensure consistency
    await fetchProjects();
    showSnackbar('Project updated successfully', 'success');
  }, [fetchProjects, showSnackbar]);

  // Enhanced Minting functionality with verification modal
  const handleMintTokens = useCallback((project) => {
    // Open the comprehensive verification modal
    setMintVerificationModal({ open: true, project });
  }, []);

  // Handle the actual minting after verification
  const handleMintConfirm = useCallback(async (mintData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showSnackbar('Authentication required for minting', 'error');
        return;
      }

      // Get recipient wallet from user details
      const recipientWallet = mintData.userDetails.wallet_address;
      if (!recipientWallet) {
        showSnackbar('User wallet address not found', 'error');
        return;
      }

      showSnackbar(`Minting ${mintData.amount} credits...`, 'info');
      
      // Create verification hash for authenticity
      const apiVerificationData = {
        projectId: mintData.projectId,
        projectTitle: mintData.projectDetails.title,
        creditsToMint: parseInt(mintData.amount),
        reason: mintData.reason,
        adminVerified: mintData.adminVerified,
        timestamp: Date.now()
      };
      
      // Call minting API with verification data
      const response = await fetch('http://localhost:3001/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          projectId: mintData.projectId,
          recipientWallet: recipientWallet,
          amount: mintData.amount.toString(),
          decimals: 0,
          reason: mintData.reason,
          verificationData: apiVerificationData
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const mintResult = await response.json();
      
      // Get current user for verification
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create comprehensive verification record
      const mintingVerificationData = {
        project_details: mintData.projectDetails,
        user_details: mintData.userDetails,
        credits_minted: parseInt(mintData.amount),
        minting_reason: mintData.reason,
        mint_transaction: mintResult.tx,
        mint_address: mintResult.mint,
        recipient_wallet: recipientWallet,
        admin_verified: true,
        verification_admin: user?.id,
        verification_timestamp: new Date().toISOString()
      };
      
      // Update project status to reflect successful minting with verification
      const projectUpdate = await supabase
        .from('projects')
        .update({
          status: 'credits_minted',
          mint_address: mintResult.mint,
          credits_issued: parseInt(mintData.amount),
          minting_verification: mintingVerificationData,
          minted_at: new Date().toISOString(),
          is_immutable: true // Mark as immutable after minting
        })
        .eq('id', mintData.projectId);
      
      if (projectUpdate.error) {
        showSnackbar('Warning: Tokens minted but project update failed', 'warning');
      }
      
      // Log admin action with comprehensive details
      await supabase.from('admin_logs').insert([{
        admin_id: user?.id,
        action: 'tokens_minted_verified',
        target_type: 'project',
        target_id: mintData.projectId,
        details: `Admin-verified minting: ${mintData.amount} credits for project "${mintData.projectDetails.title}". Reason: ${mintData.reason}. Mint: ${mintResult.mint}, Tx: ${mintResult.tx}`
      }]);
      
      showSnackbar(`Successfully minted ${mintData.amount} credits! View on Solana Explorer: ${mintResult.explorer_url}`, 'success');
      
      // Refresh projects and tokens to show updated state
      await Promise.all([fetchProjects(), fetchTokens()]);
      
    } catch (error) {
      showSnackbar(`Failed to mint tokens: ${error.message}`, 'error');
      throw error;
    }
  }, [showSnackbar, fetchProjects, fetchTokens]);

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
            Initializing Admin Dashboard...
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
              <AdminIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                Carbon Credits Admin
              </Typography>
              <Typography variant="caption" sx={{ color: '#a0aec0' }}>
                System Administrator Dashboard
              </Typography>
            </Box>
          </Stack>
          
          <Stack direction="row" spacing={2} alignItems="center">
            <Tooltip title="Refresh Dashboard">
              <IconButton 
                onClick={refreshAllData} 
                disabled={refreshing}
                sx={{ color: '#00d4aa' }}
              >
                {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
            
            <Badge badgeContent={dashboardStats.recentActivity} color="error">
              <IconButton sx={{ color: '#ffffff' }}>
                <AnalyticsIcon />
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
              <MenuItem onClick={() => navigate('/dashboard')}>
                <ListItemIcon><DashboardIcon sx={{ color: '#00d4aa' }} /></ListItemIcon>
                <ListItemText>User Dashboard</ListItemText>
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
          {/* Users Stats */}
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Total Users"
              value={dashboardStats.totalUsers}
              icon={<UsersIcon />}
              color="#2196f3"
              loading={dataLoading.stats}
              error={dataErrors.stats}
            />
          </Grid>
          
          {/* Projects Stats */}
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Pending Projects"
              value={dashboardStats.pendingProjects}
              subtitle={`${dashboardStats.totalProjects} total`}
              icon={<PendingIcon />}
              color="#ffa726"
              loading={dataLoading.stats}
              error={dataErrors.stats}
            />
          </Grid>
          
          {/* Tokens Stats */}
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Carbon Credits"
              value={`${dashboardStats.totalCredits.toLocaleString()} CCR`}
              subtitle={`${dashboardStats.totalTokens} transactions`}
              icon={<TokenIcon />}
              color="#00d4aa"
              loading={dataLoading.stats}
              error={dataErrors.stats}
            />
          </Grid>
          
          {/* Activity Stats */}
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Recent Activity"
              value={dashboardStats.recentActivity}
              subtitle="Last 24 hours"
              icon={<TrendingUpIcon />}
              color="#9c27b0"
              loading={dataLoading.stats}
              error={dataErrors.stats}
            />
          </Grid>
        </Grid>

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
            <Tab label="Users" icon={<UsersIcon />} />
            <Tab label="Projects" icon={<ApprovalIcon />} />
            <Tab label="Tokens" icon={<TokenIcon />} />
            <Tab label="Activity Logs" icon={<HistoryIcon />} />
          </Tabs>

          <CardContent sx={{ p: 3 }}>
            {currentTab === 0 && <OverviewTab />}
            {currentTab === 1 && <UsersTab />}
            {currentTab === 2 && <ProjectsTab />}
            {currentTab === 3 && <TokensTab />}
            {currentTab === 4 && <ActivityLogsTab />}
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
      
      {/* Project Detail Dialog */}
      <ProjectDetailDialog
        open={projectDetailDialog.open}
        onClose={() => handleDialogClose('detail')}
        project={projectDetailDialog.project}
        onUpdate={handleProjectUpdate}
      />
      
      {/* Carbon Credit Calculator Dialog */}
      <CarbonCreditCalculatorDialog
        open={calculatorDialog.open}
        onClose={() => handleDialogClose('calculator')}
        project={calculatorDialog.project}
        onCreditCalculated={handleCreditCalculated}
      />
      
      {/* Admin Mint Verification Modal */}
      <AdminMintVerificationModal
        open={mintVerificationModal.open}
        onClose={() => handleDialogClose('mint')}
        project={mintVerificationModal.project}
        onMintConfirm={handleMintConfirm}
        showSnackbar={showSnackbar}
      />
    </Box>
  );

  // Stats Card Component
  function StatsCard({ title, value, subtitle, icon, color, loading, error }) {
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
  }

  // Tab Components
  function OverviewTab() {
    return (
      <Box>
        <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>
          System Overview
        </Typography>
        
        <Grid container spacing={3}>
          {/* Quick Stats */}
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#243447', border: '1px solid #2d3748' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                  Quick Statistics
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#a0aec0' }}>Total Users:</Typography>
                    <Typography sx={{ color: '#ffffff', fontWeight: 600 }}>{dashboardStats.totalUsers}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#a0aec0' }}>Active Projects:</Typography>
                    <Typography sx={{ color: '#ffffff', fontWeight: 600 }}>{dashboardStats.totalProjects}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#a0aec0' }}>Pending Reviews:</Typography>
                    <Typography sx={{ color: '#ffa726', fontWeight: 600 }}>{dashboardStats.pendingProjects}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#a0aec0' }}>Credits Issued:</Typography>
                    <Typography sx={{ color: '#00d4aa', fontWeight: 600 }}>{dashboardStats.totalCredits.toLocaleString()} CCR</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          {/* System Status */}
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#243447', border: '1px solid #2d3748' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                  System Status
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CheckCircleIcon sx={{ color: '#4caf50' }} />
                    <Typography sx={{ color: '#ffffff' }}>Database Connection</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CheckCircleIcon sx={{ color: '#4caf50' }} />
                    <Typography sx={{ color: '#ffffff' }}>Authentication Service</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <InfoIcon sx={{ color: '#2196f3' }} />
                    <Typography sx={{ color: '#ffffff' }}>Background Jobs</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  }

  function UsersTab() {
    // Show helpful message when no users exist
    if (!dataLoading.users && !dataErrors.users && allUsers.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" sx={{ color: '#ffffff', mb: 2 }}>
            No Users Found
          </Typography>
          <Typography variant="body1" sx={{ color: '#a0aec0', mb: 4, maxWidth: '600px', mx: 'auto' }}>
            There are no user accounts in the database yet. Users will appear here once they register through the application.
          </Typography>
          <Typography variant="body2" sx={{ color: '#a0aec0' }}>
            👥 To get started: Go to the registration page and create user accounts
          </Typography>
        </Box>
      );
    }
    
    return (
      <DataTable
        title="User Management"
        data={allUsers}
        loading={dataLoading.users}
        error={dataErrors.users}
        columns={[
          { field: 'email', headerName: 'Email', flex: 1 },
          { field: 'full_name', headerName: 'Full Name', flex: 1 },
          { field: 'organization_name', headerName: 'Organization', width: 180 },
          { field: 'role', headerName: 'Role', width: 100, render: (value) => (
            <Chip 
              label={value} 
              size="small" 
              sx={{ 
                bgcolor: value === 'admin' ? '#00d4aa' : value === 'verifier' ? '#ff9800' : '#2d3748',
                color: '#ffffff'
              }}
            />
          )},
          { field: 'wallet_address', headerName: 'Wallet Status', width: 120, render: (value, row) => {
            if (value) {
              const isVerified = row.wallet_verified;
              return (
                <Chip 
                  label={isVerified ? '✓ Verified' : '✓ Connected'} 
                  size="small" 
                  sx={{ 
                    bgcolor: isVerified ? '#4caf50' : '#2196f3',
                    color: '#ffffff',
                    fontWeight: 600
                  }}
                  title={`Wallet: ${value.slice(0, 8)}...${value.slice(-6)}\nConnected: ${formatDate(row.wallet_connected_at)}\nVerified: ${isVerified ? 'Yes' : 'No'}`}
                />
              );
            } else {
              return (
                <Chip 
                  label="⚠ No Wallet" 
                  size="small" 
                  sx={{ 
                    bgcolor: '#ff9800',
                    color: '#ffffff',
                    fontWeight: 600
                  }}
                  title="User has not connected a wallet address"
                />
              );
            }
          }},
          { field: 'is_verified', headerName: 'Verified', width: 90, render: (value) => (
            <Chip 
              label={value ? 'Yes' : 'No'} 
              size="small" 
              color={value ? 'success' : 'default'}
            />
          )},
          { field: 'created_at', headerName: 'Joined', width: 120, render: (value) => formatDate(value) },
          { field: 'is_blocked', headerName: 'Status', width: 90, render: (value) => (
            <Chip 
              label={value ? 'Blocked' : 'Active'} 
              size="small" 
              color={value ? 'error' : 'success'}
            />
          )}
        ]}
        actions={[
          { 
            label: 'View Details', 
            icon: <ViewIcon />, 
            onClick: (item) => {
              showSnackbar(`User Details: ${item.full_name || item.email} - ${item.role} - ${item.wallet_address ? 'Wallet Connected' : 'No Wallet'}`, 'info');
            },
            color: '#2196f3'
          },
          { 
            label: 'Check Projects', 
            icon: <InfoIcon />, 
            onClick: async (item) => {
              try {
                showSnackbar('Checking user projects...', 'info');
                
                const { data: userProjects, error } = await supabase
                  .from('projects')
                  .select('id, title, status, calculated_credits, estimated_credits')
                  .eq('user_id', item.id);
                
                if (error) {
                  showSnackbar(`Error fetching projects: ${error.message}`, 'error');
                  return;
                }
                
                if (!userProjects || userProjects.length === 0) {
                  showSnackbar(`User "${item.email}" has no projects.`, 'info');
                } else {
                  const projectInfo = userProjects.map(p => 
                    `• ${p.title} (${p.status}) - Credits: ${p.calculated_credits || p.estimated_credits || 'N/A'}`
                  ).join('\n');
                  
                  showSnackbar(`Found ${userProjects.length} projects for ${item.email}`, 'success');
                  showSnackbar(`Found ${userProjects.length} projects for this user.`, 'success');
                }
              } catch (error) {
                showSnackbar(`Error checking projects: ${error.message}`, 'error');
              }
            },
            color: '#ff9800'
          },
          { label: 'Edit', icon: <EditIcon />, onClick: (item) => showSnackbar('Edit user functionality not implemented', 'info'), color: '#4caf50' },
          { label: 'Block/Unblock', icon: <BlockIcon />, onClick: (item) => showSnackbar('Block user functionality not implemented', 'info'), color: '#f44336' }
        ]}
      />
    );
  }

  function ProjectsTab() {
    // Show helpful message when no projects exist
    if (!dataLoading.projects && !dataErrors.projects && allProjects.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" sx={{ color: '#ffffff', mb: 2 }}>
            No Projects Found
          </Typography>
          <Typography variant="body1" sx={{ color: '#a0aec0', mb: 4, maxWidth: '600px', mx: 'auto' }}>
            There are no projects in the database yet. Projects will appear here once users register, log in, and submit project proposals through the system.
          </Typography>
          <Typography variant="body2" sx={{ color: '#a0aec0' }}>
            📄 To get started: Register as a user → Connect wallet → Create project
          </Typography>
        </Box>
      );
    }
    
    // Generate dynamic actions based on project status
  const getProjectActions = (project) => {
      const actions = [
        { label: 'Review', icon: <ViewIcon />, onClick: handleProjectReview }
      ];
      
      // Show Calculate button only if credits haven't been calculated yet
      if (!project.calculated_credits && project.status !== 'credits_calculated' && project.status !== 'credits_minted') {
        actions.push({ 
          label: 'Calculate', 
          icon: <CalculateIcon />, 
          onClick: (item) => { setSelectedProject(item); handleProjectCalculate(item); },
          color: '#ff9800'
        });
      }
      
      // Show Approve button only for pending projects that haven't been approved
      if (project.status === 'pending') {
        actions.push({ 
          label: 'Approve', 
          icon: <CheckIcon />, 
          onClick: handleProjectApprove,
          color: '#4caf50'
        });
      }
      
      // Show Mint Tokens button only if:
      // 1. Project has calculated/estimated credits
      // 2. Project hasn't been minted yet
      // 3. User has provided wallet address
      if ((project.status === 'approved' || project.status === 'credits_calculated') && 
          (project.calculated_credits || project.estimated_credits) && 
          project.status !== 'credits_minted') {
        
        // Check wallet address from user's profile, not project
        // Handle case where profiles might be null or undefined
        const userWalletAddress = (project.profiles && project.profiles.wallet_address) || project.wallet_address;
        
        if (userWalletAddress) {
          // User has wallet - show mint button
          actions.push({ 
            label: 'Mint Tokens', 
            icon: <Token />, 
            onClick: handleMintTokens,
            color: '#00d4aa'
          });
        } else {
          // User hasn't provided wallet - show warning action
          actions.push({ 
            label: 'Wallet Required', 
            icon: <WarningIcon />, 
            onClick: (item) => showSnackbar(
              `Cannot mint tokens for "${item.title}": User must connect a wallet address in their profile.`, 
              'warning'
            ),
            color: '#ff9800'
          });
        }
      }
      
      return actions;
    };
    
    return (
      <DataTable
        title="Project Management"
        data={allProjects}
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
          { field: 'estimated_credits', headerName: 'Est. Credits', width: 120, render: (value) => formatCredits(value) },
          { field: 'calculated_credits', headerName: 'Calc. Credits', width: 120, render: (value) => formatCredits(value) },
          { field: 'credits_issued', headerName: 'Issued', width: 120, render: (value) => formatCredits(value) },
          { field: 'wallet_address', headerName: 'Wallet Status', width: 140, render: (value, row) => {
            // Check wallet address from user's profile first, then project
            const userWalletAddress = (row.profiles && row.profiles.wallet_address) || value;
            const walletVerified = row.profiles && row.profiles.wallet_verified;
            
            if (userWalletAddress) {
              const displayText = walletVerified ? '✓ Verified' : '✓ Connected';
              const bgColor = walletVerified ? '#4caf50' : '#2196f3';
              
              return (
                <Chip 
                  label={displayText}
                  size="small" 
                  sx={{ 
                    bgcolor: bgColor,
                    color: '#ffffff',
                    fontWeight: 600
                  }}
                  title={`Wallet: ${userWalletAddress.slice(0, 8)}...${userWalletAddress.slice(-6)}\nSource: ${row.profiles?.wallet_address ? 'User Profile' : 'Project Field'}\nVerified: ${walletVerified ? 'Yes' : 'No'}`}
                />
              );
            } else {
              return (
                <Chip 
                  label="⚠ Missing" 
                  size="small" 
                  sx={{ 
                    bgcolor: '#ff9800',
                    color: '#ffffff',
                    fontWeight: 600
                  }}
                  title={`User ID: ${row.user_id || 'Unknown'}\nUser needs to connect wallet address in their profile`}
                />
              );
            }
          }},
          { field: 'mint_address', headerName: 'Mint Address', width: 120, render: (value) =>
            value ? `${value.slice(0, 6)}...${value.slice(-4)}` : 'N/A'
          },
          { field: 'organization_name', headerName: 'Organization', flex: 1 },
          { field: 'created_at', headerName: 'Submitted', width: 120, render: (value) => formatDate(value) }
        ]}
        getRowActions={getProjectActions}
      />
    );
  }

  function TokensTab() {
    return (
      <DataTable
        title="Token Management"
        data={allTokens}
        loading={dataLoading.tokens}
        error={dataErrors.tokens}
        columns={[
          { field: 'projects', headerName: 'Project', flex: 1, render: (value, row) => {
            const projectName = value?.title || value?.name || 'Unknown Project';
            return (
              <Box>
                <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                  {projectName.length > 30 ? projectName.slice(0, 30) + '...' : projectName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#a0aec0' }}>
                  ID: {row.project_id?.slice(0, 8)}...
                </Typography>
              </Box>
            );
          }},
          { field: 'amount', headerName: 'Amount', width: 120, render: (value) => {
            const formattedAmount = formatCredits(value);
            const [amount, unit] = formattedAmount.split(' ');
            return (
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ color: '#00d4aa', fontWeight: 600 }}>
                  {amount !== 'N/A' ? amount : 'N/A'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#a0aec0' }}>
                  {unit || ''}
                </Typography>
              </Box>
            );
          }},
          { field: 'token_standard', headerName: 'Standard', width: 100, render: (value) => (
            <Chip 
              label={value || 'SPL'} 
              size="small" 
              sx={{ 
                bgcolor: '#00d4aa',
                color: '#ffffff',
                fontWeight: 600
              }}
            />
          )},
          { field: 'status', headerName: 'Status', width: 100, render: (value) => (
            <Chip 
              label={value?.toUpperCase() || 'ACTIVE'} 
              size="small" 
              sx={{
                bgcolor: value === 'active' ? '#4caf50' : value === 'retired' ? '#ff9800' : value === 'burned' ? '#f44336' : '#2196f3',
                color: '#ffffff',
                fontWeight: 600
              }}
            />
          )},
          { field: 'recipient', headerName: 'Recipient', width: 140, render: (value) => 
            value ? (
              <Box>
                <Typography variant="body2" sx={{ color: '#ffffff', fontFamily: 'monospace' }}>
                  {`${value.slice(0, 6)}...${value.slice(-4)}`}
                </Typography>
              </Box>
            ) : 'N/A'
          },
          { field: 'mint', headerName: 'Mint Address', width: 140, render: (value) => 
            value ? (
              <Box>
                <Typography variant="body2" sx={{ color: '#ffffff', fontFamily: 'monospace' }}>
                  {`${value.slice(0, 8)}...${value.slice(-6)}`}
                </Typography>
              </Box>
            ) : 'N/A'
          },
          { field: 'minted_tx', headerName: 'Transaction', width: 120, render: (value) => 
            value ? (
              <Tooltip title="View on Solana Explorer">
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#00d4aa', 
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                  onClick={() => window.open(`https://explorer.solana.com/tx/${value}?cluster=devnet`, '_blank')}
                >
                  {`${value.slice(0, 8)}...`}
                </Typography>
              </Tooltip>
            ) : 'N/A'
          },
          { field: 'created_at', headerName: 'Minted', width: 140, render: (value) => formatDate(value) }
        ]}
        actions={[
          { 
            label: 'View Details', 
            icon: <ViewIcon />, 
            onClick: (item) => {
              // Create a detailed view of the token
              showSnackbar(`Token: ${formatCredits(item.amount)} for ${item.projects?.title || 'Unknown Project'} - Status: ${item.status}`, 'info');
            },
            color: '#2196f3'
          },
          {
            label: 'Solana Explorer',
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
  }

  function ActivityLogsTab() {
    return (
      <DataTable
        title="Admin Activity Logs"
        data={adminLogs}
        loading={dataLoading.logs}
        error={dataErrors.logs}
        columns={[
          { field: 'action', headerName: 'Action', width: 150, render: (value) => 
            value.replace('_', ' ').toUpperCase()
          },
          { field: 'target_type', headerName: 'Target', width: 100 },
          { field: 'details', headerName: 'Details', flex: 1, render: (value) => 
            value ? (value.length > 50 ? value.slice(0, 50) + '...' : value) : 'N/A'
          },
          { field: 'created_at', headerName: 'Date', width: 140, render: (value) => formatDate(value) }
        ]}
      />
    );
  }

  // Generic Data Table Component
  function DataTable({ title, data, loading, error, columns, actions = [], getRowActions }) {
    if (loading) {
      return (
        <Box>
          <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>{title}</Typography>
          <Stack spacing={1}>
            {[...Array(5)].map((_, i) => (
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
                  <TableCell sx={{ bgcolor: '#2d3748', color: '#ffffff', fontWeight: 600, width: 200 }}>
                    Actions
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.slice(0, 100).map((row, index) => (
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
  }
};

export default AdminDashboard;