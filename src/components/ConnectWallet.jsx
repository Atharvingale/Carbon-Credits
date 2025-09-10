import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function ConnectWallet() {
  const { publicKey } = useWallet();
  
  return (
    <div className="wallet-connect">
      <WalletMultiButton />
      {publicKey && (
        <div className="wallet-address">
          <p>Connected: {publicKey.toString().slice(0, 6)}...{publicKey.toString().slice(-4)}</p>
        </div>
      )}
    </div>
  );
}