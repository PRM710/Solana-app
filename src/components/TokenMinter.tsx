import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import * as web3 from '@solana/web3.js';
import * as splToken from '@solana/spl-token';

const TokenMinter: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [mintAddress, setMintAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionSig, setTransactionSig] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const mintTokens = async () => {
    if (!publicKey || !mintAddress || !amount) {
      setError('❌ Please provide all fields.');
      return;
    }

    setLoading(true);
    setError(null);
    setTransactionSig(null);

    try {
      const mint = new web3.PublicKey(mintAddress);
      const tokenAccount = await splToken.getAssociatedTokenAddress(mint, publicKey);

      // Check if the token account exists, create it if not
      const accountInfo = await connection.getAccountInfo(tokenAccount);
      let transaction = new web3.Transaction();

      if (!accountInfo) {
        transaction.add(
          splToken.createAssociatedTokenAccountInstruction(
            publicKey,
            tokenAccount,
            publicKey,
            mint
          )
        );
      }

      transaction.add(
        splToken.createMintToInstruction(
          mint,
          tokenAccount,
          publicKey,
          Number(amount) * 10 ** 6, // Adjust for decimals
          []
        )
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      setTransactionSig(signature);
      setMintAddress('');
      setAmount('');
    } catch (err) {
      setError(`❌ ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (transactionSig) {
      navigator.clipboard.writeText(transactionSig);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
    }
  };

  return (
    <div className="card token-minter-card">
      <h2 className="token-title">🪙 Mint Tokens</h2>

      <input
        type="text"
        className="input-field"
        placeholder="Token Mint Address"
        value={mintAddress}
        onChange={(e) => setMintAddress(e.target.value)}
      />

      <input
        type="number"
        className="input-field"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <button className="primary-button mint-btn" onClick={mintTokens} disabled={loading}>
        {loading ? '⏳ Minting...' : '💰 Mint Tokens'}
      </button>

      {error && <p className="error-message">{error}</p>}

      {transactionSig && (
        <div className="success-message">
          <p>✅ Tokens minted successfully!</p>
          <p>
            🔗 <a href={`https://explorer.solana.com/tx/${transactionSig}?cluster=devnet`} target="_blank" rel="noopener noreferrer">
              View Transaction
            </a>
          </p>
          <button className="copy-button" onClick={copyToClipboard}>
            📋 {copySuccess ? 'Copied!' : 'Copy Tx Hash'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TokenMinter;
