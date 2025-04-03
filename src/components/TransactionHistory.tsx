import React, { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { showError } from '../utils/notifications';

const TransactionHistory: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [transactions, setTransactions] = useState<{ sig: string; time: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    if (!publicKey) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching transactions for:', publicKey.toBase58());

      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 5 });

      if (!signatures.length) {
        setTransactions([]);
        setError('No recent transactions.');
        return;
      }

      setTransactions(
        signatures.map((tx) => ({
          sig: tx.signature,
          time: tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : 'Unknown',
        }))
      );

      console.log('Fetched transactions:', signatures);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      showError('Failed to fetch transactions.');
      setError('Failed to fetch transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [publicKey, connection]);

  if (!publicKey) return <p className="info-text">🔌 Please connect your wallet.</p>;

  return (
    <div className="card">
      <h2>📜 Transaction History</h2>

      {loading && <p>⏳ Loading transactions...</p>}
      {error && <p className="error-message">⚠️ {error}</p>}

      {transactions.length > 0 ? (
        <ul className="tx-list">
          {transactions.map((tx, index) => (
            <li key={index}>
              <a
                href={`https://explorer.solana.com/tx/${tx.sig}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Tx {index + 1}: {tx.sig.slice(0, 10)}... ({tx.time})
              </a>
            </li>
          ))}
        </ul>
      ) : (
        !loading && <p className="info-text">🚫 No recent transactions.</p>
      )}
    </div>
  );
};

export default TransactionHistory;
