import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { supabase } from '../lib/supabaseClient';
import ConnectWallet from '../components/ConnectWallet';
import { Link } from 'react-router-dom';
import { 
  Box, Container, Typography, Paper, Grid, Button, 
  CircularProgress, Alert, Card, CardContent, 
  Avatar, IconButton, LinearProgress, Menu, MenuItem,
  ListItemIcon, ListItemText, Divider
} from '@mui/material';
import { 
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendingUpIcon,
  Nature as EcoIcon,
  Add as AddIcon,
  Receipt as ReceiptIcon,
  BarChart as BarChartIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Home as HomeIcon,
  Assignment as ProjectsIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';

const UserDashboard = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [solBalance, setSolBalance] = useState(0);
  const [tokens, setTokens] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(null);
  const [carbonCredits, setCarbonCredits] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Fetch user's submitted projects
  const fetchUserProjects = async (userId) => {
    setProjectsLoading(true);
    setProjectsError(null);
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          project_name,
          description,
          status,
          location,
          created_at,
          updated_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching user projects:', err);
      setProjectsError('Failed to load your projects. Please try again.');
    } finally {
      setProjectsLoading(false);
    }
  };

  // Check if user is authenticated
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      
      setUser(session.user);
      setLoading(false);
      
      // Fetch user's projects after authentication
      if (session.user) {
        fetchUserProjects(session.user.id);
      }
    };
    
    checkUser();
  }, [navigate]);

  // Fetch wallet balances when wallet is connected
  useEffect(() => {
    if (!publicKey || !connection) return;
    
    const fetchBalances = async () => {
      try {
        // Get SOL balance
        const lamports = await connection.getBalance(publicKey);
        setSolBalance(lamports / 1e9); // Convert lamports to SOL
        
        // Get SPL token balances
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey, 
          { programId: TOKEN_PROGRAM_ID }
        );
        
        const parsedTokens = tokenAccounts.value.map(ta => {
          const info = ta.account.data.parsed.info;
          return {
            mint: info.mint,
            amount: info.tokenAmount.uiAmount,
            decimals: info.tokenAmount.decimals
          };
        });
        
        setTokens(parsedTokens);
        
        // Get recent transactions
        const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 5 });
        setTransactions(signatures);
      } catch (err) {
        console.error('Error fetching wallet data:', err);
        setError('Failed to fetch wallet data. Please try again.');
      }
    };
    
    fetchBalances();
  }, [publicKey, connection]);

  // Helper function to get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Menu handlers
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
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

  // Navigation handlers
  const handleNavigation = (path) => {
    navigate(path);
    handleMenuClose();
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

  // Calculate project statistics
  const pendingProjects = projects.filter(p => p.status?.toLowerCase() === 'pending');
  const approvedProjects = projects.filter(p => p.status?.toLowerCase() === 'approved');
  const totalCarbonCredits = tokens.reduce((sum, token) => sum + (token.amount || 0), 0);

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
            User Dashboard
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
                {user?.email?.charAt(0)?.toUpperCase() || 'U'}
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
              
              <MenuItem onClick={() => handleNavigation('/dashboard')}>
                <ListItemIcon>
                  <PersonIcon sx={{ color: '#00d4aa' }} />
                </ListItemIcon>
                <ListItemText>Dashboard</ListItemText>
              </MenuItem>
              
              <MenuItem onClick={() => handleNavigation('/submit-project')}>
                <ListItemIcon>
                  <ProjectsIcon sx={{ color: '#00d4aa' }} />
                </ListItemIcon>
                <ListItemText>Submit Project</ListItemText>
              </MenuItem>
              
              <MenuItem onClick={() => handleNavigation('/projects')}>
                <ListItemIcon>
                  <EcoIcon sx={{ color: '#00d4aa' }} />
                </ListItemIcon>
                <ListItemText>All Projects</ListItemText>
              </MenuItem>
              
              <Divider sx={{ bgcolor: '#2d3748' }} />
              
              <MenuItem onClick={() => handleNavigation('/profile')}>
                <ListItemIcon>
                  <SettingsIcon sx={{ color: '#00d4aa' }} />
                </ListItemIcon>
                <ListItemText>Profile Settings</ListItemText>
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
        
        {/* Main Grid */}
        <Grid container spacing={3}>
          {/* Row 1: Wallet Connection, My Projects, Carbon Credits Balance */}
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
                  <WalletIcon sx={{ color: '#00d4aa', mr: 1, fontSize: 24 }} />
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                    Wallet Connection
                  </Typography>
                </Box>
                
                {!publicKey ? (
                  <Box sx={{ mt: 3 }}>
                    <ConnectWallet />
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" sx={{ color: '#a0aec0', mb: 1 }}>
                      Connected
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#00d4aa', mb: 2 }}>
                      {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                      Balance: {solBalance.toFixed(4)} SOL
                    </Typography>
                  </Box>
                )}
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
                  <EcoIcon sx={{ color: '#00d4aa', mr: 1, fontSize: 24 }} />
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                    My Projects
                  </Typography>
                </Box>
                
                {projectsLoading ? (
                  <CircularProgress size={20} sx={{ color: '#00d4aa' }} />
                ) : projects.length === 0 ? (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                      No projects submitted yet.
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#718096', fontSize: '0.875rem' }}>
                      Start your first!
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h4" sx={{ color: '#00d4aa', fontWeight: 700, mb: 1 }}>
                      {projects.length}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                      {pendingProjects.length} Pending • {approvedProjects.length} Approved
                    </Typography>
                    <Box sx={{ mt: 2, position: 'relative', height: 60 }}>
                      {/* Mini trend visualization */}
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
                  </Box>
                )}
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
                  <EcoIcon sx={{ color: '#00d4aa', mr: 1, fontSize: 24 }} />
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                    Carbon Credits
                  </Typography>
                </Box>
                
                <Typography variant="h3" sx={{ color: '#00d4aa', fontWeight: 700, mb: 1 }}>
                  {totalCarbonCredits.toFixed(2)} CCRs
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                  Connect wallet to view balance
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Row 2: Recent Transactions, Carbon Credits Chart */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              bgcolor: '#1a2332', 
              border: '1px solid #2d3748',
              height: '300px'
            }}>
              <CardContent sx={{ p: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <ReceiptIcon sx={{ color: '#00d4aa', mr: 1, fontSize: 24 }} />
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                    Recent Transactions
                  </Typography>
                </Box>
                
                {!publicKey ? (
                  <Typography variant="body2" sx={{ color: '#a0aec0', textAlign: 'center', mt: 4 }}>
                    Connect Wallet
                  </Typography>
                ) : transactions.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#a0aec0', textAlign: 'center', mt: 4 }}>
                    No recent transactions
                  </Typography>
                ) : (
                  <Box>
                    {transactions.slice(0, 4).map((tx, index) => (
                      <Box key={tx.signature} sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        py: 2,
                        borderBottom: index < 3 ? '1px solid #2d3748' : 'none'
                      }}>
                        <Box>
                          <Typography variant="body2" sx={{ color: '#ffffff' }}>
                            {tx.signature.slice(0, 6)}...{tx.signature.slice(-4)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#a0aec0' }}>
                            {tx.confirmationStatus}
                          </Typography>
                        </Box>
                        <Button 
                          size="small" 
                          sx={{ 
                            color: '#00d4aa',
                            fontSize: '0.75rem',
                            minWidth: 'auto',
                            px: 1
                          }}
                          href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                          target="_blank"
                        >
                          View
                        </Button>
                      </Box>
                    ))}
                    {transactions.length > 4 && (
                      <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Button size="small" sx={{ color: '#00d4aa' }}>
                          View All
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ 
              bgcolor: '#1a2332', 
              border: '1px solid #2d3748',
              height: '300px'
            }}>
              <CardContent sx={{ p: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <BarChartIcon sx={{ color: '#00d4aa', mr: 1, fontSize: 24 }} />
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                    Carbon Credits
                  </Typography>
                </Box>
                
                {/* Simple chart visualization */}
                <Box sx={{ position: 'relative', height: '180px', mt: 2 }}>
                  {totalCarbonCredits > 0 ? (
                    <Box>
                      {/* Mock chart bars */}
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'end', 
                        height: '120px',
                        gap: 1,
                        mb: 2
                      }}>
                        {[20, 35, 25, 45, 60, 40, 55].map((height, index) => (
                          <Box key={index} sx={{
                            flex: 1,
                            height: `${height}%`,
                            bgcolor: index === 6 ? '#00d4aa' : 'rgba(0, 212, 170, 0.3)',
                            borderRadius: '2px 2px 0 0'
                          }} />
                        ))}
                      </Box>
                      <Typography variant="body2" sx={{ color: '#a0aec0', textAlign: 'center' }}>
                        ⚠️ Failed to load history. Please refresh.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      height: '100%'
                    }}>
                      <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                        No carbon credits data
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Row 3: Submit New Project */}
          <Grid item xs={12}>
            <Card sx={{ 
              bgcolor: '#1a2332', 
              border: '1px solid #2d3748'
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AddIcon sx={{ color: '#00d4aa', mr: 1, fontSize: 24 }} />
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                    Submit New Project
                  </Typography>
                </Box>
                
                <Typography variant="body2" sx={{ color: '#a0aec0', mb: 3 }}>
                  Have a blue carbon project? Submit it for verification and carbon credit minting.
                </Typography>
                
                <Button 
                  component={Link} 
                  to="/submit-project"
                  variant="contained"
                  startIcon={<AddIcon />}
                  sx={{ 
                    bgcolor: '#00d4aa',
                    color: '#ffffff',
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    '&:hover': { 
                      bgcolor: '#00b899'
                    }
                  }}
                >
                  Submit Blue Carbon Project
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default UserDashboard;