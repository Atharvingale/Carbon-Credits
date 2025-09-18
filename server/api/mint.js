// Load environment variables first
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bs58 = require('bs58');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { createMint, getOrCreateAssociatedTokenAccount, mintTo } = require('@solana/spl-token');

const app = express();
app.use(express.json());

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL environment variable');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}
if (!process.env.SOLANA_PAYER_SECRET) {
  throw new Error('Missing SOLANA_PAYER_SECRET environment variable');
}

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Solana connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
);

// Load payer keypair (support base58 or JSON array)
let payer;
try {
  if (process.env.SOLANA_PAYER_SECRET.startsWith('[')) {
    payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.SOLANA_PAYER_SECRET)));
  } else {
    payer = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_PAYER_SECRET));
  }
} catch (error) {
  throw new Error(`Invalid SOLANA_PAYER_SECRET format: ${error.message}`);
}

app.post('/mint', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).send('No token');

    // Verify token & extract user id
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(403).send('Invalid user');
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.role !== 'admin') {
      return res.status(403).send('Must be admin');
    }

    // Get payload data  
    const { projectId, recipientWallet, amount, decimals = 0, verificationHash } = req.body;
    
    if (!projectId || !recipientWallet || !amount) {
      return res.status(400).json({ error: 'Missing required parameters: projectId, recipientWallet, amount' });
    }
    
    // Validate amount is a positive integer
    const tokenAmount = parseInt(amount);
    if (!tokenAmount || tokenAmount <= 0) {
      return res.status(400).json({ error: 'Invalid token amount. Must be a positive integer.' });
    }
    
    const recipient = new PublicKey(recipientWallet);
    
    // Fetch project details for verification
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, title, status, calculated_credits, estimated_credits, credits_issued, mint_address')
      .eq('id', projectId)
      .single();
    
    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found or inaccessible' });
    }
    
    // Verify project hasn't already been minted
    if (project.credits_issued && project.credits_issued > 0) {
      return res.status(400).json({ 
        error: 'Project has already been minted', 
        details: `${project.credits_issued} credits already issued for this project`
      });
    }
    
    // Verify project is approved for minting
    if (project.status !== 'approved' && project.status !== 'credits_calculated') {
      return res.status(400).json({ 
        error: 'Project not ready for minting', 
        details: `Project status: ${project.status}. Must be 'approved' or 'credits_calculated'`
      });
    }
    
    // Verify token amount matches calculated/estimated credits
    const expectedCredits = project.calculated_credits || project.estimated_credits;
    if (!expectedCredits || Math.floor(expectedCredits) !== tokenAmount) {
      return res.status(400).json({ 
        error: 'Token amount mismatch', 
        details: `Requested: ${tokenAmount}, Expected: ${Math.floor(expectedCredits || 0)} from project calculations`
      });
    }

    // Create mint (or reuse existing project mint)
    const mint = await createMint(
      connection,
      payer,
      payer.publicKey,
      null,
      decimals
    );

    // Ensure recipient's associated token account
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      recipient
    );

    // Mint tokens (amount must be integer adjusted for decimals)
    const decimalsBI = BigInt(decimals);
    const amountBI = BigInt(amount);
    const tenBI = BigInt(10);
    const factor = decimalsBI === BigInt(0) ? BigInt(1) : tenBI ** decimalsBI;
    const amountToMint = amountBI * factor;
    const sig = await mintTo(
      connection,
      payer,
      mint,
      recipientTokenAccount.address,
      payer.publicKey,
      amountToMint
    );

    // Store on Supabase tokens table with verification data
    const tokenRecord = {
      mint: mint.toBase58(), 
      project_id: projectId,
      recipient: recipientWallet, 
      amount: BigInt(tokenAmount),
      decimals: decimals,
      minted_tx: sig,
      minted_by: user.id,
      token_standard: 'SPL',
      token_symbol: 'CCR',
      token_name: 'Carbon Credit Token',
      status: 'active',
      created_at: new Date().toISOString(),
      // Verification fields for immutability
      verification_data: {
        project_title: project.title,
        original_calculated_credits: project.calculated_credits,
        original_estimated_credits: project.estimated_credits,
        credits_source: project.calculated_credits ? 'calculated' : 'estimated',
        amount_verified: tokenAmount === Math.floor(expectedCredits),
        mint_timestamp: new Date().toISOString(),
        blockchain_network: 'solana-devnet'
      },
      is_verified: true,
      verification_hash: require('crypto').createHash('sha256')
        .update(`${projectId}-${tokenAmount}-${sig}-${Date.now()}`)
        .digest('hex')
    };
    
    const { error: insertError } = await supabase.from('tokens').insert([tokenRecord]);
    
    if (insertError) {
      console.error('Database insert error:', insertError);
      // Don't fail the transaction, just log the error
    }

    // Update projects with mint address and immutability verification
    const { error: updateError } = await supabase
      .from('projects')
      .update({ 
        mint_address: mint.toBase58(),
        status: 'credits_minted',
        credits_issued: tokenAmount,
        minting_transaction: sig,
        minted_at: new Date().toISOString(),
        is_immutable: true,
        verification_data: {
          original_credits: expectedCredits,
          minted_amount: tokenAmount,
          verification_passed: true,
          mint_transaction: sig,
          verification_timestamp: new Date().toISOString()
        }
      })
      .eq('id', projectId);
    
    if (updateError) {
      console.error('Project update error:', updateError);
    }

    res.json({ 
      mint: mint.toBase58(), 
      tx: sig,
      explorer_url: `https://explorer.solana.com/tx/${sig}?cluster=devnet`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});