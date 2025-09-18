/**
 * Custom React Hooks for Wallet Operations
 * Provides centralized state management and side effects for wallet functionality
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../lib/supabaseClient';
import walletService from '../services/walletService';

/**
 * @typedef {Object} WalletState
 * @property {boolean} loading - Whether any wallet operation is in progress
 * @property {boolean} connected - Whether a Solana wallet is connected
 * @property {string|null} publicKey - Connected wallet's public key
 * @property {boolean} hasWallet - Whether user has saved a wallet address
 * @property {string|null} walletAddress - User's saved wallet address
 * @property {string|null} connectedAt - When wallet was connected
 * @property {boolean} verified - Whether the wallet is verified
 * @property {string|null} error - Any error message
 * @property {boolean} isWalletMismatch - Whether connected wallet differs from saved wallet
 */

/**
 * @typedef {Object} WalletActions
 * @property {Function} connect - Connect wallet
 * @property {Function} disconnect - Disconnect wallet
 * @property {Function} saveWallet - Save current wallet address
 * @property {Function} removeWallet - Remove saved wallet address
 * @property {Function} refreshStatus - Refresh wallet status
 * @property {Function} clearError - Clear current error
 * @property {Function} validateAddress - Validate a wallet address
 */

/**
 * Main wallet hook that combines Solana wallet with our wallet service
 * @returns {{...WalletState, ...WalletActions}}
 */
export const useWallet = () => {
  const solanaWallet = useSolanaWallet();
  const [user, setUser] = useState(null);
  const [walletStatus, setWalletStatus] = useState({
    loading: true,
    hasWallet: false,
    walletAddress: null,
    connectedAt: null,
    verified: false,
    error: null
  });
  const [operationLoading, setOperationLoading] = useState(false);

  // Check user authentication
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch wallet status when user changes
  const refreshStatus = useCallback(async () => {
    if (!user) {
      setWalletStatus({
        loading: false,
        hasWallet: false,
        walletAddress: null,
        connectedAt: null,
        verified: false,
        error: null
      });
      return;
    }

    setWalletStatus(prev => ({ ...prev, loading: true, error: null }));

    try {
      const status = await walletService.checkWalletStatus(user.id, false);
      setWalletStatus({
        loading: false,
        hasWallet: status.hasWallet,
        walletAddress: status.walletAddress,
        connectedAt: status.connectedAt,
        verified: status.verified,
        error: status.error
      });
    } catch (error) {
      setWalletStatus(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  }, [user]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Check for wallet mismatch
  const isWalletMismatch = useMemo(() => {
    if (!solanaWallet.publicKey || !walletStatus.walletAddress || !solanaWallet.connected) {
      return false;
    }
    return solanaWallet.publicKey.toBase58() !== walletStatus.walletAddress;
  }, [solanaWallet.publicKey, walletStatus.walletAddress, solanaWallet.connected]);

  // Connect wallet (Solana connection)
  const connect = useCallback(async () => {
    if (!solanaWallet.connect) {
      throw new Error('Wallet connection not available');
    }
    
    setOperationLoading(true);
    try {
      await solanaWallet.connect();
    } finally {
      setOperationLoading(false);
    }
  }, [solanaWallet]);

  // Disconnect wallet (Solana disconnection)
  const disconnect = useCallback(async () => {
    if (!solanaWallet.disconnect) {
      throw new Error('Wallet disconnection not available');
    }
    
    setOperationLoading(true);
    try {
      await solanaWallet.disconnect();
      setWalletStatus(prev => ({ ...prev, error: null }));
    } finally {
      setOperationLoading(false);
    }
  }, [solanaWallet]);

  // Save current wallet address to user account
  const saveWallet = useCallback(async () => {
    if (!user || !solanaWallet.publicKey || !solanaWallet.connected) {
      throw new Error('Please connect your wallet and ensure you\'re logged in');
    }

    setOperationLoading(true);
    setWalletStatus(prev => ({ ...prev, error: null }));

    try {
      const walletAddress = solanaWallet.publicKey.toBase58();
      const result = await walletService.connectWallet(walletAddress, user.id);

      if (result.success) {
        setWalletStatus(prev => ({
          ...prev,
          hasWallet: true,
          walletAddress: result.walletAddress,
          connectedAt: result.connectedAt,
          verified: result.verified
        }));
        return { success: true };
      } else {
        setWalletStatus(prev => ({ ...prev, error: result.error }));
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to save wallet address';
      setWalletStatus(prev => ({ ...prev, error: errorMessage }));
      return { success: false, error: errorMessage };
    } finally {
      setOperationLoading(false);
    }
  }, [user, solanaWallet.publicKey, solanaWallet.connected]);

  // Remove saved wallet address
  const removeWallet = useCallback(async () => {
    if (!user) {
      throw new Error('User must be logged in');
    }

    setOperationLoading(true);
    setWalletStatus(prev => ({ ...prev, error: null }));

    try {
      const result = await walletService.disconnectWallet(user.id);

      if (result.success) {
        setWalletStatus(prev => ({
          ...prev,
          hasWallet: false,
          walletAddress: null,
          connectedAt: null,
          verified: false
        }));
        return { success: true };
      } else {
        setWalletStatus(prev => ({ ...prev, error: result.error }));
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to remove wallet address';
      setWalletStatus(prev => ({ ...prev, error: errorMessage }));
      return { success: false, error: errorMessage };
    } finally {
      setOperationLoading(false);
    }
  }, [user]);

  // Validate wallet address
  const validateAddress = useCallback(async (address) => {
    if (!user) {
      return { valid: false, error: 'User must be logged in' };
    }

    try {
      return await walletService.validateWallet(address, user.id);
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }, [user]);

  // Clear current error
  const clearError = useCallback(() => {
    setWalletStatus(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    loading: walletStatus.loading || operationLoading,
    connected: solanaWallet.connected,
    publicKey: solanaWallet.publicKey?.toBase58() || null,
    hasWallet: walletStatus.hasWallet,
    walletAddress: walletStatus.walletAddress,
    connectedAt: walletStatus.connectedAt,
    verified: walletStatus.verified,
    error: walletStatus.error,
    isWalletMismatch,
    user,

    // Actions
    connect,
    disconnect,
    saveWallet,
    removeWallet,
    refreshStatus,
    clearError,
    validateAddress
  };
};

/**
 * Hook for checking wallet requirements
 * @param {string} context - Context for wallet requirement
 * @returns {Object} Wallet requirement status and helpers
 */
export const useWalletRequirement = (context = 'general') => {
  const wallet = useWallet();
  
  const requirementMessage = useMemo(() => {
    return walletService.getRequirementMessage(context);
  }, [context]);

  const isRequirementMet = useMemo(() => {
    return wallet.user && wallet.hasWallet && !wallet.loading;
  }, [wallet.user, wallet.hasWallet, wallet.loading]);

  const requirementStatus = useMemo(() => {
    if (!wallet.user) {
      return {
        type: 'error',
        message: 'Please log in to continue',
        canProceed: false
      };
    }

    if (wallet.loading) {
      return {
        type: 'info',
        message: 'Checking wallet connection...',
        canProceed: false
      };
    }

    if (!wallet.hasWallet) {
      return {
        type: 'warning',
        message: requirementMessage,
        canProceed: false
      };
    }

    if (wallet.error) {
      return {
        type: 'error',
        message: wallet.error,
        canProceed: false
      };
    }

    return {
      type: 'success',
      message: `✅ Wallet connected: ${wallet.walletAddress?.slice(0, 8)}...${wallet.walletAddress?.slice(-6)}`,
      canProceed: true
    };
  }, [wallet.user, wallet.loading, wallet.hasWallet, wallet.error, wallet.walletAddress, requirementMessage]);

  return {
    ...wallet,
    isRequirementMet,
    requirementStatus,
    requirementMessage
  };
};

/**
 * Hook for wallet service health checking
 * @returns {Object} Service health status
 */
export const useWalletServiceHealth = () => {
  const [health, setHealth] = useState({
    available: null,
    error: null,
    loading: true,
    lastChecked: null
  });

  const checkHealth = useCallback(async () => {
    setHealth(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await walletService.checkServiceHealth();
      setHealth({
        available: result.available,
        error: result.error,
        loading: false,
        lastChecked: new Date()
      });
    } catch (error) {
      setHealth({
        available: false,
        error: error.message,
        loading: false,
        lastChecked: new Date()
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    ...health,
    checkHealth
  };
};

/**
 * Hook for wallet operations with optimistic updates
 * @returns {Object} Wallet operations with optimistic UI updates
 */
export const useOptimisticWallet = () => {
  const wallet = useWallet();
  const [optimisticState, setOptimisticState] = useState({});

  const withOptimisticUpdate = useCallback((operation, optimisticData) => {
    return async (...args) => {
      // Apply optimistic update
      if (optimisticData) {
        setOptimisticState(optimisticData);
      }

      try {
        const result = await operation(...args);
        
        // Clear optimistic state on success
        setOptimisticState({});
        return result;
      } catch (error) {
        // Revert optimistic state on error
        setOptimisticState({});
        throw error;
      }
    };
  }, []);

  const saveWalletOptimistic = useMemo(() => {
    return withOptimisticUpdate(wallet.saveWallet, {
      hasWallet: true,
      walletAddress: wallet.publicKey,
      loading: false
    });
  }, [withOptimisticUpdate, wallet.saveWallet, wallet.publicKey]);

  const removeWalletOptimistic = useMemo(() => {
    return withOptimisticUpdate(wallet.removeWallet, {
      hasWallet: false,
      walletAddress: null,
      loading: false
    });
  }, [withOptimisticUpdate, wallet.removeWallet]);

  // Merge actual state with optimistic state
  const mergedState = useMemo(() => {
    return {
      ...wallet,
      ...optimisticState
    };
  }, [wallet, optimisticState]);

  return {
    ...mergedState,
    saveWallet: saveWalletOptimistic,
    removeWallet: removeWalletOptimistic
  };
};

export default useWallet;