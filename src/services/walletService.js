/**
 * Centralized Wallet Service
 * Handles all wallet-related operations with improved error handling,
 * caching, retry logic, and consistent API responses
 */

import { supabase } from '../lib/supabaseClient';
import { isValidPublicKey } from '../lib/solana';

/**
 * @typedef {Object} WalletStatus
 * @property {boolean} hasWallet - Whether user has a connected wallet
 * @property {string|null} walletAddress - The wallet address if connected
 * @property {string|null} connectedAt - ISO string of when wallet was connected
 * @property {boolean} verified - Whether the wallet is verified
 * @property {string|null} error - Error message if any
 * @property {boolean} loading - Whether operation is in progress
 */

/**
 * @typedef {Object} WalletServiceConfig
 * @property {string} apiBaseUrl - Base URL for wallet API
 * @property {number} retryAttempts - Number of retry attempts for failed requests
 * @property {number} retryDelay - Delay between retry attempts in ms
 * @property {number} cacheTimeout - Cache timeout in ms
 */

class WalletService {
  constructor() {
    /** @type {WalletServiceConfig} */
    this.config = {
      apiBaseUrl: process.env.REACT_APP_WALLET_API_URL || 'http://localhost:3001',
      retryAttempts: 3,
      retryDelay: 1000,
      cacheTimeout: 5 * 60 * 1000 // 5 minutes
    };

    /** @type {Map<string, {data: any, timestamp: number}>} */
    this.cache = new Map();
    
    /** @type {Map<string, Promise>} */
    this.pendingRequests = new Map();
  }

  /**
   * Get cached data if valid
   * @private
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if expired/missing
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > this.config.cacheTimeout;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Set cache data
   * @private
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache for specific key or all cache
   * @param {string|null} key - Cache key to clear, or null to clear all
   */
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get authenticated session
   * @private
   * @returns {Promise<{session: any, error: string|null}>}
   */
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        return { session: null, error: error.message };
      }
      if (!session) {
        return { session: null, error: 'User not authenticated' };
      }
      return { session, error: null };
    } catch (error) {
      return { session: null, error: error.message };
    }
  }

  /**
   * Make authenticated API request with retry logic
   * @private
   * @param {string} endpoint - API endpoint
   * @param {RequestInit} options - Fetch options
   * @param {number} attempt - Current attempt number
   * @returns {Promise<Response>}
   */
  async makeAuthenticatedRequest(endpoint, options = {}, attempt = 1) {
    const { session, error: sessionError } = await this.getSession();
    if (sessionError) {
      throw new Error(sessionError);
    }

    const url = `${this.config.apiBaseUrl}${endpoint}`;
    const requestOptions = {
      ...options,
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, requestOptions);
      
      // If request failed and we haven't exhausted retry attempts
      if (!response.ok && attempt < this.config.retryAttempts) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        return this.makeAuthenticatedRequest(endpoint, options, attempt + 1);
      }
      
      return response;
    } catch (error) {
      // Network error - retry if attempts remaining
      if (attempt < this.config.retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        return this.makeAuthenticatedRequest(endpoint, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Check user's wallet status
   * @param {string} userId - User ID
   * @param {boolean} useCache - Whether to use cached data
   * @returns {Promise<WalletStatus>}
   */
  async checkWalletStatus(userId, useCache = true) {
    if (!userId) {
      return {
        hasWallet: false,
        walletAddress: null,
        connectedAt: null,
        verified: false,
        error: 'User ID is required',
        loading: false
      };
    }

    const cacheKey = `wallet_status_${userId}`;
    
    // Check cache if enabled
    if (useCache) {
      const cached = this.getCached(cacheKey);
      if (cached) {
        return { ...cached, loading: false };
      }
    }

    // Check for pending request to avoid duplicate calls
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const promise = this._checkWalletStatusInternal(userId, cacheKey);
    this.pendingRequests.set(cacheKey, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Internal wallet status check implementation
   * @private
   * @param {string} userId - User ID
   * @param {string} cacheKey - Cache key
   * @returns {Promise<WalletStatus>}
   */
  async _checkWalletStatusInternal(userId, cacheKey) {
    try {
      // Try API first
      const response = await this.makeAuthenticatedRequest('/wallet');
      
      if (response.ok) {
        const data = await response.json();
        const result = {
          hasWallet: data.hasWallet,
          walletAddress: data.walletAddress,
          connectedAt: data.connectedAt,
          verified: data.verified,
          error: null,
          loading: false
        };
        
        this.setCache(cacheKey, result);
        return result;
      } else {
        // API failed, fallback to direct database check
        return this._checkWalletFromDB(userId, cacheKey);
      }
    } catch (error) {
      return this._checkWalletFromDB(userId, cacheKey);
    }
  }

  /**
   * Fallback to check wallet directly from database
   * @private
   * @param {string} userId - User ID
   * @param {string} cacheKey - Cache key
   * @returns {Promise<WalletStatus>}
   */
  async _checkWalletFromDB(userId, cacheKey) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('wallet_address, wallet_connected_at, wallet_verified')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === '42703') {
          // Wallet columns don't exist
          const result = {
            hasWallet: false,
            walletAddress: null,
            connectedAt: null,
            verified: false,
            error: 'Wallet feature not configured. Please contact administrator.',
            loading: false
          };
          return result;
        }
        throw error;
      }

      const result = {
        hasWallet: !!profile?.wallet_address,
        walletAddress: profile?.wallet_address || null,
        connectedAt: profile?.wallet_connected_at || null,
        verified: profile?.wallet_verified || false,
        error: null,
        loading: false
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      return {
        hasWallet: false,
        walletAddress: null,
        connectedAt: null,
        verified: false,
        error: error.message,
        loading: false
      };
    }
  }

  /**
   * Connect/save wallet address
   * @param {string} walletAddress - Wallet address to save
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, walletAddress?: string, connectedAt?: string, verified?: boolean, error?: string}>}
   */
  async connectWallet(walletAddress, userId) {
    // Validate wallet address
    if (!walletAddress || !isValidPublicKey(walletAddress)) {
      return {
        success: false,
        error: 'Invalid wallet address format'
      };
    }

    if (!userId) {
      return {
        success: false,
        error: 'User ID is required'
      };
    }

    try {
      const response = await this.makeAuthenticatedRequest('/wallet', {
        method: 'POST',
        body: JSON.stringify({ walletAddress })
      });

      const data = await response.json();

      if (response.ok) {
        // Clear cache to force refresh
        this.clearCache(`wallet_status_${userId}`);
        
        return {
          success: true,
          walletAddress: data.walletAddress,
          connectedAt: data.connectedAt,
          verified: data.verified
        };
      } else {
        return {
          success: false,
          error: data.error || 'Failed to save wallet address'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to connect to wallet service'
      };
    }
  }

  /**
   * Disconnect/remove wallet address
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async disconnectWallet(userId) {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required'
      };
    }

    try {
      const response = await this.makeAuthenticatedRequest('/wallet', {
        method: 'DELETE'
      });

      if (response.ok) {
        // Clear cache to force refresh
        this.clearCache(`wallet_status_${userId}`);
        
        return { success: true };
      } else {
        const data = await response.json();
        return {
          success: false,
          error: data.error || 'Failed to remove wallet address'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to connect to wallet service'
      };
    }
  }

  /**
   * Validate wallet address format and availability
   * @param {string} walletAddress - Wallet address to validate
   * @param {string} currentUserId - Current user's ID (to exclude from uniqueness check)
   * @returns {Promise<{valid: boolean, available?: boolean, error?: string}>}
   */
  async validateWallet(walletAddress, currentUserId = null) {
    if (!walletAddress) {
      return {
        valid: false,
        error: 'Wallet address is required'
      };
    }

    // Check format
    if (!isValidPublicKey(walletAddress)) {
      return {
        valid: false,
        error: 'Invalid wallet address format'
      };
    }

    try {
      // Check if wallet is already in use
      const { data: existingWallet, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('wallet_address', walletAddress)
        .neq('id', currentUserId || '');

      if (error) {
        return {
          valid: true,
          available: true,
          error: 'Could not check wallet availability'
        };
      }

      if (existingWallet && existingWallet.length > 0) {
        return {
          valid: true,
          available: false,
          error: 'This wallet address is already in use by another account'
        };
      }

      return {
        valid: true,
        available: true
      };
    } catch (error) {
      return {
        valid: true,
        available: true,
        error: 'Could not validate wallet availability'
      };
    }
  }

  /**
   * Get user-friendly wallet requirement message
   * @param {string} context - Context for the message
   * @returns {string} User-friendly message
   */
  getRequirementMessage(context = 'general') {
    const messages = {
      project_creation: 'A wallet address is required to create projects. This ensures carbon credits can be minted directly to your wallet when your project is approved.',
      token_minting: 'A wallet address is required to receive minted carbon credit tokens.',
      token_transfer: 'A wallet address is required to send or receive token transfers.',
      project_verification: 'A wallet address is required for project verification and token distribution.',
      general: 'A wallet address is required for this blockchain operation.'
    };

    return messages[context] || messages.general;
  }

  /**
   * Check if wallet service is available
   * @returns {Promise<{available: boolean, error?: string}>}
   */
  async checkServiceHealth() {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });

      return {
        available: response.ok,
        error: response.ok ? null : 'Wallet service is not responding'
      };
    } catch (error) {
      return {
        available: false,
        error: 'Wallet service is not accessible'
      };
    }
  }
}

// Create and export singleton instance
export const walletService = new WalletService();
export default walletService;