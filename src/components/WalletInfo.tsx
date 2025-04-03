import React, { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import * as web3 from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import { listenForTokenTransfers } from '../utils/solanaEvents';
import { showSuccess, showError } from '../utils/notifications';

const WalletInfo: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, disconnect } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [tokenBalances, setTokenBalances] = useState<{ mint: string; amount: number }[]>([]);
  const [transactions, setTransactions] = useState<{ sig: string; time: string }[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch wallet balances and transactions
  const fetchWalletInfo = async () => {
    if (!publicKey) return;

    try {
      // Fetch SOL balance
      const solBalance = await connection.getBalance(publicKey);
      setBalance(solBalance / web3.LAMPORTS_PER_SOL);
      showSuccess(`SOL balance updated: ${solBalance / web3.LAMPORTS_PER_SOL} SOL`);

      // Fetch token balances
      const accounts = await connection.getTokenAccountsByOwner(publicKey, {
        programId: splToken.TOKEN_PROGRAM_ID,
      });
      const balances = await Promise.all(
        accounts.value.map(async (account) => {
          const info = await connection.getTokenAccountBalance(account.pubkey);
          return { mint: account.pubkey.toBase58(), amount: info.value.uiAmount || 0 };
        })
      );
      setTokenBalances(balances);

      // Fetch transaction history
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 5 });
      setTransactions(
        signatures.map((tx) => ({
          sig: tx.signature,
          time: tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : 'Unknown',
        }))
      );
    } catch (err) {
      showError('Failed to fetch wallet details');
    }
  };

  useEffect(() => {
    if (publicKey) {
      fetchWalletInfo();
      const interval = setInterval(fetchWalletInfo, 10000); // Refresh every 10 sec
      return () => clearInterval(interval);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (publicKey) {
      listenForTokenTransfers(connection, publicKey, fetchWalletInfo);
    }
  }, [publicKey, connection]);

  const copyToClipboard = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      setCopySuccess(true);
      showSuccess('Wallet address copied!');
      setTimeout(() => setCopySuccess(false), 1500);
    }
  };

  if (!publicKey) return <p className="info-text">🔌 Please connect your wallet.</p>;

  return (
    <div className="card wallet-card">
      <h2 className="wallet-title">🔗 Wallet Information</h2>
      <div className="wallet-details">
        <p>
          <strong>Address:</strong> {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-6)}
          <button className="copy-button" onClick={copyToClipboard}>
            📋 {copySuccess ? 'Copied!' : 'Copy'}
          </button>
        </p>
        <p className="wallet-balance">
          <strong>💰 Balance:</strong> {balance !== null ? `${balance.toFixed(4)} SOL` : 'Loading...'}
        </p>
      </div>

      {tokenBalances.length > 0 && (
        <div className="token-section">
          <h3>🪙 Token Balances</h3>
          <ul className="token-list">
            {tokenBalances.map((tb) => (
              <li key={tb.mint}>
                <strong>{tb.mint.slice(0, 6)}...</strong>: {tb.amount.toFixed(4)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="transactions-section">
          <h3>📜 Recent Transactions</h3>
          <ul className="tx-list">
            {transactions.map((tx, index) => (
              <li key={index}>
                <a href={`https://explorer.solana.com/tx/${tx.sig}?cluster=devnet`} target="_blank" rel="noopener noreferrer">
                  🔗 Tx {index + 1}: {tx.sig.slice(0, 10)}... ({tx.time})
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button className="secondary-button disconnect-btn" onClick={disconnect}>❌ Disconnect</button>
    </div>
  );
};

export default WalletInfo;
