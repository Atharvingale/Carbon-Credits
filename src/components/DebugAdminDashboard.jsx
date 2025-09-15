import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  BugReport as DebugIcon
} from '@mui/icons-material';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DebugAdminDashboard = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    const results = {};

    try {
      console.log('🔍 Starting diagnostics...');

      // 1. Check authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      results.session = {
        isLoggedIn: !!session,
        userId: session?.user?.id || null,
        userEmail: session?.user?.email || null,
        error: sessionError?.message || null
      };
      console.log('👤 Session:', results.session);

      // 2. Check user profile
      if (session?.user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        results.profile = {
          exists: !!profile,
          role: profile?.role || null,
          name: profile?.full_name || null,
          error: profileError?.message || null
        };
        console.log('👤 Profile:', results.profile);
      }

      // 3. Check project_submissions table
      const { data: submissions, error: submissionsError } = await supabase
        .from('project_submissions')
        .select('*')
        .limit(5);
      
      results.submissions = {
        count: submissions?.length || 0,
        data: submissions || [],
        error: submissionsError?.message || null
      };
      console.log('📋 Submissions:', results.submissions);

      // 4. Check admin view
      const { data: adminView, error: adminViewError } = await supabase
        .from('admin_project_submissions')
        .select('*')
        .limit(5);
      
      results.adminView = {
        count: adminView?.length || 0,
        data: adminView || [],
        error: adminViewError?.message || null
      };
      console.log('👨‍💼 Admin View:', results.adminView);

      // 5. Test direct SQL query
      const { data: directQuery, error: directError } = await supabase
        .rpc('get_submission_count');
      
      results.directQuery = {
        result: directQuery,
        error: directError?.message || null
      };

      // 6. Check projects table
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, status, created_at')
        .limit(5);
      
      results.projects = {
        count: projects?.length || 0,
        data: projects || [],
        error: projectsError?.message || null
      };
      console.log('🏗️ Projects:', results.projects);

    } catch (err) {
      console.error('❌ Diagnostic error:', err);
      setError(err.message);
    }

    setDebugInfo(results);
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const testSubmission = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in first');
        return;
      }

      const testData = {
        user_id: session.user.id,
        title: 'Test Submission ' + new Date().toISOString(),
        description: 'Test description for debugging',
        location: 'Test Location',
        ecosystem_type: 'mangrove',
        project_area: 100,
        organization_name: 'Test Organization',
        organization_email: 'test@example.com',
        carbon_data: {
          bulk_density: 1.2,
          depth: 1.0,
          carbon_percent: 3.5,
          agb_biomass: 150,
          bgb_biomass: 75,
          carbon_fraction: 0.47,
          ch4_flux: 5.2,
          n2o_flux: 0.8,
          baseline_carbon_stock: 120,
          uncertainty_deduction: 0.2
        }
      };

      console.log('🧪 Testing submission with data:', testData);

      const { data, error } = await supabase
        .from('project_submissions')
        .insert([testData])
        .select()
        .single();

      if (error) {
        console.error('❌ Test submission error:', error);
        alert('Test submission failed: ' + error.message);
      } else {
        console.log('✅ Test submission successful:', data);
        alert('Test submission successful! ID: ' + data.id);
        runDiagnostics(); // Refresh diagnostics
      }
    } catch (err) {
      console.error('❌ Test submission error:', err);
      alert('Test submission error: ' + err.message);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 700, mb: 1 }}>
          🔍 Admin Dashboard Debug Panel
        </Typography>
        <Typography variant="body1" sx={{ color: '#a0a9ba' }}>
          This panel helps diagnose issues with project submissions and admin dashboard
        </Typography>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            onClick={runDiagnostics}
            disabled={loading}
            sx={{ bgcolor: '#00d4aa', '&:hover': { bgcolor: '#00b894' } }}
          >
            {loading ? 'Running Diagnostics...' : 'Refresh Diagnostics'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<DebugIcon />}
            onClick={testSubmission}
            sx={{ 
              borderColor: '#2d3748', 
              color: '#a0a9ba',
              '&:hover': { borderColor: '#00d4aa', color: '#00d4aa' }
            }}
          >
            Test Submission
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6">Diagnostic Error</Typography>
          <Typography>{error}</Typography>
        </Alert>
      )}

      {/* Authentication Status */}
      <Accordion sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748', mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}>
          <Typography sx={{ color: '#ffffff', fontWeight: 600 }}>
            👤 Authentication Status {debugInfo.session?.isLoggedIn ? '✅' : '❌'}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ color: '#a0a9ba' }}>
            <Typography><strong>Logged In:</strong> {String(debugInfo.session?.isLoggedIn)}</Typography>
            <Typography><strong>User ID:</strong> {debugInfo.session?.userId || 'None'}</Typography>
            <Typography><strong>Email:</strong> {debugInfo.session?.userEmail || 'None'}</Typography>
            {debugInfo.session?.error && (
              <Typography color="error"><strong>Error:</strong> {debugInfo.session.error}</Typography>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Profile Status */}
      <Accordion sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748', mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}>
          <Typography sx={{ color: '#ffffff', fontWeight: 600 }}>
            👤 Profile Status {debugInfo.profile?.exists ? '✅' : '❌'}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ color: '#a0a9ba' }}>
            <Typography><strong>Profile Exists:</strong> {String(debugInfo.profile?.exists)}</Typography>
            <Typography><strong>Role:</strong> {debugInfo.profile?.role || 'None'}</Typography>
            <Typography><strong>Name:</strong> {debugInfo.profile?.name || 'None'}</Typography>
            {debugInfo.profile?.error && (
              <Typography color="error"><strong>Error:</strong> {debugInfo.profile.error}</Typography>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Project Submissions */}
      <Accordion sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748', mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}>
          <Typography sx={{ color: '#ffffff', fontWeight: 600 }}>
            📋 Project Submissions ({debugInfo.submissions?.count || 0})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ color: '#a0a9ba' }}>
            <Typography><strong>Count:</strong> {debugInfo.submissions?.count || 0}</Typography>
            {debugInfo.submissions?.error && (
              <Typography color="error"><strong>Error:</strong> {debugInfo.submissions.error}</Typography>
            )}
            {debugInfo.submissions?.data?.length > 0 ? (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" sx={{ color: '#00d4aa', mb: 1 }}>Recent Submissions:</Typography>
                {debugInfo.submissions.data.map((submission, index) => (
                  <Paper key={index} sx={{ bgcolor: '#1a2332', p: 2, mb: 1 }}>
                    <Typography><strong>Title:</strong> {submission.title}</Typography>
                    <Typography><strong>Status:</strong> {submission.status}</Typography>
                    <Typography><strong>Organization:</strong> {submission.organization_name}</Typography>
                    <Typography><strong>Created:</strong> {new Date(submission.created_at).toLocaleString()}</Typography>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography color="warning.main">No submissions found</Typography>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Admin View */}
      <Accordion sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748', mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}>
          <Typography sx={{ color: '#ffffff', fontWeight: 600 }}>
            👨‍💼 Admin View ({debugInfo.adminView?.count || 0})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ color: '#a0a9ba' }}>
            <Typography><strong>Count:</strong> {debugInfo.adminView?.count || 0}</Typography>
            {debugInfo.adminView?.error && (
              <Typography color="error"><strong>Error:</strong> {debugInfo.adminView.error}</Typography>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Projects Table */}
      <Accordion sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748', mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}>
          <Typography sx={{ color: '#ffffff', fontWeight: 600 }}>
            🏗️ Projects Table ({debugInfo.projects?.count || 0})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ color: '#a0a9ba' }}>
            <Typography><strong>Count:</strong> {debugInfo.projects?.count || 0}</Typography>
            {debugInfo.projects?.error && (
              <Typography color="error"><strong>Error:</strong> {debugInfo.projects.error}</Typography>
            )}
            {debugInfo.projects?.data?.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" sx={{ color: '#00d4aa', mb: 1 }}>Recent Projects:</Typography>
                {debugInfo.projects.data.map((project, index) => (
                  <Paper key={index} sx={{ bgcolor: '#1a2332', p: 2, mb: 1 }}>
                    <Typography><strong>Name:</strong> {project.name}</Typography>
                    <Typography><strong>Status:</strong> {project.status}</Typography>
                    <Typography><strong>Created:</strong> {new Date(project.created_at).toLocaleString()}</Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="h6">Next Steps:</Typography>
        <Typography>1. Ensure you've run the database migration: <code>complete_database_migration.sql</code></Typography>
        <Typography>2. Make sure you're logged in and have a profile</Typography>
        <Typography>3. Try submitting a test project using the form</Typography>
        <Typography>4. Check browser console for detailed logs</Typography>
      </Alert>
    </Container>
  );
};

export default DebugAdminDashboard;