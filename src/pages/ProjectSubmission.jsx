import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  Box, Container, Typography, Paper, Grid, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Stepper, Step, StepLabel, StepContent, Collapse, Fade,
  Card, CardContent, CardHeader, IconButton, Chip, LinearProgress
} from '@mui/material';
import {
  Business as BusinessIcon,
  Nature as ProjectIcon,
  Science as ScienceIcon,
  Send as SendIcon,
  CheckCircle as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AccountBalanceWallet as WalletIcon,
  LocationOn as LocationIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
  Eco as EcoIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import ConnectWallet from '../components/ConnectWallet_New';
import { useWalletRequirement } from '../hooks/useWallet';

const initialFormData = {
  // Organization Information
  organization_name: '',
  organization_email: '',
  contact_phone: '',
  
  // Project Information
  title: '',
  location: '',
  description: '',
  ecosystem_type: '',
  project_area: '',
  estimated_credits: '',
  
  // Blue Carbon Parameters
  bulk_density: '',
  depth: '',
  carbon_percent: '',
  agb_biomass: '',
  bgb_biomass: '',
  carbon_fraction: '0.47',
  ch4_flux: '',
  n2o_flux: '',
  baseline_carbon_stock: '',
  uncertainty_deduction: '0.2',
};

const formSections = [
  {
    id: 'organization',
    title: 'Organization Details',
    description: 'Tell us about your organization',
    icon: BusinessIcon,
    color: '#00d4aa',
    fields: ['organization_name', 'organization_email', 'contact_phone']
  },
  {
    id: 'project',
    title: 'Project Information',
    description: 'Describe your blue carbon project',
    icon: ProjectIcon,
    color: '#4fc3f7',
    fields: ['title', 'location', 'description', 'ecosystem_type', 'project_area', 'estimated_credits']
  },
  {
    id: 'environmental',
    title: 'Environmental Data',
    description: 'Scientific measurements and parameters',
    icon: ScienceIcon,
    color: '#81c784',
    fields: ['bulk_density', 'depth', 'carbon_percent', 'agb_biomass', 'bgb_biomass', 'carbon_fraction', 'ch4_flux', 'n2o_flux', 'baseline_carbon_stock', 'uncertainty_deduction']
  }
];

const InputField = ({ id, label, value, onChange, type = "text", step, required, description, placeholder, options, error }) => {
  const fieldStyles = {
    mb: 1.5,
    '& .MuiInputLabel-root': {
      color: error ? '#ff5722' : '#00d4aa',
      fontWeight: 500,
      '&.Mui-focused': { color: error ? '#ff5722' : '#00d4aa' }
    },
    '& .MuiOutlinedInput-root': {
      bgcolor: 'rgba(26, 35, 50, 0.8)',
      backdropFilter: 'blur(10px)',
      borderRadius: 2,
      transition: 'all 0.3s ease',
      '& fieldset': {
        borderColor: error ? '#ff5722' : 'rgba(45, 55, 72, 0.5)',
        borderWidth: '1px'
      },
      '&:hover fieldset': {
        borderColor: error ? '#ff5722' : '#00d4aa',
        borderWidth: '1px'
      },
      '&.Mui-focused fieldset': {
        borderColor: error ? '#ff5722' : '#00d4aa',
        borderWidth: '2px',
        boxShadow: `0 0 0 3px ${error ? 'rgba(255, 87, 34, 0.1)' : 'rgba(0, 212, 170, 0.1)'}`
      },
      '& input, & textarea': {
        color: '#ffffff',
        fontSize: '1rem'
      }
    }
  };

  if (type === 'select') {
    return (
      <Box sx={{ mb: 1.5 }}>
        <FormControl fullWidth error={error}>
          <InputLabel sx={fieldStyles['& .MuiInputLabel-root']}>
            {label} {required && <span style={{ color: '#ff5722' }}>*</span>}
          </InputLabel>
          <Select
            id={id}
            name={id}
            value={value}
            onChange={onChange}
            required={required}
            label={`${label}${required ? ' *' : ''}`}
            sx={{
              ...fieldStyles['& .MuiOutlinedInput-root'],
              '& .MuiSelect-select': {
                color: '#ffffff'
              },
              '& .MuiOutlinedInput-notchedOutline': fieldStyles['& .MuiOutlinedInput-root']['& fieldset'],
              '&:hover .MuiOutlinedInput-notchedOutline': fieldStyles['& .MuiOutlinedInput-root']['&:hover fieldset'],
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': fieldStyles['& .MuiOutlinedInput-root']['&.Mui-focused fieldset']
            }}
          >
            <MenuItem value="" disabled>
              <em>Select {label}</em>
            </MenuItem>
            {options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {description && (
          <Typography variant="caption" sx={{ color: error ? '#ff5722' : '#94a3b8', mt: 0.5, display: 'block' }}>
            {description}
          </Typography>
        )}
      </Box>
    );
  }
  
  return (
    <Box sx={{ mb: 1.5 }}>
      <TextField
        id={id}
        name={id}
        label={`${label}${required ? ' *' : ''}`}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        multiline={type === 'textarea'}
        rows={type === 'textarea' ? 4 : undefined}
        minRows={type === 'textarea' ? 3 : undefined}
        maxRows={type === 'textarea' ? 8 : undefined}
        inputProps={{ step }}
        error={error}
        fullWidth
        sx={fieldStyles}
        helperText={description}
        FormHelperTextProps={{
          sx: { color: error ? '#ff5722' : '#94a3b8', fontSize: '0.75rem' }
        }}
      />
    </Box>
  );
};

export default function ProjectSubmission() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [expandedSections, setExpandedSections] = useState({ organization: true, project: false, environmental: false });
  const [formErrors, setFormErrors] = useState({});
  const [completedSections, setCompletedSections] = useState(new Set());
  const wallet = useWalletRequirement('project_creation');

  // Check authentication
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      setUser(session.user);
      setLoading(false);
    };
    
    checkUser();
  }, [navigate]);

  // Validation function
  const validateSection = useCallback((sectionId) => {
    const section = formSections.find(s => s.id === sectionId);
    const sectionErrors = {};
    let hasErrors = false;

    section.fields.forEach(fieldName => {
      const value = formData[fieldName];
      const isRequired = getFieldConfig(fieldName).required;
      
      if (isRequired && (!value || value.toString().trim() === '')) {
        sectionErrors[fieldName] = 'This field is required';
        hasErrors = true;
      }
    });

    setFormErrors(prev => ({ ...prev, ...sectionErrors }));
    return !hasErrors;
  }, [formData]);

  const handleChange = useCallback((e) => {
    const { id, name, value } = e.target;
    const fieldName = id || name;
    
    setFormData(prevFormData => ({
      ...prevFormData,
      [fieldName]: value
    }));

    // Clear error for this field
    if (formErrors[fieldName]) {
      setFormErrors(prev => ({ ...prev, [fieldName]: null }));
    }

    // Check if section is completed
    const section = formSections.find(s => s.fields.includes(fieldName));
    if (section) {
      const isCompleted = section.fields.every(field => {
        if (field === fieldName) return value && value.toString().trim() !== '';
        return formData[field] && formData[field].toString().trim() !== '';
      });
      
      if (isCompleted) {
        setCompletedSections(prev => new Set([...prev, section.id]));
      } else {
        setCompletedSections(prev => {
          const newSet = new Set(prev);
          newSet.delete(section.id);
          return newSet;
        });
      }
    }
  }, [formData, formErrors]);

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const getFieldConfig = (fieldName) => {
    const fieldConfigs = {
      // Organization fields
      organization_name: { label: 'Organization Name', required: true, placeholder: 'Enter your organization name' },
      organization_email: { label: 'Contact Email', required: true, type: 'email', placeholder: 'contact@yourorg.org' },
      contact_phone: { label: 'Contact Phone', required: false, type: 'tel', placeholder: '+1 (555) 123-4567' },
      
      // Project fields
      title: { label: 'Project Name', required: true, placeholder: 'e.g., Coastal Mangrove Restoration Initiative' },
      location: { label: 'Project Location', required: true, placeholder: 'e.g., Gulf Coast, Florida, USA' },
      description: { label: 'Project Description', required: true, type: 'textarea', placeholder: 'Describe your project objectives, methods, timeline, and expected outcomes...' },
      ecosystem_type: { label: 'Ecosystem Type', required: true, type: 'select', options: ecosystemOptions },
      project_area: { label: 'Project Area (hectares)', required: true, type: 'number', placeholder: 'e.g., 150' },
      estimated_credits: { label: 'Estimated Carbon Credits', required: false, type: 'number', placeholder: 'e.g., 1000' },
      
      // Environmental fields
      bulk_density: { label: 'Bulk Density (g/cm³)', required: true, type: 'number', step: '0.01', placeholder: 'e.g., 1.2' },
      depth: { label: 'Soil Depth (m)', required: true, type: 'number', step: '0.1', placeholder: 'e.g., 1.0' },
      carbon_percent: { label: 'Carbon Percentage (%)', required: true, type: 'number', step: '0.1', placeholder: 'e.g., 3.5' },
      agb_biomass: { label: 'Aboveground Biomass (Mg/ha)', required: true, type: 'number', step: '0.1', placeholder: 'e.g., 150' },
      bgb_biomass: { label: 'Belowground Biomass (Mg/ha)', required: true, type: 'number', step: '0.1', placeholder: 'e.g., 75' },
      carbon_fraction: { label: 'Carbon Fraction', required: false, type: 'number', step: '0.01', placeholder: '0.47' },
      ch4_flux: { label: 'Methane Flux (CH₄)', required: true, type: 'number', step: '0.1', placeholder: 'e.g., 5.2' },
      n2o_flux: { label: 'Nitrous Oxide Flux (N₂O)', required: true, type: 'number', step: '0.1', placeholder: 'e.g., 0.8' },
      baseline_carbon_stock: { label: 'Baseline Carbon Stock (Mg C/ha)', required: true, type: 'number', step: '0.1', placeholder: 'e.g., 120' },
      uncertainty_deduction: { label: 'Uncertainty Deduction', required: false, type: 'number', step: '0.01', placeholder: '0.2' }
    };
    return fieldConfigs[fieldName] || { label: fieldName, required: false };
  };

  const ecosystemOptions = [
    { value: 'mangrove', label: 'Mangrove Forest' },
    { value: 'saltmarsh', label: 'Salt Marsh' },
    { value: 'seagrass', label: 'Seagrass Beds' },
    { value: 'coastal_wetland', label: 'Coastal Wetland' },
    { value: 'tidal_flat', label: 'Tidal Flat' }
  ];

  const handleWalletConnected = (connectedWalletAddress) => {
    // Wallet connected successfully
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Prepare data for database insertion
      const projectData = {
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        ecosystem_type: formData.ecosystem_type,
        project_area: parseFloat(formData.project_area) || null,
        estimated_credits: parseFloat(formData.estimated_credits) || null,
        organization_name: formData.organization_name,
        organization_email: formData.organization_email,
        contact_phone: formData.contact_phone,
        // Associate with user's connected wallet
        wallet_address: wallet.walletAddress,
        // Blue carbon parameters as JSON
        carbon_data: {
          bulk_density: parseFloat(formData.bulk_density) || null,
          depth: parseFloat(formData.depth) || null,
          carbon_percent: parseFloat(formData.carbon_percent) || null,
          agb_biomass: parseFloat(formData.agb_biomass) || null,
          bgb_biomass: parseFloat(formData.bgb_biomass) || null,
          carbon_fraction: parseFloat(formData.carbon_fraction) || 0.47,
          ch4_flux: parseFloat(formData.ch4_flux) || null,
          n2o_flux: parseFloat(formData.n2o_flux) || null,
          baseline_carbon_stock: parseFloat(formData.baseline_carbon_stock) || null,
          uncertainty_deduction: parseFloat(formData.uncertainty_deduction) || 0.2
        },
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      if (error) throw error;

      setSubmitStatus('success');
      setProjectId(data.id);
      
      // Show success message briefly, then redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000); // Redirect after 3 seconds
      
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate overall form completion
  const overallProgress = (completedSections.size / formSections.length) * 100;

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: 'linear-gradient(135deg, #0a0f1c 0%, #1a2332 100%)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <CircularProgress sx={{ color: '#00d4aa' }} size={50} />
      </Box>
    );
  }

  const renderFormSection = (section, index) => {
    const Icon = section.icon;
    const isExpanded = expandedSections[section.id];
    const isCompleted = completedSections.has(section.id);
    
    return (
      <Card
        key={section.id}
        sx={{
          mb: 2,
          bgcolor: 'rgba(26, 35, 50, 0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(45, 55, 72, 0.3)',
          borderRadius: 3,
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 20px 40px rgba(0, 212, 170, 0.1)'
          }
        }}
      >
        <CardHeader
          sx={{
            bgcolor: isCompleted ? 'rgba(0, 212, 170, 0.1)' : 'rgba(45, 55, 72, 0.2)',
            borderBottom: '1px solid rgba(45, 55, 72, 0.3)',
            cursor: 'pointer',
            '&:hover': {
              bgcolor: isCompleted ? 'rgba(0, 212, 170, 0.15)' : 'rgba(45, 55, 72, 0.3)'
            }
          }}
          onClick={() => toggleSection(section.id)}
          avatar={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: `${section.color}20`,
                border: `1px solid ${section.color}40`
              }}>
                <Icon sx={{ color: section.color, fontSize: 24 }} />
              </Box>
              {isCompleted && (
                <Chip
                  icon={<CheckIcon />}
                  label="Complete"
                  size="small"
                  sx={{
                    bgcolor: '#00d4aa',
                    color: '#ffffff',
                    fontWeight: 600
                  }}
                />
              )}
            </Box>
          }
          title={
            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
              {section.title}
            </Typography>
          }
          subheader={
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              {section.description}
            </Typography>
          }
          action={
            <IconButton sx={{ color: '#94a3b8' }}>
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          }
        />
        
        <Collapse in={isExpanded}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={2}>
              {section.fields.map((fieldName) => {
                const config = getFieldConfig(fieldName);
                return (
                  <Grid
                    item
                    xs={12}
                    md={config.type === 'textarea' ? 12 : 
                        ['description', 'organization_name', 'title'].includes(fieldName) ? 12 : 6}
                    key={fieldName}
                  >
                    <InputField
                      id={fieldName}
                      label={config.label}
                      value={formData[fieldName]}
                      onChange={handleChange}
                      type={config.type}
                      step={config.step}
                      required={config.required}
                      placeholder={config.placeholder}
                      options={config.options}
                      error={!!formErrors[fieldName]}
                      description={formErrors[fieldName] || getFieldDescription(fieldName)}
                    />
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Collapse>
      </Card>
    );
  };

  const getFieldDescription = (fieldName) => {
    const descriptions = {
      organization_name: 'Full legal name of your organization',
      organization_email: 'Primary contact email for this project',
      contact_phone: 'Contact phone number (optional)',
      title: 'A descriptive name for your project',
      location: 'Geographic location of the project',
      description: 'Detailed description of your restoration project',
      ecosystem_type: 'Type of coastal ecosystem being restored',
      project_area: 'Total project area in hectares',
      estimated_credits: 'Estimated carbon credits (Mg CO2e)',
      bulk_density: 'Soil bulk density in g/cm³',
      depth: 'Soil depth being measured in meters',
      carbon_percent: 'Soil carbon content as percentage (%)',
      agb_biomass: 'Aboveground biomass in Mg/ha',
      bgb_biomass: 'Belowground biomass in Mg/ha',
      carbon_fraction: 'Carbon fraction of biomass (default: 0.47)',
      ch4_flux: 'CH₄ flux in μmol/m²/h',
      n2o_flux: 'N₂O flux in μmol/m²/h',
      baseline_carbon_stock: 'Historical carbon stock in Mg C/ha',
      uncertainty_deduction: 'Uncertainty factor (0.2 = 20% deduction)'
    };
    return descriptions[fieldName] || '';
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0f1c 0%, #1a2332 50%, #0f1419 100%)',
      color: '#ffffff',
      py: 3
    }}>
      <Container maxWidth="lg">
        {/* Header Section */}
        <Box sx={{ 
          textAlign: 'center', 
          mb: 4,
          position: 'relative'
        }}>
          <IconButton
            onClick={() => navigate('/dashboard')}
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              color: '#94a3b8',
              bgcolor: 'rgba(26, 35, 50, 0.5)',
              backdropFilter: 'blur(10px)',
              '&:hover': {
                color: '#ffffff',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                transform: 'rotate(90deg)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            <CloseIcon />
          </IconButton>
          
          <Typography variant="h2" sx={{ 
            color: '#ffffff', 
            fontWeight: 800,
            mb: 1,
            background: 'linear-gradient(45deg, #00d4aa, #4fc3f7)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Blue Carbon Project
          </Typography>
          <Typography variant="h4" sx={{ 
            color: '#94a3b8', 
            fontWeight: 300,
            mb: 2
          }}>
            Registration Portal
          </Typography>
          
          {/* Progress Indicator */}
          <Box sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Form Progress
              </Typography>
              <Typography variant="body2" sx={{ color: '#00d4aa', fontWeight: 600 }}>
                {Math.round(overallProgress)}% Complete
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={overallProgress}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'rgba(45, 55, 72, 0.3)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(45deg, #00d4aa, #4fc3f7)',
                  borderRadius: 4
                }
              }}
            />
          </Box>
        </Box>

        {/* Success Alert - only render when visible */}
        {submitStatus === 'success' && (
          <Fade in={submitStatus === 'success'}>
            <Alert 
              severity="success" 
              sx={{ 
                mb: 2, 
                bgcolor: 'rgba(27, 45, 27, 0.8)', 
                color: '#c8e6c9',
                border: '1px solid rgba(76, 175, 80, 0.3)',
                borderRadius: 3,
                backdropFilter: 'blur(10px)',
                '& .MuiAlert-icon': { color: '#4caf50' }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                ✅ Project Submitted Successfully!
              </Typography>
              <Typography>Your project has been submitted for review.</Typography>
              <Typography><strong>Project ID:</strong> {projectId}</Typography>
              {wallet.walletAddress && (
                <Typography><strong>Associated Wallet:</strong> {wallet.walletAddress.slice(0, 8)}...{wallet.walletAddress.slice(-6)}</Typography>
              )}
              <Typography>You will be notified once the admin reviews your project.</Typography>
              <Typography sx={{ mt: 2, fontWeight: 500 }}>
                🔄 Redirecting to dashboard in 3 seconds...
              </Typography>
            </Alert>
          </Fade>
        )}

        {/* Error Alert - only render when visible */}
        {submitStatus === 'error' && (
          <Fade in={submitStatus === 'error'}>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2, 
                bgcolor: 'rgba(45, 27, 27, 0.8)', 
                color: '#ffcdd2',
                border: '1px solid rgba(244, 67, 54, 0.3)',
                borderRadius: 3,
                backdropFilter: 'blur(10px)',
                '& .MuiAlert-icon': { color: '#f44336' }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                ❌ Submission Failed
              </Typography>
              <Typography>There was an error submitting your project. Please try again.</Typography>
            </Alert>
          </Fade>
        )}

        {/* Wallet loading indicator - compact */}
        {wallet.loading && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            py: 1, 
            mb: 1,
            color: '#94a3b8',
            fontSize: '0.875rem'
          }}>
            <CircularProgress size={16} sx={{ color: '#00d4aa', mr: 1 }} />
            Checking wallet connection...
          </Box>
        )}

        {/* Wallet Connection Banner - only render when needed and not loading */}
        {!wallet.loading && !wallet.isRequirementMet && (
          <Alert 
            severity={wallet.requirementStatus.type}
            sx={{ 
              mb: 2, 
              bgcolor: wallet.requirementStatus.type === 'error' ? 'rgba(45, 27, 27, 0.8)' : 'rgba(45, 32, 23, 0.8)',
              color: wallet.requirementStatus.type === 'error' ? '#ffcdd2' : '#ffe082',
              border: `1px solid ${wallet.requirementStatus.type === 'error' ? 'rgba(244, 67, 54, 0.3)' : 'rgba(255, 152, 0, 0.3)'}`,
              borderRadius: 3,
              backdropFilter: 'blur(10px)'
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              🔗 Wallet Connection Required
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {wallet.requirementStatus.message}
            </Typography>
            {wallet.walletAddress && (
              <Typography variant="body2" sx={{ mb: 2, color: '#4caf50', fontWeight: 500 }}>
                💼 Wallet Connected: {wallet.walletAddress.slice(0, 8)}...{wallet.walletAddress.slice(-6)}
              </Typography>
            )}
            {wallet.user && (
              <ConnectWallet
                onWalletSaved={handleWalletConnected}
                showSaveButton={true}
                showDetails={true}
                autoSave={false}
                size="medium"
                compact={false}
              />
            )}
          </Alert>
        )}

        {/* Form Sections */}
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          {formSections.map((section, index) => renderFormSection(section, index))}
          {/* Submit Button */}
          <Box sx={{ 
            textAlign: 'center', 
            mt: 4,
            mb: 3
          }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitting || !wallet.isRequirementMet}
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={20} sx={{ color: '#ffffff' }} />
                ) : (
                  <SendIcon />
                )
              }
              sx={{
                background: wallet.isRequirementMet && !isSubmitting ? 
                  'linear-gradient(45deg, #00d4aa, #4fc3f7)' : '#2d3748',
                color: '#ffffff',
                px: 8,
                py: 3,
                fontSize: '1.2rem',
                fontWeight: 700,
                borderRadius: 4,
                textTransform: 'none',
                boxShadow: wallet.isRequirementMet && !isSubmitting ? 
                  '0 8px 32px rgba(0, 212, 170, 0.4)' : 'none',
                minWidth: 280,
                '&:hover': {
                  background: wallet.isRequirementMet && !isSubmitting ? 
                    'linear-gradient(45deg, #00b894, #29b6f6)' : '#2d3748',
                  transform: wallet.isRequirementMet && !isSubmitting ? 'translateY(-3px)' : 'none',
                  boxShadow: wallet.isRequirementMet && !isSubmitting ? 
                    '0 12px 40px rgba(0, 212, 170, 0.5)' : 'none'
                },
                '&:disabled': {
                  background: '#2d3748',
                  color: '#64748b'
                },
                transition: 'all 0.4s ease'
              }}
            >
              {isSubmitting ? 'Submitting Project...' : 
               !wallet.isRequirementMet ? 'Connect Wallet to Submit' : 
               'Submit Project for Review'}
            </Button>
            
            <Box sx={{ mt: 2, maxWidth: 600, mx: 'auto' }}>
              <Typography variant="body1" sx={{ 
                color: '#94a3b8', 
                mb: 2,
                lineHeight: 1.6
              }}>
                {!wallet.isRequirementMet ? 
                  '🔐 Please connect and save your wallet address above to enable project submission.' :
                  '📋 Your project will be reviewed by our expert team and you\'ll receive detailed feedback within 5-7 business days.'}
              </Typography>
              
              {wallet.isRequirementMet && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: 2,
                  flexWrap: 'wrap'
                }}>
                  <Chip
                    icon={<WalletIcon />}
                    label={`Wallet: ${wallet.walletAddress.slice(0, 6)}...${wallet.walletAddress.slice(-4)}`}
                    sx={{
                      bgcolor: 'rgba(0, 212, 170, 0.1)',
                      color: '#00d4aa',
                      border: '1px solid rgba(0, 212, 170, 0.3)'
                    }}
                  />
                  <Chip
                    icon={<CheckIcon />}
                    label="Ready to Submit"
                    sx={{
                      bgcolor: 'rgba(76, 175, 80, 0.1)',
                      color: '#4caf50',
                      border: '1px solid rgba(76, 175, 80, 0.3)'
                    }}
                  />
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
