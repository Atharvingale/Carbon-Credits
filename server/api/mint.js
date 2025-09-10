// Load environment variables first
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bs58 = require('bs58');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { createMint, getOrCreateAssociatedTokenAccount, mintTo } = require('@solana/spl-token');

const app = express();
app.use(express.json());

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
if (process.env.SOLANA_PAYER_SECRET.startsWith('[')) {
  payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.SOLANA_PAYER_SECRET)));
} else {
  payer = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_PAYER_SECRET));
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
    const { projectId, recipientWallet, amount, decimals = 0 } = req.body;
    
    if (!projectId || !recipientWallet || !amount) {
      return res.status(400).send('Missing required parameters');
    }
    
    const recipient = new PublicKey(recipientWallet);

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
    const amountToMint = BigInt(amount) * BigInt(Math.pow(10, decimals));
    const sig = await mintTo(
      connection,
      payer,
      mint,
      recipientTokenAccount.address,
      payer.publicKey,
      amountToMint
    );

    // Store on Supabase tokens table
    await supabase.from('tokens').insert([{ 
      mint: mint.toBase58(), 
      project_id: projectId,
      recipient: recipientWallet, 
      amount, 
      minted_tx: sig 
    }]);

    // Update project with mint address if not already set
    await supabase
      .from('projects')
      .update({ mint_address: mint.toBase58() })
      .eq('id', projectId);

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