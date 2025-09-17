import { supabase } from '../lib/supabaseClient';

/**
 * Check if user has a wallet connected and saved
 * @param {string} userId - User ID to check
 * @returns {Promise<{hasWallet: boolean, walletAddress: string|null, error: string|null}>}
 */
export const checkUserWallet = async (userId) => {
  try {
    if (!userId) {
      return { hasWallet: false, walletAddress: null, error: 'User ID is required' };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { hasWallet: false, walletAddress: null, error: 'User not authenticated' };
    }

    // Try to fetch wallet from API
    try {
      const response = await fetch('http://localhost:3001/wallet', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          hasWallet: !!data.walletAddress,
          walletAddress: data.walletAddress,
          error: null
        };
      } else {
        // API error - wallet service might not be available
        console.warn('Wallet API not available, checking database directly');
        return await checkUserWalletFromDB(userId);
      }
    } catch (apiError) {
      // Network error - fallback to database check
      console.warn('Wallet API not accessible, checking database directly');
      return await checkUserWalletFromDB(userId);
    }
  } catch (error) {
    console.error('Error checking user wallet:', error);
    return { hasWallet: false, walletAddress: null, error: error.message };
  }
};

/**
 * Fallback method to check wallet from database directly
 * @param {string} userId - User ID to check
 * @returns {Promise<{hasWallet: boolean, walletAddress: string|null, error: string|null}>}
 */
const checkUserWalletFromDB = async (userId) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === '42703') {
        // Column doesn't exist - wallet feature not set up yet
        return { 
          hasWallet: false, 
          walletAddress: null, 
          error: 'Wallet feature not configured. Please contact administrator.' 
        };
      }
      throw error;
    }

    return {
      hasWallet: !!profile?.wallet_address,
      walletAddress: profile?.wallet_address || null,
      error: null
    };
  } catch (error) {
    console.error('Database wallet check error:', error);
    return { hasWallet: false, walletAddress: null, error: error.message };
  }
};

/**
 * Get user-friendly wallet requirement message
 * @param {string} context - Context where wallet is required (e.g., 'project_creation')
 * @returns {string} User-friendly message
 */
export const getWalletRequirementMessage = (context = 'project_creation') => {
  const messages = {
    project_creation: 'A wallet address is required to create projects. This ensures tokens can be minted to your wallet when your project is approved.',
    token_minting: 'A wallet address is required for token minting.',
    general: 'A wallet address is required for this action.'
  };
  
  return messages[context] || messages.general;
};