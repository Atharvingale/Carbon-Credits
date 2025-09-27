import React from 'react';
import { Box, Typography, Button, Alert, AlertTitle } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Here you would typically log to an error reporting service like Sentry
    if (process.env.REACT_APP_SENTRY_DSN) {
      // Sentry.captureException(error, { contexts: { errorInfo } });
    }
  }

  handleReload = () => {
    window.location.reload();
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <Box sx={{
          minHeight: '100vh',
          bgcolor: '#0a0f1c',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3
        }}>
          <Box sx={{ maxWidth: 600, textAlign: 'center' }}>
            <ErrorOutline sx={{ fontSize: 80, color: '#ff6b6b', mb: 2 }} />
            
            <Typography variant="h4" gutterBottom>
              Oops! Something went wrong
            </Typography>
            
            <Alert severity="error" sx={{ mb: 3, bgcolor: '#2d1b1b', color: '#ffcdd2' }}>
              <AlertTitle>Application Error</AlertTitle>
              We encountered an unexpected error. Our team has been notified.
            </Alert>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box sx={{ 
                mt: 2, 
                p: 2, 
                bgcolor: '#1a1a1a', 
                borderRadius: 1, 
                textAlign: 'left',
                overflow: 'auto',
                maxHeight: 200
              }}>
                <Typography variant="body2" component="pre" sx={{ fontSize: '0.8rem', color: '#ff8a80' }}>
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={this.handleReset}
                startIcon={<Refresh />}
                sx={{
                  bgcolor: '#00d4aa',
                  color: '#ffffff',
                  '&:hover': { bgcolor: '#00b899' }
                }}
              >
                Try Again
              </Button>
              
              <Button
                variant="outlined"
                onClick={this.handleReload}
                sx={{
                  color: '#ffffff',
                  borderColor: '#ffffff',
                  '&:hover': { borderColor: '#00d4aa', color: '#00d4aa' }
                }}
              >
                Reload Page
              </Button>
            </Box>

            <Typography variant="body2" sx={{ mt: 3, color: '#a0aec0' }}>
              If this problem persists, please contact support.
            </Typography>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;