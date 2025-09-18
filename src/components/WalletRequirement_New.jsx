import React, { useState } from 'react';
import {
  Box,
  Alert,
  Button,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Fade,
  Zoom,
  Skeleton,
  Link
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Verified as VerifiedIcon,
  Assignment as AssignmentIcon,
  Help as HelpIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useWalletRequirement } from '../hooks/useWallet';
import ConnectWallet from './ConnectWallet_New';

/**
 * Enhanced WalletRequirement component with better accessibility and UX
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to show when wallet requirement is met
 * @param {string} [props.context] - Context for wallet requirement message
 * @param {string} [props.actionName] - Name of the action being blocked
 * @param {boolean} [props.showWalletConnection] - Whether to show wallet connection component
 * @param {boolean} [props.showSteps] - Whether to show step-by-step instructions
 * @param {boolean} [props.showFAQ] - Whether to show FAQ section
 * @param {Function} [props.onWalletConnected] - Callback when wallet is connected
 * @param {Function} [props.onRequirementMet] - Callback when requirement is met
 * @param {Object} [props.customMessages] - Custom messages override
 */
export default function WalletRequirement({
  children,
  context = 'project_creation',
  actionName = 'perform this action',
  showWalletConnection = true,
  showSteps = true,
  showFAQ = false,
  onWalletConnected,
  onRequirementMet,
  customMessages = {}
}) {
  const navigate = useNavigate();
  const wallet = useWalletRequirement(context);
  const [activeStep, setActiveStep] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  // Handle wallet connection success
  const handleWalletConnected = (walletAddress) => {
    if (onWalletConnected) {
      onWalletConnected(walletAddress);
    }
  };

  // Handle requirement met
  React.useEffect(() => {
    if (wallet.isRequirementMet && onRequirementMet) {
      onRequirementMet();
    }
  }, [wallet.isRequirementMet, onRequirementMet]);

  // Auto-advance steps based on wallet state
  React.useEffect(() => {
    if (wallet.user && activeStep === 0) {
      setActiveStep(1);
    }
    if (wallet.connected && activeStep === 1) {
      setActiveStep(2);
    }
    if (wallet.hasWallet && activeStep === 2) {
      setActiveStep(3);
    }
  }, [wallet.user, wallet.connected, wallet.hasWallet, activeStep]);

  // Loading skeleton
  const LoadingSkeleton = () => (
    <Card sx={{ bgcolor: '#1a2332', maxWidth: '800px', mx: 'auto', mt: 4 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Skeleton variant="circular" width={64} height={64} sx={{ mx: 'auto', mb: 2 }} />
          <Skeleton variant="text" width="60%" height={40} sx={{ mx: 'auto', mb: 2 }} />
          <Skeleton variant="text" width="80%" height={24} sx={{ mx: 'auto' }} />
        </Box>
        <Skeleton variant="rectangular" height={120} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={200} />
      </CardContent>
    </Card>
  );

  // Error state
  if (!wallet.user && !wallet.loading) {
    return (
      <Card sx={{
        bgcolor: '#1a2332',
        border: '2px solid #f44336',
        borderRadius: 3,
        maxWidth: '800px',
        mx: 'auto',
        mt: 4
      }}>
        <CardContent sx={{ p: 4 }}>
          <Alert
            severity="error"
            icon={<ErrorIcon />}
            action={
              <Button
                color="inherit"
                onClick={() => navigate('/login')}
                variant="outlined"
              >
                Login
              </Button>
            }
          >
            <Typography variant="body1" gutterBottom>
              <strong>Authentication Required</strong>
            </Typography>
            <Typography variant="body2">
              Please log in to your account to continue.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (wallet.loading) {
    return <LoadingSkeleton />;
  }

  // Requirement met - show children with success indicator
  if (wallet.isRequirementMet) {
    return (
      <Fade in timeout={500}>
        <Box>
          <Alert
            severity="success"
            icon={<CheckIcon />}
            sx={{
              mb: 2,
              bgcolor: 'rgba(76, 175, 80, 0.1)',
              color: '#4caf50',
              border: '1px solid rgba(76, 175, 80, 0.3)'
            }}
          >
            <Typography variant="body2">
              ✅ Wallet requirement satisfied: {wallet.walletAddress?.slice(0, 8)}...{wallet.walletAddress?.slice(-6)}
            </Typography>
          </Alert>
          {children}
        </Box>
      </Fade>
    );
  }

  // Steps configuration
  const steps = [
    {
      label: 'User Authentication',
      description: 'Log in to your account',
      completed: wallet.user,
      icon: <AssignmentIcon />,
      content: 'Please ensure you are logged in to continue.'
    },
    {
      label: 'Connect Wallet',
      description: 'Connect your Solana wallet',
      completed: wallet.connected,
      icon: <WalletIcon />,
      content: 'Connect your Solana wallet (such as Phantom, Solflare, etc.) to the application.'
    },
    {
      label: 'Save Wallet',
      description: 'Save wallet to your account',
      completed: wallet.hasWallet,
      icon: <SecurityIcon />,
      content: 'Save your wallet address to your account for token operations.'
    },
    {
      label: 'Ready',
      description: 'All requirements met',
      completed: wallet.isRequirementMet,
      icon: <VerifiedIcon />,
      content: 'Your wallet is now ready for blockchain operations.'
    }
  ];

  // FAQ items
  const faqItems = [
    {
      question: 'Why do I need to connect a wallet?',
      answer: 'Your wallet is where carbon credit tokens will be minted and stored. It ensures you have full ownership and control of your tokens.'
    },
    {
      question: 'What wallets are supported?',
      answer: 'We support all Solana-compatible wallets including Phantom, Solflare, Torus, and many others.'
    },
    {
      question: 'Is my wallet information secure?',
      answer: 'Yes, we only store your public wallet address. Your private keys remain in your wallet and are never shared with our application.'
    },
    {
      question: 'Can I change my wallet later?',
      answer: 'Yes, you can disconnect and connect a different wallet at any time. However, tokens are tied to specific wallet addresses.'
    },
    {
      question: 'What if I don\'t have a wallet?',
      answer: 'You can easily create a free wallet by installing a browser extension like Phantom or Solflare.'
    }
  ];

  // Wallet requirement not met - show requirement screen
  return (
    <Zoom in timeout={300}>
      <Card sx={{
        bgcolor: '#1a2332',
        border: `2px solid ${wallet.requirementStatus.type === 'error' ? '#f44336' : '#ff9800'}`,
        borderRadius: 3,
        maxWidth: '900px',
        mx: 'auto',
        mt: 4
      }}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <WalletIcon sx={{
              fontSize: 64,
              color: '#ff9800',
              mb: 2,
              animation: 'pulse 2s infinite'
            }} />
            <Typography variant="h4" sx={{
              color: '#ffffff',
              fontWeight: 700,
              mb: 2
            }}>
              {customMessages.title || 'Wallet Connection Required'}
            </Typography>
            <Typography variant="h6" sx={{
              color: '#a0a9ba',
              mb: 3,
              maxWidth: '600px',
              mx: 'auto'
            }}>
              {customMessages.subtitle || `You need to connect and save a wallet address before you can ${actionName}.`}
            </Typography>

            {/* Quick Status */}
            <Alert
              severity={wallet.requirementStatus.type}
              icon={
                wallet.requirementStatus.type === 'error' ? <ErrorIcon /> :
                wallet.requirementStatus.type === 'warning' ? <WarningIcon /> :
                <InfoIcon />
              }
              sx={{ mb: 3, textAlign: 'left' }}
            >
              <Typography variant="body2">
                {wallet.requirementStatus.message}
              </Typography>
            </Alert>
          </Box>

          {/* Step-by-step instructions */}
          {showSteps && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2, textAlign: 'center' }}>
                Setup Process
              </Typography>
              <Stepper activeStep={activeStep} orientation="vertical">
                {steps.map((step, index) => (
                  <Step key={step.label} completed={step.completed}>
                    <StepLabel
                      icon={step.completed ? <CheckIcon sx={{ color: '#4caf50' }} /> : step.icon}
                      sx={{
                        '& .MuiStepLabel-label': {
                          color: step.completed ? '#4caf50' : '#a0a9ba',
                          fontSize: '1rem',
                          fontWeight: step.completed ? 600 : 400
                        }
                      }}
                    >
                      {step.label}
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" sx={{ color: '#a0a9ba', mb: 2 }}>
                        {step.content}
                      </Typography>
                      {index === 0 && !wallet.user && (
                        <Button
                          variant="contained"
                          onClick={() => navigate('/login')}
                          sx={{ mt: 1 }}
                        >
                          Login
                        </Button>
                      )}
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Box>
          )}

          {/* Benefits section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ color: '#ffffff', mb: 2, textAlign: 'center' }}>
              Why Connect Your Wallet?
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon sx={{ color: '#4caf50' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Secure Token Storage"
                  secondary="Your carbon credit tokens are stored securely in your personal wallet"
                  primaryTypographyProps={{ color: '#ffffff' }}
                  secondaryTypographyProps={{ color: '#a0a9ba' }}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SpeedIcon sx={{ color: '#2196f3' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Fast Transactions"
                  secondary="Built on Solana for fast, low-cost blockchain transactions"
                  primaryTypographyProps={{ color: '#ffffff' }}
                  secondaryTypographyProps={{ color: '#a0a9ba' }}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <VerifiedIcon sx={{ color: '#ff9800' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Full Ownership"
                  secondary="You maintain complete control and ownership of your tokens"
                  primaryTypographyProps={{ color: '#ffffff' }}
                  secondaryTypographyProps={{ color: '#a0a9ba' }}
                />
              </ListItem>
            </List>
          </Box>

          {/* Wallet connection section */}
          {showWalletConnection && wallet.user && (
            <Box>
              <Divider sx={{ my: 4, borderColor: '#2d3748' }} />
              
              <Typography variant="h6" sx={{
                color: '#ffffff',
                mb: 3,
                textAlign: 'center'
              }}>
                Connect Your Wallet
              </Typography>
              
              <ConnectWallet
                onWalletSaved={handleWalletConnected}
                showSaveButton={true}
                showDetails={true}
                autoSave={false}
                size="medium"
              />
              
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={wallet.refreshStatus}
                  startIcon={wallet.loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                  disabled={wallet.loading}
                  sx={{
                    color: '#00d4aa',
                    borderColor: '#00d4aa',
                    '&:hover': {
                      borderColor: '#00d4aa',
                      bgcolor: 'rgba(0, 212, 170, 0.1)'
                    }
                  }}
                >
                  Refresh Status
                </Button>
              </Box>
            </Box>
          )}

          {/* FAQ Section */}
          {showFAQ && (
            <Box sx={{ mt: 4 }}>
              <Divider sx={{ my: 4, borderColor: '#2d3748' }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                <HelpIcon sx={{ color: '#2196f3', mr: 1 }} />
                <Typography variant="h6" sx={{ color: '#ffffff' }}>
                  Frequently Asked Questions
                </Typography>
              </Box>

              {faqItems.map((item, index) => (
                <Accordion
                  key={index}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    mb: 1,
                    '&:before': { display: 'none' }
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: '#a0a9ba' }} />}
                    sx={{
                      '& .MuiAccordionSummary-content': {
                        margin: '12px 0'
                      }
                    }}
                  >
                    <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 500 }}>
                      {item.question}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" sx={{ color: '#a0a9ba' }}>
                      {item.answer}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}

              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#a0a9ba' }}>
                  Need more help?{' '}
                  <Link href="#" sx={{ color: '#00d4aa' }}>
                    Contact Support
                  </Link>
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Zoom>
  );
}