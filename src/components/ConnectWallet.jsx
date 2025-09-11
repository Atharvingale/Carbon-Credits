import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
import { Box, Typography, Chip } from '@mui/material';
import { formatPublicKey } from '../lib/solana';

export default function ConnectWallet() {
  const { publicKey, connected } = useWallet();
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <WalletMultiButton 
        style={{
          backgroundColor: connected ? '#4CAF50' : '#2a9d8f',
          borderRadius: '8px',
          height: '48px',
          fontSize: '16px',
          fontWeight: 600
        }}
      />
      {publicKey && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            Connected:
          </Typography>
          <Chip 
            label={formatPublicKey(publicKey, 4)}
            size="small"
            color="success"
            variant="outlined"
            sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
          />
        </Box>
      )}
    </Box>
  );
}
