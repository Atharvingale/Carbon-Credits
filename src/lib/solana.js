import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';

// Default RPC endpoint
const DEFAULT_RPC_URL = process.env.REACT_APP_SOLANA_RPC_URL || clusterApiUrl('devnet');

/**
 * Create a connection to the Solana network
 * @param {string} rpcUrl - Optional custom RPC URL
 * @returns {Connection} Solana connection instance
 */
export const createConnection = (rpcUrl = DEFAULT_RPC_URL) => {
  return new Connection(rpcUrl, 'confirmed');
};

/**
 * Validate if a string is a valid Solana public key
 * @param {string} address - The address to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidPublicKey = (address) => {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get the associated token account address for a wallet and mint
 * @param {PublicKey} mint - The token mint address
 * @param {PublicKey} owner - The wallet owner address
 * @returns {Promise<PublicKey>} The associated token account address
 */
export const getAssociatedTokenAccount = async (mint, owner) => {
  return await getAssociatedTokenAddress(mint, owner);
};

/**
 * Get token balance for a specific account
 * @param {Connection} connection - Solana connection
 * @param {PublicKey} tokenAccount - Token account address
 * @returns {Promise<number>} Token balance
 */
export const getTokenBalance = async (connection, tokenAccount) => {
  try {
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    return balance.value.uiAmount || 0;
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return 0;
  }
};

/**
 * Get all token accounts for a wallet
 * @param {Connection} connection - Solana connection
 * @param {PublicKey} wallet - Wallet public key
 * @returns {Promise<Array>} Array of token accounts
 */
export const getTokenAccounts = async (connection, wallet) => {
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      wallet,
      { programId: TOKEN_PROGRAM_ID }
    );
    return tokenAccounts.value.map(account => ({
      pubkey: account.pubkey,
      mint: account.account.data.parsed.info.mint,
      tokenAmount: account.account.data.parsed.info.tokenAmount,
    }));
  } catch (error) {
    console.error('Error fetching token accounts:', error);
    return [];
  }
};

/**
 * Format a public key for display (show first and last few characters)
 * @param {string|PublicKey} publicKey - The public key to format
 * @param {number} chars - Number of characters to show at start/end
 * @returns {string} Formatted public key
 */
export const formatPublicKey = (publicKey, chars = 4) => {
  const key = publicKey.toString();
  return `${key.slice(0, chars)}...${key.slice(-chars)}`;
};

/**
 * Convert lamports to SOL
 * @param {number} lamports - Amount in lamports
 * @returns {number} Amount in SOL
 */
export const lamportsToSol = (lamports) => {
  return lamports / 1e9;
};

/**
 * Convert SOL to lamports
 * @param {number} sol - Amount in SOL
 * @returns {number} Amount in lamports
 */
export const solToLamports = (sol) => {
  return Math.floor(sol * 1e9);
};

/**
 * Get transaction explorer URL
 * @param {string} signature - Transaction signature
 * @param {string} cluster - Solana cluster (mainnet-beta, devnet, testnet)
 * @returns {string} Explorer URL
 */
export const getExplorerUrl = (signature, cluster = 'devnet') => {
  const baseUrl = 'https://explorer.solana.com';
  const clusterParam = cluster !== 'mainnet-beta' ? `?cluster=${cluster}` : '';
  return `${baseUrl}/tx/${signature}${clusterParam}`;
};

/**
 * Airdrop SOL to a wallet (devnet/testnet only)
 * @param {Connection} connection - Solana connection
 * @param {PublicKey} publicKey - Wallet public key
 * @param {number} amount - Amount of SOL to airdrop
 * @returns {Promise<string>} Transaction signature
 */
export const airdropSol = async (connection, publicKey, amount = 1) => {
  try {
    const signature = await connection.requestAirdrop(
      publicKey,
      solToLamports(amount)
    );
    await connection.confirmTransaction(signature);
    return signature;
  } catch (error) {
    console.error('Airdrop failed:', error);
    throw error;
  }
};
