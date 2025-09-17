import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  IconButton,
  Chip,
  Paper,
  Stack,
  Divider,
  TextField,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Close as CloseIcon,
  Nature as NatureIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon,
  Assessment as AssessmentIcon,
  ExpandMore as ExpandMoreIcon,
  Science as ScienceIcon,
  LocalFlorist as PlantIcon,
  Cloud as EmissionsIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { supabase } from '../lib/supabaseClient';
import { normalizeProject, getProjectDisplayValues } from '../utils/projectColumnMapping';

const ProjectDetailDialog = ({ open, onClose, project, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [statusComment, setStatusComment] = useState('');
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');

  if (!project) return null;

  // Normalize project data to handle column variations
  const normalizedProject = normalizeProject(project);
  const displayValues = getProjectDisplayValues(normalizedProject);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      case 'under_review': return 'info';
      case 'credits_calculated': return 'secondary';
      case 'credits_minted': return 'success';
      default: return 'default';
    }
  };

  const getCarbonData = () => {
    if (!normalizedProject.carbon_data) return null;
    // Already parsed by normalizeProject
    return normalizedProject.carbon_data;
  };

  const carbonData = getCarbonData();

  const handleStatusUpdate = async (newStatus) => {
    setLoading(true);
    try {
      const updateData = {
        status: newStatus,
        review_notes: statusComment,
        reviewed_at: new Date().toISOString()
      };

      // Get current user for reviewed_by
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        updateData.reviewed_by = user.id;
      }

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', normalizedProject.id);

      if (error) throw error;

      // Log the admin action
      await supabase.from('admin_logs').insert([{
        admin_id: user?.id,
        action: `project_${newStatus}`,
        target_type: 'project',
        target_id: normalizedProject.id,
        details: `Updated project status to ${newStatus}${statusComment ? `: ${statusComment}` : ''}`
      }]);

      if (onUpdate) {
        onUpdate({ ...normalizedProject, ...updateData });
      }

      setShowStatusUpdate(false);
      setStatusComment('');
      setSelectedStatus('');
    } catch (error) {
      console.error('Error updating project status:', error);
      alert('Error updating project status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const InfoCard = ({ title, children, icon, color = '#00d4aa' }) => (
    <Card sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748', height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ color, mr: 1 }}>{icon}</Box>
          <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  );

  const DataRow = ({ label, value, unit }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
      <Typography variant="body2" sx={{ color: '#a0aec0' }}>
        {label}:
      </Typography>
      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 500 }}>
        {value} {unit && <span style={{ color: '#a0aec0' }}>{unit}</span>}
      </Typography>
    </Box>
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
          maxHeight: '95vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        color: '#ffffff', 
        borderBottom: '1px solid #2d3748',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 3
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <NatureIcon sx={{ color: '#00d4aa', mr: 2, fontSize: 28 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Project Details
            </Typography>
            <Typography variant="body2" sx={{ color: '#a0aec0' }}>
              {displayValues.title}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip 
            label={displayValues.status?.toUpperCase() || 'UNKNOWN'} 
            color={getStatusColor(displayValues.status)}
            sx={{ fontWeight: 600 }}
          />
          <IconButton onClick={onClose} sx={{ color: '#a0aec0' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          {/* Basic Project Information */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <InfoCard title="Project Information" icon={<AssessmentIcon />}>
                <DataRow label="Title" value={displayValues.title} />
                <DataRow label="Description" value={displayValues.description || 'N/A'} />
                <DataRow label="Location" value={displayValues.location} />
                <DataRow label="Ecosystem Type" value={displayValues.ecosystem_type} />
                <DataRow label="Project Area" value={displayValues.project_area} unit="hectares" />
                <DataRow label="Estimated Credits" value={displayValues.estimated_credits || 'N/A'} unit="CCR" />
                <DataRow label="Submitted" value={formatDate(displayValues.created_at)} />
              </InfoCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <InfoCard title="Organization Details" icon={<BusinessIcon />}>
                <DataRow label="Organization" value={displayValues.organization_name} />
                <DataRow label="Email" value={displayValues.organization_email} />
                <DataRow label="Contact Phone" value={displayValues.contact_phone || 'N/A'} />
                {displayValues.calculated_credits && (
                  <DataRow label="Calculated Credits" value={displayValues.calculated_credits} unit="CCR" />
                )}
                {displayValues.credits_issued && (
                  <DataRow label="Credits Issued" value={displayValues.credits_issued} unit="CCR" />
                )}
              </InfoCard>
            </Grid>
          </Grid>

          {/* Carbon Data Parameters */}
          {carbonData && (
            <Accordion 
              sx={{ 
                bgcolor: '#0f1419', 
                border: '1px solid #2d3748',
                mb: 3,
                '&:before': { display: 'none' }
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ScienceIcon sx={{ color: '#00d4aa', mr: 2 }} />
                  <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                    Carbon Data Parameters
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" sx={{ color: '#00d4aa', mb: 2, fontWeight: 600 }}>
                      Soil Parameters
                    </Typography>
                    <DataRow label="Bulk Density" value={carbonData.bulk_density || 'N/A'} unit="g/cm³" />
                    <DataRow label="Depth" value={carbonData.depth || 'N/A'} unit="m" />
                    <DataRow label="Carbon Percentage" value={carbonData.carbon_percent || 'N/A'} unit="%" />
                    <DataRow label="Baseline Carbon Stock" value={carbonData.baseline_carbon_stock || 'N/A'} unit="Mg C/ha" />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" sx={{ color: '#00d4aa', mb: 2, fontWeight: 600 }}>
                      Biomass & Emissions
                    </Typography>
                    <DataRow label="Above Ground Biomass" value={carbonData.agb_biomass || 'N/A'} unit="Mg/ha" />
                    <DataRow label="Below Ground Biomass" value={carbonData.bgb_biomass || 'N/A'} unit="Mg/ha" />
                    <DataRow label="Carbon Fraction" value={carbonData.carbon_fraction || 0.47} />
                    <DataRow label="CH₄ Flux" value={carbonData.ch4_flux || 'N/A'} unit="μmol/m²/h" />
                    <DataRow label="N₂O Flux" value={carbonData.n2o_flux || 'N/A'} unit="μmol/m²/h" />
                    <DataRow label="Uncertainty Deduction" value={carbonData.uncertainty_deduction || 0.2} />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Review Information */}
          {(displayValues.review_notes || displayValues.reviewed_at || normalizedProject.reviewed_by) && (
            <Card sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748', mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600, mb: 2 }}>
                  Review Information
                </Typography>
                {displayValues.review_notes && (
                  <DataRow label="Review Notes" value={displayValues.review_notes} />
                )}
                {displayValues.reviewed_at && (
                  <DataRow label="Reviewed At" value={formatDate(displayValues.reviewed_at)} />
                )}
              </CardContent>
            </Card>
          )}

          {/* Status Update Section */}
          {showStatusUpdate && (
            <Card sx={{ bgcolor: '#0f1419', border: '1px solid #2d3748' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600, mb: 2 }}>
                  Update Project Status
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Review Comments (Optional)"
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  placeholder="Add your review comments here..."
                  sx={{
                    mb: 2,
                    '& .MuiInputLabel-root': { color: '#00d4aa' },
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#1a2332',
                      color: '#ffffff',
                      '& fieldset': { borderColor: '#2d3748' },
                      '&:hover fieldset': { borderColor: '#00d4aa' },
                      '&.Mui-focused fieldset': { borderColor: '#00d4aa' }
                    }
                  }}
                />
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={16} /> : <ApproveIcon />}
                    onClick={() => handleStatusUpdate('approved')}
                    disabled={loading}
                    sx={{
                      bgcolor: '#4caf50',
                      '&:hover': { bgcolor: '#388e3c' }
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={16} /> : <RejectIcon />}
                    onClick={() => handleStatusUpdate('rejected')}
                    disabled={loading}
                    sx={{
                      bgcolor: '#f44336',
                      '&:hover': { bgcolor: '#d32f2f' }
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setShowStatusUpdate(false);
                      setStatusComment('');
                    }}
                    sx={{
                      borderColor: '#2d3748',
                      color: '#a0aec0',
                      '&:hover': { borderColor: '#00d4aa', color: '#ffffff' }
                    }}
                  >
                    Cancel
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid #2d3748' }}>
        <Button 
          onClick={onClose} 
          sx={{ color: '#a0aec0' }}
        >
          Close
        </Button>
        {displayValues.status === 'pending' && !showStatusUpdate && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setShowStatusUpdate(true)}
            sx={{
              borderColor: '#00d4aa',
              color: '#00d4aa',
              '&:hover': { 
                borderColor: '#00b894',
                bgcolor: 'rgba(0, 212, 170, 0.1)'
              }
            }}
          >
            Update Status
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ProjectDetailDialog;