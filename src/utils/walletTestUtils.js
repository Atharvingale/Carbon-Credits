/**
 * Wallet Testing Utilities
 * Provides mock implementations and testing utilities for wallet functionality
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Mock wallet addresses for testing
 */
export const MOCK_WALLETS = {
  PHANTOM: '11111111111111111111111111111112',
  SOLFLARE: '22222222222222222222222222222223',
  TORUS: '33333333333333333333333333333334',
  LEDGER: '44444444444444444444444444444445',
  INVALID: 'invalid-wallet-address',
  EMPTY: '',
  NULL: null
};

/**
 * Mock user data for testing
 */
export const MOCK_USERS = {
  AUTHENTICATED: {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User'
  },
  UNAUTHENTICATED: null,
  ADMIN: {
    id: 'admin-456',
    email: 'admin@example.com',
    full_name: 'Admin User',
    role: 'admin'
  }
};

/**
 * Mock wallet service responses
 */
export const MOCK_RESPONSES = {
  SUCCESS: {
    success: true,
    walletAddress: MOCK_WALLETS.PHANTOM,
    connectedAt: new Date().toISOString(),
    verified: true
  },
  WALLET_IN_USE: {
    success: false,
    error: 'Wallet address already in use'
  },
  INVALID_ADDRESS: {
    success: false,
    error: 'Invalid wallet address format'
  },
  SERVICE_ERROR: {
    success: false,
    error: 'Failed to connect to wallet service'
  },
  NETWORK_ERROR: {
    success: false,
    error: 'Network error'
  }
};

/**
 * Mock wallet status objects
 */
export const MOCK_WALLET_STATUS = {
  CONNECTED_AND_SAVED: {
    loading: false,
    connected: true,
    hasWallet: true,
    publicKey: MOCK_WALLETS.PHANTOM,
    walletAddress: MOCK_WALLETS.PHANTOM,
    connectedAt: new Date().toISOString(),
    verified: true,
    error: null,
    isWalletMismatch: false,
    user: MOCK_USERS.AUTHENTICATED
  },
  CONNECTED_NOT_SAVED: {
    loading: false,
    connected: true,
    hasWallet: false,
    publicKey: MOCK_WALLETS.PHANTOM,
    walletAddress: null,
    connectedAt: null,
    verified: false,
    error: null,
    isWalletMismatch: false,
    user: MOCK_USERS.AUTHENTICATED
  },
  NOT_CONNECTED: {
    loading: false,
    connected: false,
    hasWallet: false,
    publicKey: null,
    walletAddress: null,
    connectedAt: null,
    verified: false,
    error: null,
    isWalletMismatch: false,
    user: MOCK_USERS.AUTHENTICATED
  },
  WALLET_MISMATCH: {
    loading: false,
    connected: true,
    hasWallet: true,
    publicKey: MOCK_WALLETS.SOLFLARE,
    walletAddress: MOCK_WALLETS.PHANTOM,
    connectedAt: new Date().toISOString(),
    verified: true,
    error: null,
    isWalletMismatch: true,
    user: MOCK_USERS.AUTHENTICATED
  },
  LOADING: {
    loading: true,
    connected: false,
    hasWallet: false,
    publicKey: null,
    walletAddress: null,
    connectedAt: null,
    verified: false,
    error: null,
    isWalletMismatch: false,
    user: MOCK_USERS.AUTHENTICATED
  },
  ERROR: {
    loading: false,
    connected: false,
    hasWallet: false,
    publicKey: null,
    walletAddress: null,
    connectedAt: null,
    verified: false,
    error: 'Failed to connect wallet',
    isWalletMismatch: false,
    user: MOCK_USERS.AUTHENTICATED
  },
  NO_USER: {
    loading: false,
    connected: false,
    hasWallet: false,
    publicKey: null,
    walletAddress: null,
    connectedAt: null,
    verified: false,
    error: null,
    isWalletMismatch: false,
    user: null
  }
};

/**
 * Mock Solana wallet adapter for testing
 */
export class MockWalletAdapter {
  constructor(options = {}) {
    this.name = options.name || 'Mock Wallet';
    this.icon = options.icon || 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
    this.url = options.url || 'https://mockwallet.com';
    this.publicKey = options.publicKey ? new PublicKey(options.publicKey) : null;
    this.connected = options.connected || false;
    this.connecting = false;
    this.disconnecting = false;
    this.readyState = options.readyState || 'Installed';
    
    this._shouldFailConnection = options.shouldFailConnection || false;
    this._shouldFailDisconnection = options.shouldFailDisconnection || false;
    this._connectionDelay = options.connectionDelay || 0;
  }

  async connect() {
    if (this._shouldFailConnection) {
      throw new Error('Connection failed');
    }
    
    this.connecting = true;
    
    // Simulate connection delay
    if (this._connectionDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this._connectionDelay));
    }
    
    this.connected = true;
    this.connecting = false;
    
    if (!this.publicKey) {
      this.publicKey = new PublicKey(MOCK_WALLETS.PHANTOM);
    }
    
    this.emit('connect', this.publicKey);
    return this.publicKey;
  }

  async disconnect() {
    if (this._shouldFailDisconnection) {
      throw new Error('Disconnection failed');
    }
    
    this.disconnecting = true;
    this.connected = false;
    this.publicKey = null;
    this.disconnecting = false;
    
    this.emit('disconnect');
  }

  async signTransaction(transaction) {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }
    
    // Mock signing - return the transaction as-is
    return transaction;
  }

  async signAllTransactions(transactions) {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }
    
    // Mock signing - return transactions as-is
    return transactions;
  }

  async signMessage(message) {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }
    
    // Mock signing - return a fake signature
    return new Uint8Array(64).fill(0);
  }

  emit(event, ...args) {
    if (this.listeners && this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(...args));
    }
  }

  on(event, listener) {
    if (!this.listeners) {
      this.listeners = {};
    }
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off(event, listener) {
    if (this.listeners && this.listeners[event]) {
      const index = this.listeners[event].indexOf(listener);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }
}

/**
 * Mock wallet service for testing
 */
export class MockWalletService {
  constructor() {
    this.responses = { ...MOCK_RESPONSES };
    this.delays = new Map();
    this.callCounts = new Map();
    this.lastCallArgs = new Map();
    this.walletStorage = new Map();
  }

  /**
   * Set custom response for a method
   * @param {string} method - Method name
   * @param {*} response - Response to return
   */
  setResponse(method, response) {
    this.responses[method] = response;
  }

  /**
   * Set delay for a method
   * @param {string} method - Method name
   * @param {number} delay - Delay in ms
   */
  setDelay(method, delay) {
    this.delays.set(method, delay);
  }

  /**
   * Get call count for a method
   * @param {string} method - Method name
   * @returns {number} Call count
   */
  getCallCount(method) {
    return this.callCounts.get(method) || 0;
  }

  /**
   * Get last call arguments for a method
   * @param {string} method - Method name
   * @returns {*} Last call arguments
   */
  getLastCallArgs(method) {
    return this.lastCallArgs.get(method);
  }

  /**
   * Reset all counters and state
   */
  reset() {
    this.callCounts.clear();
    this.lastCallArgs.clear();
    this.walletStorage.clear();
    this.responses = { ...MOCK_RESPONSES };
    this.delays.clear();
  }

  async _simulateCall(method, ...args) {
    // Track call
    this.callCounts.set(method, this.getCallCount(method) + 1);
    this.lastCallArgs.set(method, args);

    // Simulate delay
    const delay = this.delays.get(method);
    if (delay) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  async checkWalletStatus(userId) {
    await this._simulateCall('checkWalletStatus', userId);
    
    if (!userId) {
      return {
        hasWallet: false,
        walletAddress: null,
        error: 'User ID is required',
        loading: false
      };
    }

    const storedWallet = this.walletStorage.get(userId);
    return storedWallet || {
      hasWallet: false,
      walletAddress: null,
      error: null,
      loading: false
    };
  }

  async connectWallet(walletAddress, userId) {
    await this._simulateCall('connectWallet', walletAddress, userId);
    
    // Check for custom response
    if (this.responses.connectWallet) {
      return this.responses.connectWallet;
    }

    // Simulate validation
    if (!walletAddress || walletAddress === MOCK_WALLETS.INVALID) {
      return MOCK_RESPONSES.INVALID_ADDRESS;
    }

    // Check if wallet is already in use
    for (const [storedUserId, wallet] of this.walletStorage) {
      if (wallet.walletAddress === walletAddress && storedUserId !== userId) {
        return MOCK_RESPONSES.WALLET_IN_USE;
      }
    }

    // Store wallet
    const walletData = {
      hasWallet: true,
      walletAddress,
      connectedAt: new Date().toISOString(),
      verified: true
    };
    
    this.walletStorage.set(userId, walletData);
    
    return {
      success: true,
      ...walletData
    };
  }

  async disconnectWallet(userId) {
    await this._simulateCall('disconnectWallet', userId);
    
    // Check for custom response
    if (this.responses.disconnectWallet) {
      return this.responses.disconnectWallet;
    }

    // Remove wallet
    this.walletStorage.delete(userId);
    
    return { success: true };
  }

  async validateWallet(walletAddress, currentUserId = null) {
    await this._simulateCall('validateWallet', walletAddress, currentUserId);
    
    if (!walletAddress) {
      return {
        valid: false,
        error: 'Wallet address is required'
      };
    }

    if (walletAddress === MOCK_WALLETS.INVALID) {
      return {
        valid: false,
        error: 'Invalid wallet address format'
      };
    }

    // Check availability
    for (const [userId, wallet] of this.walletStorage) {
      if (wallet.walletAddress === walletAddress && userId !== currentUserId) {
        return {
          valid: true,
          available: false,
          error: 'This wallet address is already in use by another account'
        };
      }
    }

    return {
      valid: true,
      available: true
    };
  }

  getRequirementMessage(context = 'general') {
    const messages = {
      project_creation: 'A wallet address is required to create projects.',
      token_minting: 'A wallet address is required to receive tokens.',
      general: 'A wallet address is required for this operation.'
    };
    return messages[context] || messages.general;
  }
}

/**
 * Mock Supabase client for testing
 */
export class MockSupabaseClient {
  constructor() {
    this.sessionData = null;
    this.profileData = new Map();
    this.queries = [];
  }

  setSession(session) {
    this.sessionData = session;
  }

  setProfile(userId, profile) {
    this.profileData.set(userId, profile);
  }

  auth = {
    getSession: async () => {
      return {
        data: { session: this.sessionData },
        error: null
      };
    },
    
    onAuthStateChange: (callback) => {
      // Mock subscription
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }
  };

  from(table) {
    const query = {
      table,
      operations: [],
      
      select: (fields) => {
        query.operations.push({ type: 'select', fields });
        return query;
      },
      
      eq: (field, value) => {
        query.operations.push({ type: 'eq', field, value });
        return query;
      },
      
      neq: (field, value) => {
        query.operations.push({ type: 'neq', field, value });
        return query;
      },
      
      single: async () => {
        this.queries.push(query);
        
        if (table === 'profiles') {
          // Find matching profile
          const eqOp = query.operations.find(op => op.type === 'eq' && op.field === 'id');
          if (eqOp) {
            const profile = this.profileData.get(eqOp.value);
            if (profile) {
              return { data: profile, error: null };
            }
          }
          
          return {
            data: null,
            error: { code: 'PGRST116', message: 'No rows returned' }
          };
        }
        
        return { data: null, error: null };
      },
      
      update: (data) => {
        query.operations.push({ type: 'update', data });
        return query;
      }
    };
    
    return query;
  }

  reset() {
    this.sessionData = null;
    this.profileData.clear();
    this.queries = [];
  }
}

/**
 * Test utilities for wallet operations
 */
export const WalletTestUtils = {
  /**
   * Create a mock wallet state for testing
   * @param {Object} overrides - Properties to override
   * @returns {Object} Mock wallet state
   */
  createMockWalletState(overrides = {}) {
    return {
      ...MOCK_WALLET_STATUS.NOT_CONNECTED,
      ...overrides
    };
  },

  /**
   * Create a mock wallet adapter
   * @param {Object} options - Adapter options
   * @returns {MockWalletAdapter} Mock adapter instance
   */
  createMockAdapter(options = {}) {
    return new MockWalletAdapter(options);
  },

  /**
   * Create a mock wallet service
   * @returns {MockWalletService} Mock service instance
   */
  createMockService() {
    return new MockWalletService();
  },

  /**
   * Create a mock Supabase client
   * @returns {MockSupabaseClient} Mock client instance
   */
  createMockSupabase() {
    return new MockSupabaseClient();
  },

  /**
   * Wait for async operations to complete
   * @param {number} ms - Milliseconds to wait
   */
  async wait(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Generate a random valid Solana address
   * @returns {string} Random Solana address
   */
  generateRandomAddress() {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Validate test assertions for wallet state
   * @param {Object} actualState - Actual wallet state
   * @param {Object} expectedState - Expected wallet state
   * @param {string[]} fields - Fields to check
   */
  assertWalletState(actualState, expectedState, fields = []) {
    const fieldsToCheck = fields.length > 0 ? fields : Object.keys(expectedState);
    
    fieldsToCheck.forEach(field => {
      if (actualState[field] !== expectedState[field]) {
        throw new Error(
          `Wallet state assertion failed for field '${field}': ` +
          `expected ${expectedState[field]}, got ${actualState[field]}`
        );
      }
    });
  },

  /**
   * Create a test scenario with specific conditions
   * @param {string} scenario - Scenario name
   * @returns {Object} Scenario configuration
   */
  getTestScenario(scenario) {
    const scenarios = {
      'user-not-authenticated': {
        user: null,
        walletState: MOCK_WALLET_STATUS.NO_USER,
        expectedRequirement: false
      },
      
      'user-authenticated-no-wallet': {
        user: MOCK_USERS.AUTHENTICATED,
        walletState: MOCK_WALLET_STATUS.NOT_CONNECTED,
        expectedRequirement: false
      },
      
      'wallet-connected-not-saved': {
        user: MOCK_USERS.AUTHENTICATED,
        walletState: MOCK_WALLET_STATUS.CONNECTED_NOT_SAVED,
        expectedRequirement: false
      },
      
      'wallet-mismatch': {
        user: MOCK_USERS.AUTHENTICATED,
        walletState: MOCK_WALLET_STATUS.WALLET_MISMATCH,
        expectedRequirement: false
      },
      
      'requirements-met': {
        user: MOCK_USERS.AUTHENTICATED,
        walletState: MOCK_WALLET_STATUS.CONNECTED_AND_SAVED,
        expectedRequirement: true
      },
      
      'loading-state': {
        user: MOCK_USERS.AUTHENTICATED,
        walletState: MOCK_WALLET_STATUS.LOADING,
        expectedRequirement: false
      },
      
      'error-state': {
        user: MOCK_USERS.AUTHENTICATED,
        walletState: MOCK_WALLET_STATUS.ERROR,
        expectedRequirement: false
      }
    };
    
    return scenarios[scenario] || scenarios['user-not-authenticated'];
  }
};

export default WalletTestUtils;