/**
 * Error handling utilities for API calls and user-facing errors
 */

// Error types for classification
export const ERROR_TYPES = {
  NETWORK: 'network',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  VALIDATION: 'validation',
  SERVER: 'server',
  BLOCKCHAIN: 'blockchain',
  UNKNOWN: 'unknown'
};

// User-friendly error messages
export const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: 'Network connection failed. Please check your internet connection and try again.',
  [ERROR_TYPES.AUTHENTICATION]: 'Authentication failed. Please log in again.',
  [ERROR_TYPES.AUTHORIZATION]: 'You don\'t have permission to perform this action.',
  [ERROR_TYPES.VALIDATION]: 'Please check your input and try again.',
  [ERROR_TYPES.SERVER]: 'Server error occurred. Please try again later.',
  [ERROR_TYPES.BLOCKCHAIN]: 'Blockchain transaction failed. Please check your wallet and try again.',
  [ERROR_TYPES.UNKNOWN]: 'An unexpected error occurred. Please try again.'
};

/**
 * Classify error based on status code or error type
 */
export const classifyError = (error) => {
  if (!error) return ERROR_TYPES.UNKNOWN;

  // Network errors
  if (!window.navigator.onLine || error.code === 'NETWORK_ERROR') {
    return ERROR_TYPES.NETWORK;
  }

  // HTTP status code based classification
  if (error.response) {
    const status = error.response.status;
    if (status === 401) return ERROR_TYPES.AUTHENTICATION;
    if (status === 403) return ERROR_TYPES.AUTHORIZATION;
    if (status >= 400 && status < 500) return ERROR_TYPES.VALIDATION;
    if (status >= 500) return ERROR_TYPES.SERVER;
  }

  // Solana/Blockchain specific errors
  if (error.message?.includes('wallet') || 
      error.message?.includes('transaction') ||
      error.message?.includes('insufficient funds') ||
      error.name === 'WalletError') {
    return ERROR_TYPES.BLOCKCHAIN;
  }

  // Supabase specific errors
  if (error.message?.includes('JWT') || error.message?.includes('auth')) {
    return ERROR_TYPES.AUTHENTICATION;
  }

  return ERROR_TYPES.UNKNOWN;
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error) => {
  const errorType = classifyError(error);
  
  // Try to get specific error message from server
  let specificMessage = null;
  if (error.response?.data?.message) {
    specificMessage = error.response.data.message;
  } else if (error.message) {
    specificMessage = error.message;
  }

  // Return specific message if it's user-friendly, otherwise use generic
  if (specificMessage && specificMessage.length < 200 && !specificMessage.includes('Error:')) {
    return specificMessage;
  }

  return ERROR_MESSAGES[errorType];
};

/**
 * Handle API errors with consistent error reporting
 */
export const handleApiError = (error, context = '') => {
  const errorType = classifyError(error);
  const userMessage = getErrorMessage(error);
  
  // Log detailed error for debugging
  console.group(`🚨 API Error ${context ? `(${context})` : ''}`);
  console.error('Error Type:', errorType);
  console.error('User Message:', userMessage);
  console.error('Original Error:', error);
  if (error.response) {
    console.error('Response Status:', error.response.status);
    console.error('Response Data:', error.response.data);
  }
  console.groupEnd();

  // Here you could send to error reporting service
  if (process.env.REACT_APP_SENTRY_DSN) {
    // Sentry.captureException(error, {
    //   tags: { errorType, context },
    //   extra: { userMessage }
    // });
  }

  return {
    type: errorType,
    message: userMessage,
    originalError: error
  };
};

/**
 * Async wrapper that handles errors for API calls
 */
export const withErrorHandling = async (apiCall, context = '') => {
  try {
    return await apiCall();
  } catch (error) {
    throw handleApiError(error, context);
  }
};

/**
 * React hook for managing error state
 */
import { useState } from 'react';

export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const executeWithErrorHandling = async (apiCall, context = '') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await withErrorHandling(apiCall, context);
      return result;
    } catch (handledError) {
      setError(handledError);
      throw handledError;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    error,
    isLoading,
    executeWithErrorHandling,
    clearError
  };
};

/**
 * Retry mechanism for failed operations
 */
export const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry authentication or validation errors
      const errorType = classifyError(error);
      if (errorType === ERROR_TYPES.AUTHENTICATION || 
          errorType === ERROR_TYPES.AUTHORIZATION ||
          errorType === ERROR_TYPES.VALIDATION) {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (i === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  
  throw lastError;
};