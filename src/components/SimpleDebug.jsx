import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button, Container, Typography, Box, Paper, Alert } from '@mui/material';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SimpleDebug = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    setLoading(true);
    const debugResults = {};

    console.log('🔍 Starting debug...');

    // 1. Check authentication
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      debugResults.auth = {
        isLoggedIn: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        error: error?.message
      };
      console.log('👤 Auth result:', debugResults.auth);
    } catch (err) {
      debugResults.auth = { error: err.message };
    }

    // 2. Test direct project_submissions query
    try {
      const { data, error, count } = await supabase
        .from('project_submissions')
        .select('*', { count: 'exact' });
      
      debugResults.directTable = {
        success: !error,
        count: count || data?.length || 0,
        data: data?.slice(0, 2), // First 2 records
        error: error?.message
      };
      console.log('📋 Direct table result:', debugResults.directTable);
    } catch (err) {
      debugResults.directTable = { error: err.message };
    }

    // 3. Test admin_project_submissions view
    try {
      const { data, error, count } = await supabase
        .from('admin_project_submissions')
        .select('*', { count: 'exact' });
      
      debugResults.adminView = {
        success: !error,
        count: count || data?.length || 0,
        data: data?.slice(0, 2),
        error: error?.message
      };
      console.log('👨‍💼 Admin view result:', debugResults.adminView);
    } catch (err) {
      debugResults.adminView = { error: err.message };
    }

    // 4. Test user_projects view
    try {
      const { data, error, count } = await supabase
        .from('user_projects')
        .select('*', { count: 'exact' });
      
      debugResults.userView = {
        success: !error,
        count: count || data?.length || 0,
        data: data?.slice(0, 2),
        error: error?.message
      };
      console.log('👤 User view result:', debugResults.userView);
    } catch (err) {
      debugResults.userView = { error: err.message };
    }

    // 5. Check profiles
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role')
        .limit(1);
      
      debugResults.profiles = {
        success: !error,
        count: data?.length || 0,
        currentUserProfile: data?.[0],
        error: error?.message
      };
      console.log('👥 Profiles result:', debugResults.profiles);
    } catch (err) {
      debugResults.profiles = { error: err.message };
    }

    setResults(debugResults);
    setLoading(false);
  };

  useEffect(() => {
    runDebug();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ color: '#ffffff', mb: 4 }}>
        🔍 Debug Dashboard Data Flow
      </Typography>

      <Button 
        variant="contained" 
        onClick={runDebug} 
        disabled={loading}
        sx={{ mb: 4, bgcolor: '#00d4aa' }}
      >
        {loading ? 'Running Debug...' : 'Refresh Debug'}
      </Button>

      {/* Authentication Status */}
      <Paper sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748', p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2 }}>
          👤 Authentication Status
        </Typography>
        <Typography sx={{ color: '#ffffff' }}>
          Logged In: {String(results.auth?.isLoggedIn)} <br/>
          User ID: {results.auth?.userId || 'None'} <br/>
          Email: {results.auth?.email || 'None'} <br/>
          {results.auth?.error && <span style={{ color: '#ff4444' }}>Error: {results.auth.error}</span>}
        </Typography>
      </Paper>

      {/* Direct Table Access */}
      <Paper sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748', p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2 }}>
          📋 Direct project_submissions Table
        </Typography>
        <Typography sx={{ color: '#ffffff' }}>
          Success: {String(results.directTable?.success)} <br/>
          Count: {results.directTable?.count || 0} <br/>
          {results.directTable?.error && <span style={{ color: '#ff4444' }}>Error: {results.directTable.error}</span>}
        </Typography>
        {results.directTable?.data?.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ color: '#a0a9ba', fontSize: '0.9rem' }}>
              Sample Data: {JSON.stringify(results.directTable.data[0], null, 2)}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Admin View */}
      <Paper sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748', p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2 }}>
          👨‍💼 admin_project_submissions View
        </Typography>
        <Typography sx={{ color: '#ffffff' }}>
          Success: {String(results.adminView?.success)} <br/>
          Count: {results.adminView?.count || 0} <br/>
          {results.adminView?.error && <span style={{ color: '#ff4444' }}>Error: {results.adminView.error}</span>}
        </Typography>
      </Paper>

      {/* User View */}
      <Paper sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748', p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2 }}>
          👤 user_projects View
        </Typography>
        <Typography sx={{ color: '#ffffff' }}>
          Success: {String(results.userView?.success)} <br/>
          Count: {results.userView?.count || 0} <br/>
          {results.userView?.error && <span style={{ color: '#ff4444' }}>Error: {results.userView.error}</span>}
        </Typography>
      </Paper>

      {/* Profiles */}
      <Paper sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748', p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2 }}>
          👥 Profiles Table
        </Typography>
        <Typography sx={{ color: '#ffffff' }}>
          Success: {String(results.profiles?.success)} <br/>
          Current User Profile: {JSON.stringify(results.profiles?.currentUserProfile)} <br/>
          {results.profiles?.error && <span style={{ color: '#ff4444' }}>Error: {results.profiles.error}</span>}
        </Typography>
      </Paper>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="h6">What to check:</Typography>
        <Typography>1. All queries should show "Success: true"</Typography>
        <Typography>2. Direct table should show your submitted projects</Typography>
        <Typography>3. Views should show data if they exist</Typography>
        <Typography>4. Check browser console for detailed logs</Typography>
      </Alert>
    </Container>
  );
};

export default SimpleDebug;