import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { supabase } from '../lib/supabaseClient';
import ConnectWallet from '../components/ConnectWallet';
import TokenList from '../components/TokenList';
import { Link } from 'react-router-dom';
import { 
  Box, Container, Typography, Paper, Grid, Button, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  CircularProgress, Alert 
} from '@mui/material';

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
          User Dashboard
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={4}>
          {/* Wallet Connection */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Wallet Connection
              </Typography>
              <ConnectWallet />
              
              {publicKey ? (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body1">
                    Full Address: {publicKey.toString()}
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1 }}>
                    SOL Balance: {solBalance.toFixed(4)} SOL
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
                  Please connect your wallet to view your carbon credits and transaction history.
                </Typography>
              )}
            </Paper>
          </Grid>
          
          {/* Carbon Credit Tokens */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Carbon Credits
              </Typography>
              
              {!publicKey ? (
                <Typography variant="body2" color="text.secondary">
                  Connect your wallet to view your carbon credits.
                </Typography>
              ) : (
                <TokenList tokens={tokens} cluster="devnet" />
              )}
            </Paper>
          </Grid>
          
          {/* Transaction History */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Recent Transactions
              </Typography>
              
              {!publicKey ? (
                <Typography variant="body2" color="text.secondary">
                  Connect your wallet to view your transaction history.
                </Typography>
              ) : transactions.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No recent transactions found.
                </Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Signature</TableCell>
                        <TableCell align="right">Status</TableCell>
                        <TableCell align="right">View</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.signature}>
                          <TableCell component="th" scope="row">
                            {tx.signature.slice(0, 6)}...{tx.signature.slice(-4)}
                          </TableCell>
                          <TableCell align="right">
                            {tx.confirmationStatus}
                          </TableCell>
                          <TableCell align="right">
                            <Button 
                              size="small" 
                              variant="outlined"
                              href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Explorer
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>
          
          {/* Submit Project Section */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Submit New Project
              </Typography>
              <Typography variant="body2" paragraph>
                Have a blue carbon project? Submit it for verification and carbon credit minting.
              </Typography>
              <Button 
                component={Link} 
                to="/submit-project"
                variant="contained" 
                sx={{ 
                  backgroundColor: '#2a9d8f',
                  '&:hover': { backgroundColor: '#238276' }
                }}
              >
                Submit Project
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default UserDashboard;