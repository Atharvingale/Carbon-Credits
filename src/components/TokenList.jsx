import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Box,
  Button
} from '@mui/material';
import { formatPublicKey, getExplorerUrl } from '../lib/solana';

const TokenList = ({ tokens, cluster = 'devnet' }) => {
  if (!tokens || tokens.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <Typography variant="body2" color="text.secondary">
          No carbon credit tokens found in your wallet.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Tokens will appear here once they are minted to your wallet by an admin.
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} elevation={0}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Token Mint</TableCell>
            <TableCell align="center">Amount</TableCell>
            <TableCell align="center">Type</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tokens.map((token) => (
            <TableRow key={token.mint} hover>
              <TableCell component="th" scope="row">
                <Typography variant="body2" fontFamily="monospace">
                  {formatPublicKey(token.mint, 8)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2" fontWeight={600}>
                  {token.amount?.toLocaleString() || '0'}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Chip
                  label="Carbon Credit"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 500
                  }}
                />
              </TableCell>
              <TableCell align="right">
                <Button
                  size="small"
                  variant="outlined"
                  href={getExplorerUrl(token.mint, cluster)}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    fontSize: '0.75rem',
                    px: 2
                  }}
                >
                  View on Explorer
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TokenList;
