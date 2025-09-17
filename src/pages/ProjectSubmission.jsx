import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  Box, Container, Typography, Paper, Grid, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Divider, Card, CardContent
} from '@mui/material';
import {
  Business as BusinessIcon,
  Nature as ProjectIcon,
  Science as ScienceIcon,
  Send as SendIcon
} from '@mui/icons-material';
import WalletRequirement from '../components/WalletRequirement';

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

const InputField = ({ id, label, value, onChange, type = "text", step, required, description, placeholder, options }) => {
  if (type === 'select') {
    return (
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel sx={{ color: '#00d4aa' }}>
          {label} {required && '*'}
        </InputLabel>
        <Select
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          required={required}
          label={`${label}${required ? ' *' : ''}`}
          sx={{
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2d3748' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00d4aa' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00d4aa' },
            color: '#ffffff',
            bgcolor: '#1a2332'
          }}
        >
          <MenuItem value="">Select {label}</MenuItem>
          {options?.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
        {description && (
          <Typography variant="caption" sx={{ color: '#a0a9ba', mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </FormControl>
    );
  }
  
  return (
    <TextField
      id={id}
      label={`${label}${required ? ' *' : ''}`}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      multiline={type === 'textarea'}
      rows={type === 'textarea' ? 4 : undefined}
      inputProps={{ step }}
      fullWidth
      sx={{
        mb: 3,
        '& .MuiInputLabel-root': { color: '#00d4aa' },
        '& .MuiOutlinedInput-root': {
          bgcolor: '#1a2332',
          color: '#ffffff',
          '& fieldset': { borderColor: '#2d3748' },
          '&:hover fieldset': { borderColor: '#00d4aa' },
          '&.Mui-focused fieldset': { borderColor: '#00d4aa' }
        }
      }}
      helperText={description}
      FormHelperTextProps={{
        sx: { color: '#a0a9ba' }
      }}
    />
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
  const [walletAddress, setWalletAddress] = useState(null);

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

  const handleChange = (e) => {
    const { id, name, value } = e.target;
    const fieldName = id || name;
    setFormData({ ...formData, [fieldName]: value });
  };

  const handleWalletConnected = (connectedWalletAddress) => {
    setWalletAddress(connectedWalletAddress);
    console.log('Wallet connected for project submission:', connectedWalletAddress);
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
        // Include wallet address for token minting later
        wallet_address: walletAddress,
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
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData(initialFormData);
        setSubmitStatus(null);
        setProjectId(null);
      }, 5000);
      
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: '#0a0f1c', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <CircularProgress sx={{ color: '#00d4aa' }} />
      </Box>
    );
  }

  const ecosystemOptions = [
    { value: 'mangrove', label: 'Mangrove Forest' },
    { value: 'saltmarsh', label: 'Salt Marsh' },
    { value: 'seagrass', label: 'Seagrass Beds' },
    { value: 'coastal_wetland', label: 'Coastal Wetland' },
    { value: 'tidal_flat', label: 'Tidal Flat' },
  ];

  const ProjectForm = () => (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#0a0f1c', 
      color: '#ffffff',
      py: 4
    }}>
      <Container maxWidth="lg">
        <Paper sx={{ 
          bgcolor: '#1a2332', 
          border: '1px solid #2d3748',
          borderRadius: 3,
          p: 4
        }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h3" sx={{ 
              color: '#ffffff', 
              fontWeight: 700,
              mb: 2
            }}>
              Blue Carbon Project Registration
            </Typography>
            <Typography variant="h6" sx={{ 
              color: '#a0a9ba', 
              maxWidth: '600px',
              mx: 'auto'
            }}>
              Submit your coastal ecosystem restoration project for carbon credit assessment
            </Typography>
          </Box>

          {submitStatus === 'success' && (
            <Alert 
              severity="success" 
              sx={{ 
                mb: 4, 
                bgcolor: '#1b2d1b', 
                color: '#c8e6c9',
                '& .MuiAlert-icon': { color: '#4caf50' }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                ✅ Project Submitted Successfully!
              </Typography>
              <Typography>Your project has been submitted for review.</Typography>
              <Typography><strong>Project ID:</strong> {projectId}</Typography>
              <Typography>You will be notified once the admin reviews your project.</Typography>
            </Alert>
          )}

          {submitStatus === 'error' && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 4, 
                bgcolor: '#2d1b1b', 
                color: '#ffcdd2',
                '& .MuiAlert-icon': { color: '#f44336' }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                ❌ Submission Failed
              </Typography>
              <Typography>There was an error submitting your project. Please try again.</Typography>
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            {/* Organization Information Section */}
            <Card sx={{ 
              bgcolor: '#0f1419', 
              border: '1px solid #2d3748',
              mb: 4
            }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <BusinessIcon sx={{ color: '#00d4aa', mr: 2, fontSize: 28 }} />
                  <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 600 }}>
                    Organization Information
                  </Typography>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <InputField
                      id="organization_name"
                      label="Organization Name"
                      value={formData.organization_name}
                      onChange={handleChange}
                      required
                      placeholder="Enter your organization name"
                      description="Full legal name of your organization"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <InputField
                      id="organization_email"
                      label="Contact Email"
                      type="email"
                      value={formData.organization_email}
                      onChange={handleChange}
                      required
                      placeholder="contact@yourorg.org"
                      description="Primary contact email for this project"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <InputField
                      id="contact_phone"
                      label="Contact Phone"
                      type="tel"
                      value={formData.contact_phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 123-4567"
                      description="Contact phone number (optional)"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Project Details Section */}
            <Card sx={{ 
              bgcolor: '#0f1419', 
              border: '1px solid #2d3748',
              mb: 4
            }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <ProjectIcon sx={{ color: '#00d4aa', mr: 2, fontSize: 28 }} />
                  <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 600 }}>
                    Project Details
                  </Typography>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <InputField
                      id="title"
                      label="Project Name"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      placeholder="e.g., Coastal Mangrove Restoration Initiative"
                      description="A descriptive name for your project"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <InputField
                      id="location"
                      label="Project Location"
                      value={formData.location}
                      onChange={handleChange}
                      required
                      placeholder="e.g., Gulf Coast, Florida, USA"
                      description="Geographic location of the project"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <InputField
                      id="ecosystem_type"
                      label="Ecosystem Type"
                      type="select"
                      value={formData.ecosystem_type}
                      onChange={handleChange}
                      required
                      options={ecosystemOptions}
                      description="Type of coastal ecosystem being restored"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <InputField
                      id="project_area"
                      label="Project Area (hectares)"
                      type="number"
                      value={formData.project_area}
                      onChange={handleChange}
                      required
                      placeholder="e.g., 150"
                      description="Total project area in hectares"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <InputField
                      id="estimated_credits"
                      label="Estimated Carbon Credits"
                      type="number"
                      value={formData.estimated_credits}
                      onChange={handleChange}
                      placeholder="e.g., 1000"
                      description="Estimated carbon credits (Mg CO2e)"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <InputField
                      id="description"
                      label="Project Description"
                      type="textarea"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      placeholder="Describe your project objectives, methods, timeline, and expected outcomes..."
                      description="Detailed description of your restoration project"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Environmental Data Section */}
            <Card sx={{ 
              bgcolor: '#0f1419', 
              border: '1px solid #2d3748',
              mb: 4
            }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <ScienceIcon sx={{ color: '#00d4aa', mr: 2, fontSize: 28 }} />
                  <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 600 }}>
                    Environmental Data
                  </Typography>
                </Box>
                
                {/* Soil Parameters */}
                <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2, fontWeight: 600 }}>
                  Soil Parameters
                </Typography>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} md={4}>
                    <InputField
                      id="bulk_density"
                      label="Bulk Density (g/cm³)"
                      type="number"
                      step="0.01"
                      value={formData.bulk_density}
                      onChange={handleChange}
                      required
                      placeholder="e.g., 1.2"
                      description="Soil bulk density in g/cm³"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <InputField
                      id="depth"
                      label="Soil Depth (m)"
                      type="number"
                      step="0.1"
                      value={formData.depth}
                      onChange={handleChange}
                      required
                      placeholder="e.g., 1.0"
                      description="Soil depth being measured in meters"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <InputField
                      id="carbon_percent"
                      label="Carbon Percentage (%)"
                      type="number"
                      step="0.1"
                      value={formData.carbon_percent}
                      onChange={handleChange}
                      required
                      placeholder="e.g., 3.5"
                      description="Soil carbon content as percentage (%)"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ bgcolor: '#2d3748', my: 3 }} />

                {/* Biomass Parameters */}
                <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2, fontWeight: 600 }}>
                  Biomass Parameters
                </Typography>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} md={4}>
                    <InputField
                      id="agb_biomass"
                      label="Aboveground Biomass (Mg/ha)"
                      type="number"
                      step="0.1"
                      value={formData.agb_biomass}
                      onChange={handleChange}
                      required
                      placeholder="e.g., 150"
                      description="Aboveground biomass in Mg/ha"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <InputField
                      id="bgb_biomass"
                      label="Belowground Biomass (Mg/ha)"
                      type="number"
                      step="0.1"
                      value={formData.bgb_biomass}
                      onChange={handleChange}
                      required
                      placeholder="e.g., 75"
                      description="Belowground biomass in Mg/ha"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <InputField
                      id="carbon_fraction"
                      label="Carbon Fraction"
                      type="number"
                      step="0.01"
                      value={formData.carbon_fraction}
                      onChange={handleChange}
                      placeholder="0.47"
                      description="Carbon fraction of biomass (default: 0.47)"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ bgcolor: '#2d3748', my: 3 }} />

                {/* GHG Fluxes */}
                <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2, fontWeight: 600 }}>
                  Greenhouse Gas Fluxes
                </Typography>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} md={6}>
                    <InputField
                      id="ch4_flux"
                      label="Methane Flux (CH₄) μmol/m²/h"
                      type="number"
                      step="0.1"
                      value={formData.ch4_flux}
                      onChange={handleChange}
                      required
                      placeholder="e.g., 5.2"
                      description="CH₄ flux in μmol/m²/h"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <InputField
                      id="n2o_flux"
                      label="Nitrous Oxide Flux (N₂O) μmol/m²/h"
                      type="number"
                      step="0.1"
                      value={formData.n2o_flux}
                      onChange={handleChange}
                      required
                      placeholder="e.g., 0.8"
                      description="N₂O flux in μmol/m²/h"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ bgcolor: '#2d3748', my: 3 }} />

                {/* Baseline & Adjustments */}
                <Typography variant="h6" sx={{ color: '#00d4aa', mb: 2, fontWeight: 600 }}>
                  Baseline & Adjustments
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <InputField
                      id="baseline_carbon_stock"
                      label="Baseline Carbon Stock (Mg C/ha)"
                      type="number"
                      step="0.1"
                      value={formData.baseline_carbon_stock}
                      onChange={handleChange}
                      required
                      placeholder="e.g., 120"
                      description="Historical carbon stock in Mg C/ha"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <InputField
                      id="uncertainty_deduction"
                      label="Uncertainty Deduction"
                      type="number"
                      step="0.01"
                      value={formData.uncertainty_deduction}
                      onChange={handleChange}
                      placeholder="0.2"
                      description="Uncertainty factor (0.2 = 20% deduction)"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : <SendIcon />}
                sx={{
                  bgcolor: '#00d4aa',
                  color: '#ffffff',
                  px: 6,
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: 3,
                  textTransform: 'none',
                  boxShadow: '0 4px 16px rgba(0, 212, 170, 0.3)',
                  '&:hover': {
                    bgcolor: '#00b894',
                    boxShadow: '0 6px 20px rgba(0, 212, 170, 0.4)',
                    transform: 'translateY(-2px)'
                  },
                  '&:disabled': {
                    bgcolor: '#2d3748',
                    color: '#a0a9ba'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {isSubmitting ? 'Submitting Project...' : 'Submit Project for Review'}
              </Button>
              <Typography variant="body2" sx={{ 
                color: '#a0a9ba', 
                mt: 2, 
                maxWidth: '500px',
                mx: 'auto' 
              }}>
                Your project will be reviewed by our team and you'll receive feedback within 5-7 business days.
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );

  return (
    <WalletRequirement 
      context="project_creation"
      actionName="create a project"
      showWalletConnection={true}
      onWalletConnected={handleWalletConnected}
    >
      <ProjectForm />
    </WalletRequirement>
  );
}
