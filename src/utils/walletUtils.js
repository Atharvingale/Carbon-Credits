/**
 * Wallet Utilities
 * Legacy utilities for wallet operations - maintained for backward compatibility
 * For new implementations, prefer using walletService and useWallet hook
 */

import { supabase } from '../lib/supabaseClient';
import { isValidPublicKey } from '../lib/solana';
import walletService from '../services/walletService';

/**
 * @typedef {Object} WalletCheckResult
 * @property {boolean} hasWallet - Whether user has a connected wallet
 * @property {string|null} walletAddress - The wallet address if connected
 * @property {string|null} connectedAt - ISO string of when wallet was connected
 * @property {boolean} verified - Whether the wallet is verified
 * @property {string|null} error - Error message if any
 */

/**
 * @typedef {Object} WalletValidationResult
 * @property {boolean} valid - Whether the wallet address is valid
 * @property {boolean} [available] - Whether the wallet is available for use
 * @property {string} [error] - Error message if validation failed
 * @property {string} [reason] - Detailed reason for validation failure
 */

/**
 * Check if user has a wallet connected and saved
 * @deprecated Use walletService.checkWalletStatus() or useWallet hook instead
 * @param {string} userId - User ID to check
 * @returns {Promise<WalletCheckResult>}
 */
export const checkUserWallet = async (userId) => {
  try {
    console.warn('checkUserWallet is deprecated. Use walletService.checkWalletStatus() instead.');
    
    const result = await walletService.checkWalletStatus(userId, true);
    
    // Convert to legacy format for backward compatibility
    return {
      hasWallet: result.hasWallet,
      walletAddress: result.walletAddress,
      connectedAt: result.connectedAt,
      verified: result.verified,
      error: result.error
    };
  } catch (error) {
    console.error('Error checking user wallet:', error);
    return { 
      hasWallet: false, 
      walletAddress: null, 
      connectedAt: null,
      verified: false,
      error: error.message 
    };
  }
};

/**
 * Fallback method to check wallet from database directly
 * @deprecated Use walletService._checkWalletFromDB() instead (internal method)
 * @param {string} userId - User ID to check
 * @returns {Promise<WalletCheckResult>}
 */
const checkUserWalletFromDB = async (userId) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('wallet_address, wallet_connected_at, wallet_verified')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === '42703') {
        // Column doesn't exist - wallet feature not set up yet
        return { 
          hasWallet: false, 
          walletAddress: null,
          connectedAt: null,
          verified: false,
          error: 'Wallet feature not configured. Please contact administrator.' 
        };
      }
      throw error;
    }

    return {
      hasWallet: !!profile?.wallet_address,
      walletAddress: profile?.wallet_address || null,
      connectedAt: profile?.wallet_connected_at || null,
      verified: profile?.wallet_verified || false,
      error: null
    };
  } catch (error) {
    console.error('Database wallet check error:', error);
    return { 
      hasWallet: false, 
      walletAddress: null,
      connectedAt: null,
      verified: false,
      error: error.message 
    };
  }
};

/**
 * Get user-friendly wallet requirement message
 * @deprecated Use walletService.getRequirementMessage() instead
 * @param {string} context - Context where wallet is required
 * @returns {string} User-friendly message
 */
export const getWalletRequirementMessage = (context = 'project_creation') => {
  console.warn('getWalletRequirementMessage is deprecated. Use walletService.getRequirementMessage() instead.');
  return walletService.getRequirementMessage(context);
};

/**
 * Validate wallet address format and check availability
 * @param {string} walletAddress - Wallet address to validate
 * @param {string} [currentUserId] - Current user's ID (to exclude from uniqueness check)
 * @returns {Promise<WalletValidationResult>}
 */
export const validateWalletAddress = async (walletAddress, currentUserId = null) => {
  try {
    // Basic validation
    if (!walletAddress) {
      return {
        valid: false,
        error: 'Wallet address is required',
        reason: 'EMPTY_ADDRESS'
      };
    }

    if (typeof walletAddress !== 'string') {
      return {
        valid: false,
        error: 'Wallet address must be a string',
        reason: 'INVALID_TYPE'
      };
    }

    // Trim whitespace
    const trimmedAddress = walletAddress.trim();
    if (!trimmedAddress) {
      return {
        valid: false,
        error: 'Wallet address cannot be empty',
        reason: 'EMPTY_ADDRESS'
      };
    }

    // Check format using Solana validation
    if (!isValidPublicKey(trimmedAddress)) {
      return {
        valid: false,
        error: 'Invalid Solana wallet address format',
        reason: 'INVALID_FORMAT'
      };
    }

    // Use wallet service for availability check
    const result = await walletService.validateWallet(trimmedAddress, currentUserId);
    
    return {
      valid: result.valid,
      available: result.available,
      error: result.error,
      reason: result.available === false ? 'ADDRESS_IN_USE' : null
    };
  } catch (error) {
    console.error('Wallet validation error:', error);
    return {
      valid: false,
      error: error.message,
      reason: 'VALIDATION_ERROR'
    };
  }
};

/**
 * Format wallet address for display
 * @param {string|null} walletAddress - Wallet address to format
 * @param {number} [prefixLength=4] - Number of characters to show at start
 * @param {number} [suffixLength=4] - Number of characters to show at end
 * @returns {string} Formatted address or placeholder
 */
export const formatWalletAddress = (walletAddress, prefixLength = 4, suffixLength = 4) => {
  if (!walletAddress) {
    return 'No wallet connected';
  }

  if (typeof walletAddress !== 'string') {
    return 'Invalid address';
  }

  const trimmed = walletAddress.trim();
  if (trimmed.length <= prefixLength + suffixLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, prefixLength)}...${trimmed.slice(-suffixLength)}`;
};

/**
 * Check if two wallet addresses are the same
 * @param {string|null} address1 - First address
 * @param {string|null} address2 - Second address
 * @returns {boolean} True if addresses match
 */
export const areWalletAddressesEqual = (address1, address2) => {
  if (!address1 && !address2) return true;
  if (!address1 || !address2) return false;
  
  return address1.trim() === address2.trim();
};

/**
 * Get wallet connection status display info
 * @param {Object} walletState - Wallet state object
 * @param {boolean} walletState.connected - Whether Solana wallet is connected
 * @param {boolean} walletState.hasWallet - Whether user has saved wallet
 * @param {string|null} walletState.publicKey - Connected wallet's public key
 * @param {string|null} walletState.walletAddress - Saved wallet address
 * @param {boolean} walletState.loading - Whether operations are loading
 * @param {string|null} walletState.error - Any error message
 * @returns {Object} Status display information
 */
export const getWalletStatusDisplay = (walletState) => {
  const {
    connected = false,
    hasWallet = false,
    publicKey = null,
    walletAddress = null,
    loading = false,
    error = null
  } = walletState || {};

  if (loading) {
    return {
      type: 'info',
      message: 'Checking wallet connection...',
      color: '#2196f3',
      icon: '🔄'
    };
  }

  if (error) {
    return {
      type: 'error',
      message: error,
      color: '#f44336',
      icon: '❌'
    };
  }

  if (!connected) {
    return {
      type: 'warning',
      message: 'No wallet connected',
      color: '#ff9800',
      icon: '⚠️'
    };
  }

  if (connected && !hasWallet) {
    return {
      type: 'warning',
      message: 'Wallet connected but not saved to account',
      color: '#ff9800',
      icon: '⚠️'
    };
  }

  const mismatch = publicKey && walletAddress && publicKey !== walletAddress;
  if (mismatch) {
    return {
      type: 'warning',
      message: 'Connected wallet differs from saved wallet',
      color: '#ff9800',
      icon: '⚠️'
    };
  }

  if (connected && hasWallet) {
    return {
      type: 'success',
      message: 'Wallet connected and saved',
      color: '#4caf50',
      icon: '✅'
    };
  }

  return {
    type: 'info',
    message: 'Ready to connect wallet',
    color: '#2196f3',
    icon: 'ℹ️'
  };
};

// Export the service instance for convenience
export { walletService };

// Re-export wallet service methods for easier migration
export const checkWalletStatus = walletService.checkWalletStatus.bind(walletService);
export const connectWallet = walletService.connectWallet.bind(walletService);
export const disconnectWallet = walletService.disconnectWallet.bind(walletService);
export const validateWallet = walletService.validateWallet.bind(walletService);
