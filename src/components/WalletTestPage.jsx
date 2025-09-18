import React from 'react';
import { Box, Container, Typography, Card, CardContent, Grid } from '@mui/material';
import ConnectWallet from './ConnectWallet_New';
import { useWallet } from '../hooks/useWallet';

export default function WalletTestPage() {
  const wallet = useWallet();

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#0a0f1c', 
      color: '#ffffff',
      py: 4 
    }}>
      <Container maxWidth="lg">
        <Typography variant="h3" sx={{ 
          textAlign: 'center', 
          mb: 4, 
          color: '#ffffff' 
        }}>
          🔗 Wallet Connection Test
        </Typography>
        
        <Grid container spacing={4}>
          {/* Connect Wallet Component */}
          <Grid item xs={12} md={8}>
            <Card sx={{ bgcolor: '#1a2332', border: '1px solid #2d3748' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ mb: 3, color: '#ffffff' }}>
                  Connect Your Browser Extension Wallet
                </Typography>
                <ConnectWallet
                  showSaveButton={true}
                  showDetails={true}
                  autoSave={false}
                  size="large"
                  onWalletSaved={(address) => {
                    console.log('Wallet saved:', address);
                    alert(`Wallet connected: ${address.slice(0, 8)}...${address.slice(-6)}`);
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Wallet Status */}
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#1a2332', border: '1px solid #2d3748' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#ffffff' }}>
                  Wallet Status
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                    <strong>Loading:</strong> {wallet.loading ? '✅' : '❌'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                    <strong>Connected:</strong> {wallet.connected ? '✅' : '❌'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                    <strong>Has Wallet:</strong> {wallet.hasWallet ? '✅' : '❌'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                    <strong>Public Key:</strong> {wallet.publicKey || 'None'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                    <strong>Saved Address:</strong> {wallet.walletAddress ? `${wallet.walletAddress.slice(0, 8)}...${wallet.walletAddress.slice(-6)}` : 'None'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                    <strong>Error:</strong> {wallet.error || 'None'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#a0aec0', maxWidth: '600px', mx: 'auto' }}>
            This test page shows the ConnectWallet component in action. Users can:
            <br />• Click "Connect Wallet" to see available browser extension wallets
            <br />• Select their preferred wallet (Phantom, Solflare, etc.)
            <br />• Approve the connection in their wallet extension
            <br />• Save the wallet address to their account
            <br />• View their wallet status in real-time
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}