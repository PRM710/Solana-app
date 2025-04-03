import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton, WalletModal } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl, Connection } from '@solana/web3.js';
import WalletInfo from './components/WalletInfo';
import TokenCreator from './components/TokenCreator';
import TokenMinter from './components/TokenMinter';
import TokenSender from './components/TokenSender';
import TransactionHistory from './components/TransactionHistory';
import { listenForTokenTransfers } from './utils/solanaEvents';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import { useWallet } from '@solana/wallet-adapter-react';

const App: React.FC = () => {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  const connection = useMemo(() => new Connection(endpoint, 'confirmed'), [endpoint]);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const { publicKey } = useWallet();

  const buttonRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalPosition, setModalPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (publicKey) {
      listenForTokenTransfers(connection, publicKey, () => {
        console.log('🔄 Token balance updated');
      });
    }
  }, [publicKey, connection]);

  // Function to position modal beside the button
  const handleWalletButtonClick = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setModalPosition({
        top: rect.top + window.scrollY,
        left: rect.left + rect.width + 10, // Ensure it's to the right
      });
    }
    setShowModal(!showModal);
  };
  

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="App">
            <h1>Solana App</h1>

            {/* Custom Wallet Button */}
            <div ref={buttonRef} className="wallet-button-container">
              <WalletMultiButton className="wallet-button" onClick={handleWalletButtonClick} />
            </div>

            {/* Wallet Modal positioned beside the button */}
            {showModal && (
              <div
                className="custom-wallet-modal"
                style={{ top: modalPosition.top, left: modalPosition.left }}
              >
                <WalletModal />
              </div>
            )}

            {/* New container for the four boxes */}
            <div className="card-container">
              <WalletInfo />
              <TokenCreator />
              <TokenMinter />
              <TokenSender />
            </div>

            <TransactionHistory />
            <ToastContainer position="top-right" autoClose={3000} />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App;
