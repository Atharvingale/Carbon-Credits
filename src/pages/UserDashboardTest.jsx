import React from 'react';
import { Box, Typography } from '@mui/material';

const UserDashboardTest = () => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0f1c', p: 3 }}>
      <Typography variant="h4" sx={{ color: '#ffffff' }}>
        User Dashboard Test - Working!
      </Typography>
      <Typography variant="body1" sx={{ color: '#a0aec0', mt: 2 }}>
        This is a simple test to verify the dashboard route is working.
      </Typography>
    </Box>
  );
};

export default UserDashboardTest;