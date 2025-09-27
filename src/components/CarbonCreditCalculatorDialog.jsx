import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  IconButton,
  Chip,
  Paper
} from '@mui/material';
import { supabase } from '../lib/supabaseClient';
import {
  Close as CloseIcon,
  Calculate as CalculateIcon,
  Science as ScienceIcon,
  Nature as NatureIcon,
  LocalFlorist as PlantIcon,
  Cloud as EmissionsIcon,
  TrendingUp as TrendingUpIcon,
  Token as TokenIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { 
  calculateProjectCredits, 
  validateCarbonData
} from '../utils/carbonCreditCalculator';
import { normalizeProject, getProjectDisplayValues } from '../utils/projectColumnMapping';

const CarbonCreditCalculatorDialog = ({
  open, 
  onClose, 
  project, 
  onCreditCalculated 
}) => {
  const [calculation, setCalculation] = useState(null);
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Check user role when dialog opens
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          setUserRole(profile?.role || 'user');
        }
      } catch (error) {
        setUserRole('user'); // Default to user if error
      }
    };

    if (open) {
      checkUserRole();
    }
  }, [open]);

  useEffect(() => {
    const performCalculation = () => {
      setLoading(true);
      setError(null);
      
      try {
        if (!project) {
          setError('No project data available');
          setLoading(false);
          return;
        }

        // Normalize project data
        const normalizedProject = normalizeProject(project);
        const displayValues = getProjectDisplayValues(normalizedProject);

        if (!normalizedProject.carbon_data) {
          setError('No carbon data available for this project');
          setValidation({ isValid: false, missingFields: ['carbon_data'] });
          setLoading(false);
          return;
        }

        // Validate carbon data
        const validationResult = validateCarbonData(normalizedProject.carbon_data);
        setValidation(validationResult);

        if (!validationResult.isValid) {
          setError(`Missing required data: ${validationResult.missingFields.join(', ')}`);
          setLoading(false);
          return;
        }

        // Get project area with fallback
        const projectArea = displayValues.project_area || displayValues.area;
        if (!projectArea || projectArea <= 0) {
          setError('Project area is required for calculation');
          setLoading(false);
          return;
        }

        // Calculate credits
        const result = calculateProjectCredits(normalizedProject.carbon_data, projectArea);
        
        if (!result) {
          setError('Unable to calculate carbon credits. Please check the project data.');
          setLoading(false);
          return;
        }

        setCalculation(result);
      } catch (err) {
        setError('Error calculating carbon credits: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (open && project) {
      performCalculation();
    }
  }, [open, project]);


  const handleMintCredits = () => {
    if (calculation && onCreditCalculated) {
      onCreditCalculated(calculation.totalCarbonCredits, calculation);
    }
    onClose();
  };

  const getParameterDisplay = (carbonData) => {
    if (!carbonData) return null;

    const data = typeof carbonData === 'string' ? JSON.parse(carbonData) : carbonData;
    
    return [
      { label: 'Bulk Density', value: `${data.bulk_density} g/cm³`, icon: <ScienceIcon /> },
      { label: 'Depth', value: `${data.depth} m`, icon: <ScienceIcon /> },
      { label: 'Carbon %', value: `${data.carbon_percent}%`, icon: <PlantIcon /> },
      { label: 'AGB Biomass', value: `${data.agb_biomass} Mg/ha`, icon: <NatureIcon /> },
      { label: 'BGB Biomass', value: `${data.bgb_biomass} Mg/ha`, icon: <PlantIcon /> },
      { label: 'CH₄ Flux', value: `${data.ch4_flux} μmol/m²/h`, icon: <EmissionsIcon /> },
      { label: 'N₂O Flux', value: `${data.n2o_flux} μmol/m²/h`, icon: <EmissionsIcon /> },
      { label: 'Baseline Stock', value: `${data.baseline_carbon_stock} Mg C/ha`, icon: <TrendingUpIcon /> }
    ];
  };

  const ResultCard = ({ title, value, unit, icon, color = '#00d4aa' }) => (
    <Card sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748', height: '100%' }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ color, mr: 1 }}>{icon}</Box>
          <Typography variant="body2" sx={{ color: '#a0a9ba', fontWeight: 500 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: '#a0a9ba' }}>
          {unit}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1a2332',
          border: '1px solid #2d3748',
          borderRadius: 3,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        color: '#ffffff', 
        borderBottom: '1px solid #2d3748',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CalculateIcon sx={{ color: '#00d4aa', mr: 2, fontSize: 28 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Carbon Credit Calculator
            </Typography>
            <Typography variant="body2" sx={{ color: '#a0aec0' }}>
              {project ? getProjectDisplayValues(normalizeProject(project)).title : 'Project Analysis'}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#a0a9ba' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 4 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress sx={{ color: '#00d4aa' }} />
            <Typography sx={{ color: '#ffffff', ml: 2 }}>
              Calculating carbon credits...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              bgcolor: '#2d1b1b', 
              color: '#ffcdd2',
              '& .MuiAlert-icon': { color: '#f44336' }
            }}
            icon={<WarningIcon />}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Calculation Error
            </Typography>
            <Typography>{error}</Typography>
            {validation && !validation.isValid && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Missing Required Fields:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {validation.missingFields.map((field) => (
                    <Chip 
                      key={field}
                      label={field.replace('_', ' ')}
                      size="small"
                      sx={{ bgcolor: '#ff4444', color: '#ffffff' }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Alert>
        )}

        {project && !loading && (
          <>
            {/* Project Information */}
            <Paper sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748', p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2, fontWeight: 600 }}>
                Project Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ color: '#a0a9ba' }}>Project Area</Typography>
                  <Typography variant="h6" sx={{ color: '#ffffff' }}>
                    {getProjectDisplayValues(normalizeProject(project)).project_area} hectares
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ color: '#a0a9ba' }}>Ecosystem Type</Typography>
                  <Typography variant="h6" sx={{ color: '#ffffff' }}>
                    {getProjectDisplayValues(normalizeProject(project)).ecosystem_type}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ color: '#a0a9ba' }}>Location</Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>
                    {getProjectDisplayValues(normalizeProject(project)).location}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Carbon Parameters */}
            {project && normalizeProject(project).carbon_data && (
              <Paper sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748', p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 2, fontWeight: 600 }}>
                  Carbon Parameters
                </Typography>
                <Grid container spacing={2}>
                  {getParameterDisplay(normalizeProject(project).carbon_data)?.map((param, index) => (
                    <Grid item xs={6} md={3} key={index}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ color: '#00d4aa', mr: 1 }}>{param.icon}</Box>
                        <Typography variant="body2" sx={{ color: '#a0a9ba' }}>
                          {param.label}
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 500 }}>
                        {param.value}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}

            {/* Calculation Results */}
            {calculation && (
              <>
                <Paper sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748', p: 3, mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <TokenIcon sx={{ color: '#00d4aa', mr: 2, fontSize: 24 }} />
                    <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                      Carbon Credit Calculation Results
                    </Typography>
                  </Box>

                  {/* Final Result Card */}
                  <Card sx={{ 
                    bgcolor: 'linear-gradient(135deg, #00d4aa 0%, #00b894 100%)',
                    border: '2px solid #00d4aa',
                    mb: 3
                  }}>
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <TokenIcon sx={{ fontSize: 48, color: '#ffffff', mb: 1 }} />
                      <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 700, mb: 1 }}>
                        {calculation.totalCarbonCredits}
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#ffffff', mb: 1 }}>
                        Total Carbon Credits
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                        Mg CO₂e for {calculation.projectArea} hectares
                      </Typography>
                      <Chip 
                        label={`${calculation.creditsPerHectare} Mg CO₂e per hectare`}
                        sx={{ 
                          mt: 2, 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          color: '#ffffff',
                          fontWeight: 600
                        }}
                      />
                    </CardContent>
                  </Card>

                  {/* Detailed Results Grid */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} md={3}>
                      <ResultCard
                        title="Soil Carbon"
                        value={calculation.socCO2e}
                        unit="Mg CO₂e/ha"
                        icon={<ScienceIcon />}
                        color="#8B5CF6"
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <ResultCard
                        title="Biomass Carbon"
                        value={(calculation.agbCO2e + calculation.bgbCO2e).toFixed(2)}
                        unit="Mg CO₂e/ha"
                        icon={<NatureIcon />}
                        color="#10B981"
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <ResultCard
                        title="GHG Emissions"
                        value={calculation.totalGHG_CO2e}
                        unit="Mg CO₂e/ha/yr"
                        icon={<EmissionsIcon />}
                        color="#F59E0B"
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <ResultCard
                        title="Net Sequestration"
                        value={calculation.netCO2eAfterUncertainty}
                        unit="Mg CO₂e/ha"
                        icon={<TrendingUpIcon />}
                        color="#3B82F6"
                      />
                    </Grid>
                  </Grid>

                  {/* Calculation Breakdown */}
                  <Divider sx={{ bgcolor: '#2d3748', my: 2 }} />
                  <Typography variant="subtitle1" sx={{ color: '#00d4aa', mb: 2, fontWeight: 600 }}>
                    Calculation Breakdown
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" sx={{ color: '#a0a9ba' }}>Current Total Stock</Typography>
                      <Typography variant="body1" sx={{ color: '#ffffff' }}>
                        {calculation.currentTotalCO2e} Mg CO₂e/ha
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" sx={{ color: '#a0a9ba' }}>Baseline Stock</Typography>
                      <Typography variant="body1" sx={{ color: '#ffffff' }}>
                        {calculation.baselineCO2e} Mg CO₂e/ha
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" sx={{ color: '#a0a9ba' }}>Net Stock Increase</Typography>
                      <Typography variant="body1" sx={{ color: '#ffffff' }}>
                        {calculation.netStockIncrease} Mg CO₂e/ha
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" sx={{ color: '#a0a9ba' }}>After Uncertainty ({calculation.uncertaintyPercentage}%)</Typography>
                      <Typography variant="body1" sx={{ color: '#ffffff' }}>
                        {calculation.netCO2eAfterUncertainty} Mg CO₂e/ha
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {userRole === 'admin' ? (
                  <Alert 
                    severity="success" 
                    sx={{ 
                      bgcolor: '#1b2d1b', 
                      color: '#c8e6c9',
                      '& .MuiAlert-icon': { color: '#4caf50' }
                    }}
                    icon={<CheckIcon />}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Ready to Mint Credits
                    </Typography>
                    <Typography>
                      The calculation is complete and {calculation.totalCarbonCredits} carbon credits 
                      can be minted for this project.
                    </Typography>
                  </Alert>
                ) : (
                  <Alert 
                    severity="info" 
                    sx={{ 
                      bgcolor: '#1b2d2d', 
                      color: '#b3e5fc',
                      '& .MuiAlert-icon': { color: '#29b6f6' }
                    }}
                    icon={<CheckIcon />}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Calculation Complete
                    </Typography>
                    <Typography>
                      Your project shows potential for {calculation.totalCarbonCredits} carbon credits. 
                      An administrator will review and mint tokens after project approval.
                    </Typography>
                  </Alert>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid #2d3748' }}>
        <Button 
          onClick={onClose} 
          sx={{ color: '#a0a9ba' }}
        >
          Close
        </Button>
        {calculation && userRole === 'admin' && (
          <Button
            variant="contained"
            onClick={handleMintCredits}
            startIcon={<TokenIcon />}
            sx={{
              bgcolor: '#00d4aa',
              color: '#ffffff',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                bgcolor: '#00b894'
              }
            }}
          >
            Mint {calculation.totalCarbonCredits} Credits
          </Button>
        )}
        {calculation && userRole !== 'admin' && (
          <Button
            variant="outlined"
            onClick={() => {
              if (onCreditCalculated) {
                onCreditCalculated(calculation.totalCarbonCredits, calculation);
              }
              onClose();
            }}
            sx={{
              borderColor: '#00d4aa',
              color: '#00d4aa',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                bgcolor: 'rgba(0,212,170,0.1)',
                borderColor: '#00d4aa'
              }
            }}
          >
            Save Calculation
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CarbonCreditCalculatorDialog;