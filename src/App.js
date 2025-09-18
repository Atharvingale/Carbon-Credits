import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import WalletProviderWrapper from './components/WalletProviderWrapper';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

// Lazy load pages for better performance
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const About = lazy(() => import('./pages/About'));
const Registry = lazy(() => import('./pages/Registry'));
const NewRegistry = lazy(() => import('./pages/NewRegistry'));
const Blog = lazy(() => import('./pages/Blog'));
const ProjectSubmission = lazy(() => import('./pages/ProjectSubmission'));

// Loading component for lazy-loaded routes
const PageLoader = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '50vh',
      flexDirection: 'column',
      gap: 2,
      bgcolor: '#0f1419'
    }}
  >
    <CircularProgress size={40} sx={{ color: '#00d4aa' }} />
    <Box sx={{ color: '#a0a9ba', fontSize: '0.9rem' }}>Loading...</Box>
  </Box>
);

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <WalletProviderWrapper>
          <div className="App">
          <Suspense fallback={<PageLoader />}>
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/about" element={<About />} />
            <Route path='/registry' element={<Registry />} />
            <Route path='/new-registry' element={<NewRegistry />} />
            <Route path='/blog' element={<Blog />} />
            <Route path='/submit-project' element={
              <ProtectedRoute>
                <ProjectSubmission />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </Suspense>
          </div>
        </WalletProviderWrapper>
      </Router>
    </ErrorBoundary>
  );
}

export default App;