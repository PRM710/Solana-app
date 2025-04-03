import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import * as web3 from '@solana/web3.js';
import * as splToken from '@solana/spl-token';

const TokenCreator: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [tokenMint, setTokenMint] = useState<string | null>(null);
  const [transactionSig, setTransactionSig] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const createToken = async () => {
    if (!publicKey) {
      setError('❌ Wallet not connected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const mint = web3.Keypair.generate();
      const transaction = new web3.Transaction();

      const mintRent = await connection.getMinimumBalanceForRentExemption(splToken.MINT_SIZE);
      transaction.add(
        web3.SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mint.publicKey,
          space: splToken.MINT_SIZE,
          lamports: mintRent,
          programId: splToken.TOKEN_PROGRAM_ID,
        }),
        splToken.createInitializeMintInstruction(
          mint.publicKey,
          6, // Decimals
          publicKey, // Mint authority
          publicKey, // Freeze authority
          splToken.TOKEN_PROGRAM_ID
        )
      );

      const signature = await sendTransaction(transaction, connection, { signers: [mint] });
      await connection.confirmTransaction(signature, 'confirmed');
      
      setTokenMint(mint.publicKey.toBase58());
      setTransactionSig(signature);
    } catch (err) {
      setError(`❌ ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (tokenMint) {
      navigator.clipboard.writeText(tokenMint);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
    }
  };

  return (
    <div className="card token-creator-card">
      <h2 className="token-title">🛠 Create Your Token</h2>

      <button className="primary-button create-btn" onClick={createToken} disabled={loading}>
        {loading ? '⏳ Creating...' : '🪙 Create New Token'}
      </button>

      {tokenMint && (
        <div className="success-message">
          <p><strong>✅ Token Mint Address:</strong> {tokenMint.slice(0, 8)}...{tokenMint.slice(-8)}</p>
          <button className="copy-button" onClick={copyToClipboard}>
            📋 {copySuccess ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {transactionSig && (
        <p className="tx-link">
          🔗 <a href={`https://explorer.solana.com/tx/${transactionSig}?cluster=devnet`} target="_blank" rel="noopener noreferrer">
            View Transaction
          </a>
        </p>
      )}

      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default TokenCreator;
