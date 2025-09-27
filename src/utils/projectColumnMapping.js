/**
 * Project Column Mapping and Validation Utility
 * Ensures all required columns are available and provides fallbacks
 */

// Define all expected project columns from the unified projects table
export const PROJECT_COLUMNS = {
  // Core identifiers
  id: 'id',
  user_id: 'user_id',
  submitted_by_user: 'submitted_by_user',
  
  // Basic project information
  title: 'title',
  name: 'name',
  description: 'description',
  project_type: 'project_type',
  
  // Location and area
  location: 'location',
  coordinates: 'coordinates',
  country: 'country',
  region: 'region',
  ecosystem_type: 'ecosystem_type',
  area: 'area',
  project_area: 'project_area',
  
  // Organization details
  organization_name: 'organization_name',
  organization_email: 'organization_email',
  organization_type: 'organization_type',
  organization_website: 'organization_website',
  contact_phone: 'contact_phone',
  contact_email: 'contact_email',
  submitted_by: 'submitted_by',
  
  // Carbon credits and calculations
  estimated_credits: 'estimated_credits',
  calculated_credits: 'calculated_credits',
  calculation_data: 'calculation_data',
  calculation_timestamp: 'calculation_timestamp',
  credits_issued: 'credits_issued',
  credits_retired: 'credits_retired',
  
  // Carbon data and methodology
  carbon_data: 'carbon_data',
  methodology: 'methodology',
  verification_standard: 'verification_standard',
  
  // Project timeline
  project_start_date: 'project_start_date',
  project_end_date: 'project_end_date',
  crediting_period_start: 'crediting_period_start',
  crediting_period_end: 'crediting_period_end',
  vintage_year: 'vintage_year',
  
  // Status and workflow
  status: 'status',
  
  // Review and approval
  reviewed_by: 'reviewed_by',
  reviewed_at: 'reviewed_at',
  review_notes: 'review_notes',
  approved_by: 'approved_by',
  approved_at: 'approved_at',
  verification_date: 'verification_date',
  
  // Blockchain and wallet
  wallet_address: 'wallet_address',
  mint_address: 'mint_address',
  
  // Documents and media
  documents: 'documents',
  monitoring_reports: 'monitoring_reports',
  images: 'images',
  
  // Metadata
  tags: 'tags',
  external_project_id: 'external_project_id',
  registry_id: 'registry_id',
  expiry_date: 'expiry_date',
  
  // System fields
  created_at: 'created_at',
  updated_at: 'updated_at'
};

// Required fields for basic project display
export const REQUIRED_FIELDS = [
  'id',
  'title',
  'status',
  'created_at',
  'user_id'
];

// Fields required for carbon calculation
export const CARBON_CALCULATION_FIELDS = [
  'carbon_data',
  'project_area',
  'area'
];

// Fields required for project review
export const REVIEW_FIELDS = [
  'title',
  'description',
  'location',
  'ecosystem_type',
  'project_area',
  'estimated_credits',
  'organization_name',
  'organization_email',
  'carbon_data'
];

/**
 * Validates if a project object has all required fields
 * @param {Object} project - Project object to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} Validation result with missing fields
 */
export function validateProjectFields(project, requiredFields = REQUIRED_FIELDS) {
  if (!project) {
    return {
      isValid: false,
      missingFields: requiredFields,
      message: 'Project object is null or undefined'
    };
  }

  const missingFields = requiredFields.filter(field => {
    const value = getProjectValue(project, field);
    return value === null || value === undefined || value === '';
  });

  return {
    isValid: missingFields.length === 0,
    missingFields,
    message: missingFields.length > 0 
      ? `Missing required fields: ${missingFields.join(', ')}`
      : 'All required fields present'
  };
}

/**
 * Gets a value from project with fallback to alternative column names
 * @param {Object} project - Project object
 * @param {string} fieldName - Field name to get
 * @returns {any} Field value or null if not found
 */
export function getProjectValue(project, fieldName) {
  if (!project) return null;

  // Direct access first
  if (project[fieldName] !== undefined) {
    return project[fieldName];
  }

  // Handle fallbacks for fields with multiple names
  const fallbacks = {
    title: ['name', 'project_title'],
    name: ['title', 'project_name'],
    project_area: ['area'],
    area: ['project_area'],
    organization_email: ['contact_email'],
    contact_email: ['organization_email']
  };

  if (fallbacks[fieldName]) {
    for (const fallback of fallbacks[fieldName]) {
      if (project[fallback] !== undefined) {
        return project[fallback];
      }
    }
  }

  return null;
}

/**
 * Normalizes a project object to ensure all fields are accessible
 * @param {Object} project - Raw project object from database
 * @returns {Object} Normalized project object
 */
export function normalizeProject(project) {
  if (!project) return null;

  const normalized = { ...project };
  
  // CRITICAL FIX: Preserve relationship data (profiles, reviewer, approver)
  // These are join relationships from Supabase that must be preserved
  if (project.profiles) {
    normalized.profiles = project.profiles;
  }
  if (project.reviewer) {
    normalized.reviewer = project.reviewer;
  }
  if (project.approver) {
    normalized.approver = project.approver;
  }

  // Ensure title is available
  if (!normalized.title && normalized.name) {
    normalized.title = normalized.name;
  }
  if (!normalized.name && normalized.title) {
    normalized.name = normalized.title;
  }

  // Ensure area fields are consistent
  if (!normalized.project_area && normalized.area) {
    normalized.project_area = normalized.area;
  }
  if (!normalized.area && normalized.project_area) {
    normalized.area = normalized.project_area;
  }

  // Ensure contact email is available
  if (!normalized.organization_email && normalized.contact_email) {
    normalized.organization_email = normalized.contact_email;
  }
  if (!normalized.contact_email && normalized.organization_email) {
    normalized.contact_email = normalized.organization_email;
  }

  // Note: Using reviewed_by as the standard column name

  // Parse carbon_data if it's a string
  if (normalized.carbon_data && typeof normalized.carbon_data === 'string') {
    try {
      normalized.carbon_data = JSON.parse(normalized.carbon_data);
    } catch (error) {
      console.warn('Failed to parse carbon_data:', error);
    }
  }

  // Parse other JSON fields if they're strings
  ['calculation_data', 'documents', 'monitoring_reports', 'images', 'coordinates'].forEach(field => {
    if (normalized[field] && typeof normalized[field] === 'string') {
      try {
        normalized[field] = JSON.parse(normalized[field]);
      } catch (error) {
        console.warn(`Failed to parse ${field}:`, error);
      }
    }
  });

  return normalized;
}

/**
 * Checks if a project has sufficient data for carbon calculation
 * @param {Object} project - Project object
 * @returns {Object} Validation result for carbon calculation
 */
export function validateForCarbonCalculation(project) {
  const normalizedProject = normalizeProject(project);
  
  if (!normalizedProject) {
    return {
      isValid: false,
      missingFields: CARBON_CALCULATION_FIELDS,
      message: 'Project is null'
    };
  }

  const missingFields = [];
  
  // Check if carbon_data exists
  if (!normalizedProject.carbon_data) {
    missingFields.push('carbon_data');
  } else {
    // Check if carbon_data has required fields
    const carbonData = normalizedProject.carbon_data;
    const requiredCarbonFields = [
      'bulk_density',
      'depth',
      'carbon_percent',
      'agb_biomass',
      'bgb_biomass',
      'ch4_flux',
      'n2o_flux',
      'baseline_carbon_stock'
    ];

    const missingCarbonFields = requiredCarbonFields.filter(field => 
      !carbonData[field] || carbonData[field] === '' || isNaN(parseFloat(carbonData[field]))
    );

    if (missingCarbonFields.length > 0) {
      missingFields.push(...missingCarbonFields.map(f => `carbon_data.${f}`));
    }
  }

  // Check if project area exists
  const projectArea = getProjectValue(normalizedProject, 'project_area') || getProjectValue(normalizedProject, 'area');
  if (!projectArea || projectArea <= 0) {
    missingFields.push('project_area');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    message: missingFields.length > 0 
      ? `Missing fields for carbon calculation: ${missingFields.join(', ')}`
      : 'Ready for carbon calculation',
    projectArea
  };
}

/**
 * Gets safe display values for project fields
 * @param {Object} project - Project object
 * @returns {Object} Safe values for display
 */
export function getProjectDisplayValues(project) {
  const normalized = normalizeProject(project);
  
  if (!normalized) {
    return {
      title: 'Unknown Project',
      status: 'unknown',
      organization_name: 'N/A',
      created_at: null,
      estimated_credits: 0,
      calculated_credits: 0,
      project_area: 0
    };
  }

  return {
    id: normalized.id || '',
    title: getProjectValue(normalized, 'title') || 'Untitled Project',
    name: getProjectValue(normalized, 'name') || getProjectValue(normalized, 'title') || 'Untitled Project',
    description: normalized.description || '',
    location: normalized.location || 'Unknown Location',
    ecosystem_type: normalized.ecosystem_type || 'Not specified',
    project_area: getProjectValue(normalized, 'project_area') || 0,
    area: getProjectValue(normalized, 'area') || 0,
    estimated_credits: normalized.estimated_credits || 0,
    calculated_credits: normalized.calculated_credits || 0,
    credits_issued: normalized.credits_issued || 0,
    organization_name: normalized.organization_name || 'Unknown Organization',
    organization_email: getProjectValue(normalized, 'organization_email') || '',
    contact_phone: normalized.contact_phone || '',
    status: normalized.status || 'pending',
    created_at: normalized.created_at,
    updated_at: normalized.updated_at,
    carbon_data: normalized.carbon_data,
    review_notes: normalized.review_notes,
    reviewed_at: normalized.reviewed_at,
    project_type: normalized.project_type || 'carbon_sequestration',
    
    // CRITICAL FIX: Preserve relationship data for wallet functionality
    profiles: normalized.profiles,
    reviewer: normalized.reviewer, 
    approver: normalized.approver,
    user_id: normalized.user_id,
    wallet_address: normalized.wallet_address,
    mint_address: normalized.mint_address
  };
}