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

        // Always check user role for proper routing
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

        const role = profile?.role;
        setIsAdmin(role === 'admin');
        
        console.log('ProtectedRoute - User role:', role, 'Is admin:', role === 'admin');
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

  // Handle admin-only routes
  if (adminOnly && !isAdmin) {
    console.log('ProtectedRoute - Admin access required but user is not admin, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  // Handle admin users trying to access regular dashboard - redirect them to admin dashboard
  if (!adminOnly && isAdmin && location.pathname === '/dashboard') {
    console.log('ProtectedRoute - Admin user trying to access regular dashboard, redirecting to admin');
    return <Navigate to="/admin" replace />;
  }

  // Render protected content
  return children;
};

export default ProtectedRoute;
