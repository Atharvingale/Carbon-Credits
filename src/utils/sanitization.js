/**
 * Input Sanitization Utilities
 * Provides functions to sanitize user input and prevent XSS attacks
 */

/**
 * Sanitize text input to prevent XSS attacks
 * @param {string} input - The input string to sanitize
 * @returns {string} - Sanitized string
 */
export const sanitizeText = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

/**
 * Sanitize HTML content more thoroughly
 * @param {string} input - HTML content to sanitize
 * @returns {string} - Sanitized HTML
 */
export const sanitizeHTML = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove script tags and their content
  input = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove potentially dangerous tags
  const dangerousTags = [
    'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea',
    'link', 'meta', 'style', 'base', 'applet'
  ];
  
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b[^>]*>.*?</${tag}>`, 'gi');
    input = input.replace(regex, '');
    input = input.replace(new RegExp(`<${tag}\\b[^>]*/>`, 'gi'), '');
  });
  
  // Remove javascript: protocols
  input = input.replace(/javascript:/gi, '');
  input = input.replace(/vbscript:/gi, '');
  input = input.replace(/data:/gi, '');
  
  // Remove event handlers
  input = input.replace(/on\w+\s*=/gi, '');
  
  return input.trim();
};

/**
 * Sanitize project data for safe storage and display
 * @param {Object} projectData - Project data object
 * @returns {Object} - Sanitized project data
 */
export const sanitizeProjectData = (projectData) => {
  if (!projectData || typeof projectData !== 'object') {
    return {};
  }
  
  const sanitized = {};
  
  // Define fields that should be sanitized as text
  const textFields = [
    'title', 'name', 'description', 'location', 'organization_name',
    'organization_email', 'contact_phone', 'contact_email', 'methodology',
    'verification_standard', 'review_notes'
  ];
  
  // Sanitize text fields
  textFields.forEach(field => {
    if (projectData[field]) {
      sanitized[field] = sanitizeText(projectData[field]);
    }
  });
  
  // Copy numeric fields without sanitization but with validation
  const numericFields = [
    'project_area', 'area', 'estimated_credits', 'calculated_credits',
    'credits_issued', 'credits_retired'
  ];
  
  numericFields.forEach(field => {
    if (projectData[field] !== undefined && projectData[field] !== null) {
      const num = parseFloat(projectData[field]);
      if (!isNaN(num) && num >= 0) {
        sanitized[field] = num;
      }
    }
  });
  
  // Copy other safe fields
  const safeFields = [
    'id', 'user_id', 'status', 'project_type', 'ecosystem_type',
    'created_at', 'updated_at', 'approved_at', 'reviewed_at',
    'wallet_address', 'mint_address', 'carbon_data'
  ];
  
  safeFields.forEach(field => {
    if (projectData[field] !== undefined) {
      sanitized[field] = projectData[field];
    }
  });
  
  return sanitized;
};

/**
 * Validate and sanitize wallet address
 * @param {string} address - Wallet address to validate
 * @returns {Object} - Validation result with sanitized address
 */
export const sanitizeWalletAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return { valid: false, sanitized: '', error: 'Wallet address is required' };
  }
  
  // Remove any potentially harmful characters
  const sanitized = address.replace(/[^A-Za-z0-9]/g, '');
  
  // Basic Solana address validation
  if (sanitized.length < 32 || sanitized.length > 44) {
    return { valid: false, sanitized: '', error: 'Invalid wallet address length' };
  }
  
  // Check for valid base58 characters (Solana addresses use base58)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  if (!base58Regex.test(sanitized)) {
    return { valid: false, sanitized: '', error: 'Invalid wallet address characters' };
  }
  
  return { valid: true, sanitized, error: null };
};

/**
 * Sanitize user profile data
 * @param {Object} profileData - User profile data
 * @returns {Object} - Sanitized profile data
 */
export const sanitizeUserProfile = (profileData) => {
  if (!profileData || typeof profileData !== 'object') {
    return {};
  }
  
  const sanitized = {};
  
  // Sanitize text fields
  const textFields = [
    'full_name', 'email', 'phone_number', 'organization_name', 
    'organization_type'
  ];
  
  textFields.forEach(field => {
    if (profileData[field]) {
      sanitized[field] = sanitizeText(profileData[field]);
    }
  });
  
  // Handle wallet address separately with validation
  if (profileData.wallet_address) {
    const walletResult = sanitizeWalletAddress(profileData.wallet_address);
    if (walletResult.valid) {
      sanitized.wallet_address = walletResult.sanitized;
    }
  }
  
  // Copy safe fields
  const safeFields = [
    'id', 'role', 'is_verified', 'is_blocked', 'wallet_verified',
    'wallet_connected_at', 'created_at', 'updated_at'
  ];
  
  safeFields.forEach(field => {
    if (profileData[field] !== undefined) {
      sanitized[field] = profileData[field];
    }
  });
  
  return sanitized;
};

/**
 * Rate limiting helper to prevent abuse
 * @param {string} key - Unique key for the operation
 * @param {number} limit - Maximum number of operations allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - Whether the operation is allowed
 */
export const checkRateLimit = (key, limit = 10, windowMs = 60000) => {
  const now = Date.now();
  const windowKey = `${key}_${Math.floor(now / windowMs)}`;
  
  // Get current count from sessionStorage (client-side rate limiting)
  const currentCount = parseInt(sessionStorage.getItem(windowKey) || '0', 10);
  
  if (currentCount >= limit) {
    return false;
  }
  
  // Increment counter
  sessionStorage.setItem(windowKey, (currentCount + 1).toString());
  
  // Clean up old entries
  setTimeout(() => {
    sessionStorage.removeItem(windowKey);
  }, windowMs);
  
  return true;
};