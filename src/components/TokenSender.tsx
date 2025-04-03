import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import * as web3 from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import Card from '../components/UI/Card';

const TokenSender: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [mintAddress, setMintAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionSig, setTransactionSig] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const sendTokens = async () => {
    if (!publicKey || !mintAddress || !recipient || !amount) {
      setError('❌ Please provide all fields.');
      return;
    }

    setLoading(true);
    setError(null);
    setTransactionSig(null);

    try {
      const mint = new web3.PublicKey(mintAddress);
      const recipientPubkey = new web3.PublicKey(recipient);

      const senderTokenAccount = await splToken.getAssociatedTokenAddress(mint, publicKey);
      const recipientTokenAccount = await splToken.getAssociatedTokenAddress(mint, recipientPubkey);

      const transaction = new web3.Transaction();

      // Create recipient token account if it doesn’t exist
      const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount);
      if (!recipientAccountInfo) {
        transaction.add(
          splToken.createAssociatedTokenAccountInstruction(
            publicKey,
            recipientTokenAccount,
            recipientPubkey,
            mint
          )
        );
      }

      transaction.add(
        splToken.createTransferInstruction(
          senderTokenAccount,
          recipientTokenAccount,
          publicKey,
          Number(amount) * 10 ** 6, // Adjust for decimals
          []
        )
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      setTransactionSig(signature);
      setMintAddress('');
      setRecipient('');
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
    <Card title="💸 Send Tokens">
      <input
        type="text"
        className="input-field"
        placeholder="Token Mint Address"
        value={mintAddress}
        onChange={(e) => setMintAddress(e.target.value)}
      />

      <input
        type="text"
        className="input-field"
        placeholder="Recipient Address"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      />

      <input
        type="number"
        className="input-field"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <button className="primary-button" onClick={sendTokens} disabled={loading}>
        {loading ? '⏳ Sending...' : '🚀 Send Tokens'}
      </button>

      {error && <p className="error-message">{error}</p>}

      {transactionSig && (
        <div className="success-message">
          <p>✅ Tokens sent successfully!</p>
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
    </Card>
  );
};

export default TokenSender;
