import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WalletProviderWrapper from './components/WalletProviderWrapper';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import About from './pages/About';
import Registry from './pages/Registry';
import NewRegistry from './pages/NewRegistry';
import Blog from './pages/Blog';
import ProjectSubmission from './pages/ProjectSubmission';
import SimpleDebug from './components/SimpleDebug';

// Add a route


import './App.css';

function App() {
  return (
    <Router>
      <WalletProviderWrapper>
        <div className="App">
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
            <Route path="/debug" element={<SimpleDebug />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </WalletProviderWrapper>
    </Router>
  );
}

export default App;