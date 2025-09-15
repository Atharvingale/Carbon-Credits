import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Box, CircularProgress, Typography } from '@mui/material';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('ProtectedRoute - Session check:', { session: !!session, error: sessionError });
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setUser(null);
          setLoading(false);
          return;
        }

        if (!session || !session.user) {
          console.log('ProtectedRoute - No session found, redirecting to login');
          setUser(null);
          setLoading(false);
          return;
        }

        console.log('ProtectedRoute - User authenticated:', session.user.email);
        setUser(session.user);

        // If admin access is required, check user role
        if (adminOnly) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Profile error:', profileError);
            setLoading(false);
            return;
          }

          setIsAdmin(profile?.role === 'admin');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        } finally {
          setLoading(false);
          setAuthChecked(true);
        }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('ProtectedRoute - Auth state change:', { event, hasSession: !!session });
      
      if (event === 'SIGNED_OUT') {
        console.log('ProtectedRoute - User signed out');
        setUser(null);
        setIsAdmin(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('ProtectedRoute - User signed in/token refreshed');
        setUser(session?.user || null);
        // Re-check admin status if needed
        if (adminOnly && session?.user) {
          checkAuth();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [adminOnly]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '50vh',
          gap: 2
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Checking authentication...
        </Typography>
      </Box>
    );
  }

  // Redirect to login if not authenticated and auth check is complete
  if (authChecked && !user) {
    console.log('ProtectedRoute - Redirecting to login (no user)', { 
      path: location.pathname,
      authChecked,
      user: !!user 
    });
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // If still loading or auth not checked, show loading
  if (!authChecked || loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '50vh',
          gap: 2
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Verifying authentication...
        </Typography>
      </Box>
    );
  }

  // Redirect to user dashboard if admin access required but user is not admin
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render protected content
  return children;
};

export default ProtectedRoute;
