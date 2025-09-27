# Admin Mint Verification System - Testing Guide

## Overview

The new admin mint verification system provides a comprehensive multi-step process for minting carbon credits with enhanced security and audit trails.

## Features Implemented

### 1. Multi-Step Verification Process
- **Step 1: Project Review** - Detailed project information display
- **Step 2: User Verification** - Project owner identity and ownership confirmation
- **Step 3: Admin Authentication** - Password verification for admin
- **Step 4: Mint Confirmation** - Final minting details and confirmation

### 2. Progress Bar
- Visual progress indicator showing current step
- Linear progress bar showing completion percentage
- Clear step navigation with back/next buttons

### 3. Comprehensive Data Display

#### Project Details
- Basic project information (title, description, status)
- Location and area coverage
- Environmental metrics (carbon sequestered, biodiversity index, etc.)
- Project creation date and timeline

#### User Verification
- User profile with avatar and details
- Account creation date and organization info
- Project ownership verification status
- Contact information

#### Admin Authentication
- Secure password verification using Supabase auth
- Real-time password validation
- Success/failure feedback with clear messaging

#### Mint Confirmation
- Input fields for mint amount and reason
- Comprehensive summary of all details
- Final confirmation before blockchain transaction

### 4. Security Features
- Admin password re-verification before minting
- Input sanitization for all user inputs
- Comprehensive audit logging
- Error handling and user feedback

## Testing Checklist

### Prerequisites
- [ ] Admin user account with proper role
- [ ] Test project with valid data
- [ ] User associated with the project has wallet connected
- [ ] Backend minting API is running (port 3001)

### Step-by-Step Testing

#### 1. Opening the Modal
- [ ] Admin dashboard loads successfully
- [ ] Navigate to Projects tab
- [ ] Click "Mint" button on a project
- [ ] Verification modal opens with Step 1 (Project Review)

#### 2. Project Review Step
- [ ] Project title and description are displayed correctly
- [ ] Project status is shown as a colored chip
- [ ] Location and area coverage information is visible
- [ ] Environmental metrics are displayed (if available)
- [ ] "Next" button is enabled and functional

#### 3. User Verification Step
- [ ] User avatar displays correctly with first letter of name
- [ ] User full name and email are shown
- [ ] User role is displayed as a chip
- [ ] User ID and account creation date are visible
- [ ] Organization information is displayed
- [ ] Project ownership verification shows "Verified Owner"
- [ ] "Back" and "Next" buttons work correctly

#### 4. Admin Authentication Step
- [ ] Password input field is displayed
- [ ] Password visibility toggle works
- [ ] "Verify Password" button is initially disabled when empty
- [ ] Entering incorrect password shows error message
- [ ] Entering correct password shows success message
- [ ] "Next" button is only enabled after successful verification
- [ ] "Back" button works and resets password verification

#### 5. Mint Confirmation Step
- [ ] Carbon credits amount input accepts numerical values
- [ ] Minting reason textarea accepts text input
- [ ] Summary section shows correct project and user details
- [ ] Amount to mint displays in real-time
- [ ] Current date is shown correctly
- [ ] Warning message about irreversibility is displayed
- [ ] "Confirm Mint" button is disabled until both fields are filled
- [ ] "Back" button works and preserves entered data

#### 6. Minting Process
- [ ] "Confirm Mint" button shows loading state
- [ ] API call is made to backend with correct data
- [ ] Success message is displayed with transaction details
- [ ] Modal closes after successful minting
- [ ] Project status is updated in the dashboard
- [ ] Admin action is logged in the audit trail

### Error Scenarios to Test

#### Network Errors
- [ ] No internet connection during project loading
- [ ] API server is down during minting
- [ ] Database connection issues

#### Validation Errors
- [ ] Invalid mint amount (negative, zero, non-numeric)
- [ ] Empty minting reason
- [ ] Special characters in inputs

#### Authentication Errors
- [ ] Incorrect admin password
- [ ] Session expired during process
- [ ] User doesn't have admin role

#### Data Integrity Issues
- [ ] Project without associated user
- [ ] User without wallet address
- [ ] Missing project data

### Expected Behavior

#### Success Flow
1. Modal opens showing project details
2. User can navigate through all steps
3. Admin password verification succeeds
4. Mint confirmation shows accurate summary
5. Minting completes successfully
6. Comprehensive audit log entry is created
7. Project status updates to "credits_minted"

#### Error Handling
1. Clear error messages for user feedback
2. Appropriate error logging for debugging
3. Graceful degradation on missing data
4. Proper cleanup on modal close

### Performance Testing
- [ ] Modal opens quickly (< 2 seconds)
- [ ] Step transitions are smooth
- [ ] No memory leaks on repeated open/close
- [ ] Large project data loads efficiently

### Accessibility Testing
- [ ] Keyboard navigation works through all steps
- [ ] Screen reader compatibility
- [ ] High contrast mode support
- [ ] Focus management between steps

## Test Data Requirements

### Sample Project Data
```json
{
  "id": "test-project-123",
  "title": "Mangrove Restoration Project",
  "description": "Large-scale mangrove restoration in coastal areas",
  "status": "approved",
  "location": "Queensland, Australia",
  "area_coverage": 250,
  "created_at": "2024-01-15T00:00:00Z",
  "user_id": "user-123"
}
```

### Sample User Data
```json
{
  "id": "user-123",
  "full_name": "John Smith",
  "email": "john.smith@example.com",
  "role": "user",
  "organization": "Green Future Foundation",
  "phone": "+1234567890",
  "wallet_address": "5fT8...9xYz",
  "created_at": "2023-12-01T00:00:00Z"
}
```

### Sample Environmental Metrics
```json
{
  "carbon_sequestered": 1250.75,
  "biodiversity_index": 0.85,
  "water_quality": "Excellent",
  "ecosystem_health": "Good"
}
```

## Known Issues and Limitations

1. **Password Re-verification**: Currently uses sign-in method which may briefly affect session
2. **Large Data Sets**: May need optimization for projects with extensive metrics
3. **Offline Support**: No offline capability for verification process

## Future Enhancements

1. **Multi-factor Authentication**: Add SMS or email verification
2. **Role-based Approval**: Multiple admin approval for large mints
3. **Scheduled Minting**: Allow scheduling mints for later execution
4. **Batch Minting**: Support for minting multiple projects at once

## Security Notes

1. All inputs are sanitized using the sanitization utility
2. Admin password is never stored or logged
3. Comprehensive audit trail is maintained
4. HTTPS is required for production deployment
5. Rate limiting is applied to prevent abuse

## Deployment Considerations

1. Ensure backend API is properly configured
2. Database relationships must be intact
3. Admin users must have proper role assignments
4. Error monitoring should be in place
5. Backup procedures for audit logs

---

**Last Updated**: 2024-12-27
**Version**: 1.0
**Author**: Development Team