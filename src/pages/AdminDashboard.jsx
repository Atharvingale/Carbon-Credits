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

  // Authentication check
  const checkAuthentication = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
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
        console.error('Profile fetch error:', profileError);
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
      console.error('Authentication check failed:', error);
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
      console.log('👥 Fetching users...');
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, email, full_name, role, organization_name, organization_type,
          phone_number, is_blocked, block_reason, blocked_at,
          is_verified, verification_date, created_at, updated_at
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log(`✅ Loaded ${data?.length || 0} users`);
      setAllUsers(data || []);
      
    } catch (error) {
      console.error('❌ Users fetch error:', error);
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
      console.log('📁 Fetching projects...');
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
            full_name, email
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
      
      console.log(`✅ Loaded ${data?.length || 0} projects`);
      
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
                
                // Optionally update the database with estimated credits
                // We'll do this asynchronously without blocking the UI
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
      
      setAllProjects(normalizedProjects);
      
    } catch (error) {
      console.error('❌ Projects fetch error:', error);
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
      console.log('🪙 Fetching tokens...');
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
      
      console.log(`✅ Loaded ${data?.length || 0} tokens`);
      setAllTokens(data || []);
      
    } catch (error) {
      console.error('❌ Tokens fetch error:', error);
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
      console.log('📈 Fetching admin logs...');
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
      
      console.log(`✅ Loaded ${data?.length || 0} admin logs`);
      setAdminLogs(data || []);
      
    } catch (error) {
      console.error('❌ Admin logs fetch error:', error);
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
      console.log('📊 Calculating dashboard statistics...');
      
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
      
      console.log('✅ Dashboard statistics calculated:', stats);
      setDashboardStats(stats);
      
    } catch (error) {
      console.error('❌ Dashboard stats fetch error:', error);
      setErrorState('stats', `Failed to calculate statistics: ${error.message}`);
    } finally {
      setLoadingState('stats', false);
    }
  }, [setLoadingState, setErrorState]);

  // Main data fetching function
  const fetchAllData = useCallback(async () => {
    console.log('🔄 Fetching all admin dashboard data...');
    
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
      console.log('✅ All data fetching completed');
    } catch (error) {
      console.error('❌ Error during data fetching:', error);
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
      console.error('Refresh failed:', error);
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

  // Project action handlers
  const handleProjectReview = useCallback((project) => {
    console.log('Opening project review for:', project.title);
    setProjectDetailDialog({ open: true, project });
  }, []);

  const handleProjectCalculate = useCallback((project) => {
    console.log('Opening calculator for:', project.title);
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
      console.error('Error approving project:', error);
      showSnackbar(`Failed to approve project: ${error.message}`, 'error');
    } finally {
      setLoadingState('projects', false);
    }
  }, [fetchProjects, showSnackbar, setLoadingState]);

  const handleCreditCalculated = useCallback(async (credits, calculationDetails) => {
    try {
      if (!selectedProject) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('projects')
        .update({ 
          calculated_credits: credits,
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
      console.error('Error updating calculated credits:', error);
      showSnackbar(`Failed to update credits: ${error.message}`, 'error');
    }
  }, [selectedProject, fetchProjects, showSnackbar]);

  const handleDialogClose = useCallback((dialogType) => {
    if (dialogType === 'detail') {
      setProjectDetailDialog({ open: false, project: null });
    } else if (dialogType === 'calculator') {
      setCalculatorDialog({ open: false, project: null });
      setSelectedProject(null);
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

  // Minting functionality
  const handleMintTokens = useCallback(async (project) => {
    try {
      setLoadingState('projects', true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showSnackbar('Authentication required for minting', 'error');
        return;
      }
      
      // Check if user has provided wallet address
      if (!project.wallet_address) {
        showSnackbar('Cannot mint tokens: User has not provided a wallet address. Please ask the user to add their wallet address to their project.', 'error');
        return;
      }
      
      // Validate wallet address format (basic Solana address validation)
      const walletRegex = /^[A-Za-z0-9]{32,44}$/;
      if (!walletRegex.test(project.wallet_address)) {
        showSnackbar('Invalid wallet address format. Please verify the wallet address in the project details.', 'error');
        return;
      }
      
      const recipientWallet = project.wallet_address;
      
      // Use calculated credits (prioritize calculated over estimated for accuracy)
      let creditsToMint;
      let creditSource;
      
      if (project.calculated_credits && project.calculated_credits > 0) {
        creditsToMint = project.calculated_credits;
        creditSource = 'calculated';
      } else if (project.estimated_credits && project.estimated_credits > 0) {
        creditsToMint = project.estimated_credits;
        creditSource = 'estimated';
        
        // Warn admin if using estimated instead of calculated
        const useEstimated = window.confirm(
          `⚠️ WARNING: Using ESTIMATED credits instead of calculated credits.\n\n` +
          `Estimated: ${parseInt(project.estimated_credits).toLocaleString()} CCR\n\n` +
          `For data authenticity, it's recommended to calculate exact credits first.\n\n` +
          `Continue with estimated credits?`
        );
        
        if (!useEstimated) {
          showSnackbar('Minting cancelled. Please calculate exact credits first.', 'info');
          return;
        }
      } else {
        showSnackbar('No credits available for minting. Please calculate credits first.', 'error');
        return;
      }
      
      // Ensure whole number of credits (no fractional tokens)
      const exactCredits = Math.floor(creditsToMint);
      if (exactCredits !== creditsToMint) {
        const proceedFractional = window.confirm(
          `⚠️ PRECISION WARNING: Credits contain decimal places.\n\n` +
          `Original: ${creditsToMint} CCR\n` +
          `Will mint: ${exactCredits} CCR (rounded down)\n\n` +
          `Continue with ${exactCredits} tokens?`
        );
        
        if (!proceedFractional) {
          showSnackbar('Minting cancelled due to fractional credits.', 'info');
          return;
        }
        
        creditsToMint = exactCredits;
      }
      
      // Show detailed confirmation dialog with all critical information
      const confirmed = window.confirm(
        `🔒 IMMUTABLE TOKEN MINTING CONFIRMATION\n\n` +
        `Project: "${project.title}"\n` +
        `Credits to Mint: ${parseInt(creditsToMint).toLocaleString()} CCR\n` +
        `Credit Source: ${creditSource.toUpperCase()}\n` +
        `Recipient: ${recipientWallet}\n\n` +
        `⚠️ IMPORTANT: This action is IRREVERSIBLE\n` +
        `Once minted, tokens cannot be modified or recalled.\n\n` +
        `Confirm minting ${parseInt(creditsToMint).toLocaleString()} tokens?`
      );
      
      if (!confirmed) {
        showSnackbar('Token minting cancelled', 'info');
        return;
      }
      
      showSnackbar(`Minting ${creditsToMint} credits...`, 'info');
      
      // Create verification hash for authenticity
      const apiVerificationData = {
        projectId: project.id,
        projectTitle: project.title,
        creditsToMint: parseInt(creditsToMint),
        creditSource: creditSource,
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
          projectId: project.id,
          recipientWallet: recipientWallet,
          amount: creditsToMint.toString(),
          decimals: 0,
          verificationData: apiVerificationData
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const mintResult = await response.json();
      
      // Create immutable verification record
      const mintingVerificationData = {
        original_calculated_credits: project.calculated_credits,
        original_estimated_credits: project.estimated_credits,
        credits_source: creditSource,
        credits_requested: parseInt(creditsToMint),
        credits_minted: parseInt(creditsToMint),
        mint_transaction: mintResult.tx,
        mint_address: mintResult.mint,
        recipient_wallet: recipientWallet,
        verification_timestamp: new Date().toISOString()
        // verification_admin will be set after getting user info
      };
      
      // Get user info for verification and logging
      const { data: { user } } = await supabase.auth.getUser();
      
      // Add admin info to verification data
      mintingVerificationData.verification_admin = user?.id;
      
      // Update project status to reflect successful minting with verification
      const projectUpdate = await supabase
        .from('projects')
        .update({
          status: 'credits_minted',
          mint_address: mintResult.mint,
          credits_issued: parseInt(creditsToMint),
          credits_source: creditSource,
          minting_verification: mintingVerificationData,
          minted_at: new Date().toISOString(),
          is_immutable: true // Mark as immutable after minting
        })
        .eq('id', project.id);
      
      if (projectUpdate.error) {
        console.error('Project update error:', projectUpdate.error);
        showSnackbar('Warning: Tokens minted but project update failed', 'warning');
      }
      
      // Token verification is built into the minting process
      // Amount matching is enforced by server-side validation
      
      // Log admin action
      await supabase.from('admin_logs').insert([{
        admin_id: user?.id,
        action: 'tokens_minted',
        target_type: 'project',
        target_id: project.id,
        details: `Minted ${creditsToMint} credits for project: ${project.title}. Mint: ${mintResult.mint}, Tx: ${mintResult.tx}`
      }]);
      
      showSnackbar(`Successfully minted ${creditsToMint} credits! View on Solana Explorer: ${mintResult.explorer_url}`, 'success');
      
      // Refresh projects and tokens to show updated state
      await Promise.all([fetchProjects(), fetchTokens()]);
      
    } catch (error) {
      console.error('Error minting tokens:', error);
      showSnackbar(`Failed to mint tokens: ${error.message}`, 'error');
    } finally {
      setLoadingState('projects', false);
    }
  }, [showSnackbar, setLoadingState, fetchProjects, fetchTokens]);

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
    return (
      <DataTable
        title="User Management"
        data={allUsers}
        loading={dataLoading.users}
        error={dataErrors.users}
        columns={[
          { field: 'email', headerName: 'Email', flex: 1 },
          { field: 'full_name', headerName: 'Full Name', flex: 1 },
          { field: 'organization_name', headerName: 'Organization', width: 200 },
          { field: 'role', headerName: 'Role', width: 120, render: (value) => (
            <Chip 
              label={value} 
              size="small" 
              sx={{ 
                bgcolor: value === 'admin' ? '#00d4aa' : value === 'verifier' ? '#ff9800' : '#2d3748',
                color: '#ffffff'
              }}
            />
          )},
          { field: 'is_verified', headerName: 'Verified', width: 100, render: (value) => (
            <Chip 
              label={value ? 'Yes' : 'No'} 
              size="small" 
              color={value ? 'success' : 'default'}
            />
          )},
          { field: 'created_at', headerName: 'Joined', width: 120, render: (value) => formatDate(value) },
          { field: 'is_blocked', headerName: 'Status', width: 100, render: (value) => (
            <Chip 
              label={value ? 'Blocked' : 'Active'} 
              size="small" 
              color={value ? 'error' : 'success'}
            />
          )}
        ]}
        actions={[
          { label: 'Edit', icon: <EditIcon />, onClick: (item) => console.log('Edit user', item) },
          { label: 'Block/Unblock', icon: <BlockIcon />, onClick: (item) => console.log('Block user', item) }
        ]}
      />
    );
  }

  function ProjectsTab() {
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
        
        if (project.wallet_address) {
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
              `Cannot mint tokens for "${item.title}": User must provide a wallet address in their project submission.`, 
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
            let color = 'default';
            let bgcolor = '#2d3748';
            
            switch(value) {
              case 'approved': color = 'success'; bgcolor = '#2e7d32'; break;
              case 'pending': color = 'warning'; bgcolor = '#ed6c02'; break;
              case 'rejected': color = 'error'; bgcolor = '#d32f2f'; break;
              case 'credits_calculated': color = 'info'; bgcolor = '#0288d1'; break;
              case 'credits_minted': bgcolor = '#00d4aa'; color = 'default'; break;
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
          { field: 'credits_issued', headerName: 'Issued', width: 120, render: (value) => 
            value ? `${parseInt(value).toLocaleString()} CCR` : 'N/A'
          },
          { field: 'wallet_address', headerName: 'Wallet Status', width: 120, render: (value) => {
            if (value) {
              return (
                <Chip 
                  label="✓ Provided" 
                  size="small" 
                  sx={{ 
                    bgcolor: '#4caf50',
                    color: '#ffffff',
                    fontWeight: 600
                  }}
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
              const details = `Token Details:\n\nAmount: ${parseInt(item.amount).toLocaleString()} CCR\nMint: ${item.mint}\nRecipient: ${item.recipient}\nTransaction: ${item.minted_tx}\nProject: ${item.projects?.title || 'Unknown'}\nStatus: ${item.status}\nMinted: ${formatDate(item.created_at)}`;
              alert(details);
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
                      {column.render ? column.render(row[column.field]) : (row[column.field] || 'N/A')}
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