'use client';

import { FC, useEffect, useCallback, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface BuyTokensModalProps {
  open: boolean;
  onClose: () => void;
  onPurchaseComplete: () => void;
}

const TIERS = [
  { id: '1',  tokens: 1,  sol: 0.065, lamports: 65_000_000,    savings: null },
  { id: '3',  tokens: 3,  sol: 0.18,  lamports: 180_000_000,   savings: '7%' },
  { id: '5',  tokens: 5,  sol: 0.28,  lamports: 280_000_000,   savings: '14%' },
  { id: '10', tokens: 10, sol: 0.50,  lamports: 500_000_000,   savings: '23%' },
  { id: '25', tokens: 25, sol: 1.10,  lamports: 1_100_000_000, savings: '32%' },
  { id: '50', tokens: 50, sol: 1.95,  lamports: 1_950_000_000, savings: '40%' },
];

type ModalState = 'idle' | 'building' | 'signing' | 'confirming' | 'verifying' | 'success' | 'error';

const TREASURY = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || 'soL8nZop9Gbncv1ccYPaUEszppt16t4yLTpXYeB7jUs';
const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || '';

// Map common Solana errors to user-friendly messages
function friendlyError(msg: string): string {
  if (msg.includes('no record of a prior credit') || msg.includes('insufficient funds') || msg.includes('Insufficient')) {
    return 'Insufficient SOL balance. Please fund your wallet and try again.';
  }
  if (msg.includes('User rejected') || msg.includes('user rejected')) {
    return '';
  }
  if (msg.includes('blockhash') || msg.includes('expired')) {
    return 'Transaction expired. Please try again.';
  }
  if (msg.includes('Simulation failed')) {
    // Extract the inner message if possible
    const inner = msg.match(/Message: (.+?)\./)?.[1];
    if (inner?.includes('no record of a prior credit') || inner?.includes('insufficient')) {
      return 'Insufficient SOL balance. Please fund your wallet and try again.';
    }
    return 'Transaction simulation failed. Make sure you have enough SOL.';
  }
  return msg;
}

export const BuyTokensModal: FC<BuyTokensModalProps> = ({ open, onClose, onPurchaseComplete }) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const [state, setState] = useState<ModalState>('idle');
  const [error, setError] = useState('');
  const [selectedTier, setSelectedTier] = useState<typeof TIERS[0] | null>(null);
  const [credited, setCredited] = useState(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state !== 'building' && state !== 'signing' && state !== 'confirming' && state !== 'verifying') {
        onClose();
      }
    },
    [onClose, state]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setState('idle');
      setError('');
      setSelectedTier(null);
      setCredited(0);
    }
  }, [open]);

  const verifyWithWorker = async (wallet: string, signature: string, tierId: string): Promise<{ credited: number }> => {
    const res = await fetch(`${WORKER_URL}/api/vanity/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, signature, tier: tierId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Verification failed' }));
      throw new Error((data as { error?: string }).error || 'Verification failed');
    }

    return await res.json() as { credited: number };
  };

  const handlePurchase = async (tier: typeof TIERS[0]) => {
    if (!publicKey || !sendTransaction || !TREASURY || !WORKER_URL) {
      const missing = [
        !publicKey && 'wallet',
        !sendTransaction && 'adapter',
        !TREASURY && 'treasury',
        !WORKER_URL && 'api',
      ].filter(Boolean);
      setError(`Service unavailable (${missing.join(', ')}). Please reconnect wallet or try again.`);
      setState('error');
      return;
    }

    setSelectedTier(tier);
    setError('');

    let signature: string | null = null;

    try {
      // Build transaction
      setState('building');

      // Check balance first
      const balance = await connection.getBalance(publicKey);
      // Need tier lamports + ~10000 lamports for tx fee
      if (balance < tier.lamports + 10_000) {
        const needed = tier.sol;
        const have = (balance / LAMPORTS_PER_SOL).toFixed(4);
        throw new Error(`Insufficient balance. You need ${needed} SOL but only have ${have} SOL.`);
      }

      const treasuryPubkey = new PublicKey(TREASURY);
      const { blockhash } = await connection.getLatestBlockhash('confirmed');

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasuryPubkey,
          lamports: tier.lamports,
        })
      );
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      // Sign + send via wallet adapter (Phantom dApp-friendly: single signAndSend call)
      setState('signing');
      signature = await sendTransaction(tx, connection);

      // Poll for confirmation (2s intervals, 90s timeout)
      // More resilient than confirmTransaction which can throw on blockhash expiry
      setState('confirming');
      const startTime = Date.now();
      let confirmed = false;

      while (Date.now() - startTime < 90_000) {
        try {
          const statuses = await connection.getSignatureStatuses([signature]);
          const value = statuses?.value?.[0];
          if (value?.confirmationStatus === 'confirmed' || value?.confirmationStatus === 'finalized') {
            if (value.err) {
              throw new Error('Transaction failed on-chain');
            }
            confirmed = true;
            break;
          }
        } catch {
          // RPC hiccup — keep polling
        }
        await new Promise(r => setTimeout(r, 2000));
      }

      if (!confirmed) {
        // Tx may still be confirming — try the worker anyway, it checks on-chain independently
      }

      // Verify with worker and credit tokens
      setState('verifying');
      const result = await verifyWithWorker(publicKey.toBase58(), signature, tier.id);
      setCredited(result.credited);
      setState('success');
      onPurchaseComplete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Purchase failed';
      // User rejected — just go back to idle silently
      if (msg.includes('User rejected') || msg.includes('user rejected')) {
        setState('idle');
        return;
      }

      // If we have a signature, the SOL may have been sent — try worker verification
      // The worker checks the tx on-chain so it will work even if our confirmation timed out
      if (signature) {
        try {
          setState('verifying');
          // Wait a few seconds for the tx to land if confirmation timed out
          await new Promise(r => setTimeout(r, 3000));
          const result = await verifyWithWorker(publicKey!.toBase58(), signature, tier.id);
          setCredited(result.credited);
          setState('success');
          onPurchaseComplete();
          return;
        } catch (verifyErr) {
          // Worker also couldn't verify — show error with the signature so user can recover
          const verifyMsg = verifyErr instanceof Error ? verifyErr.message : 'Unknown error';
          setError(`Payment sent but verification failed (${verifyMsg}). Signature: ${signature.slice(0, 20)}...`);
          setState('error');
          return;
        }
      }

      setError(friendlyError(msg));
      setState('error');
    }
  };

  const handleSuccessClose = () => {
    onPurchaseComplete();
    onClose();
  };

  if (!open) return null;

  const isProcessing = state === 'building' || state === 'signing' || state === 'confirming' || state === 'verifying';

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60 backdrop-blur-sm modal-enter"
      onClick={isProcessing ? undefined : onClose}
    >
      <div
        className="card p-6 sm:p-8 max-w-lg w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto scroll-fade modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Buy Tokens</h2>
              <p className="text-xs text-gray-500">1 token = 1 vanity search</p>
            </div>
          </div>
          {!isProcessing && (
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Idle — Tier Grid + Payment Info */}
        {state === 'idle' && (
          <>
            {/* Wallet connector if not connected */}
            {!connected && (
              <button
                onClick={() => setWalletModalVisible(true)}
                className="w-full flex items-center justify-center gap-2 mb-4 py-2.5 rounded-xl bg-solana-purple/10 border border-solana-purple/20 text-solana-purple hover:bg-solana-purple/15 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Connect Wallet to Purchase
              </button>
            )}

            <p className="text-sm text-gray-400 mb-4">
              Select a token bundle. Larger bundles save more.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TIERS.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => connected ? handlePurchase(tier) : setWalletModalVisible(true)}
                  className="group relative card card-hover p-4 text-center transition-all duration-200 hover:border-solana-purple/40 hover:shadow-[0_0_20px_rgba(153,69,255,0.1)] active:scale-[0.97]"
                >
                  {tier.savings && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-bold bg-solana-green/20 text-solana-green rounded-full border border-solana-green/30">
                      {tier.savings} OFF
                    </span>
                  )}
                  <p className="text-2xl font-bold text-white mb-1">{tier.tokens}</p>
                  <p className="text-xs text-gray-500 mb-2">{tier.tokens === 1 ? 'token' : 'tokens'}</p>
                  <p className="text-sm font-semibold text-solana-green">{tier.sol} SOL</p>
                </button>
              ))}
            </div>

            {/* Payment method info — below tiers */}
            <div className="flex items-center gap-3 mt-4 px-3 py-2.5 rounded-xl bg-[#111113] border border-[#222228]">
              <svg className="w-5 h-5 text-solana-green flex-shrink-0" viewBox="0 0 397.7 311.7" fill="currentColor">
                <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"/>
                <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"/>
                <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"/>
              </svg>
              <div>
                <p className="text-xs font-medium text-white">Pay with SOL</p>
                <p className="text-[11px] text-gray-500">Direct on-chain transfer, verified instantly</p>
              </div>
            </div>
          </>
        )}

        {/* Processing States */}
        {isProcessing && selectedTier && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-6 relative">
              <div className="absolute inset-0 rounded-full border-4 border-solana-purple/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-solana-purple animate-spin"></div>
            </div>

            <p className="text-white font-medium mb-1">
              {state === 'building' && 'Building transaction...'}
              {state === 'signing' && 'Waiting for wallet approval...'}
              {state === 'confirming' && 'Confirming on Solana...'}
              {state === 'verifying' && 'Verifying payment...'}
            </p>
            <p className="text-sm text-gray-500">
              {selectedTier.tokens} {selectedTier.tokens === 1 ? 'token' : 'tokens'} for {selectedTier.sol} SOL
            </p>
          </div>
        )}

        {/* Success */}
        {state === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-solana-green/20 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(20,241,149,0.2)]">
              <svg className="w-8 h-8 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xl font-bold text-white mb-1">+{credited} {credited === 1 ? 'token' : 'tokens'} credited!</p>
            <p className="text-sm text-gray-400 mb-6">Your tokens are ready to use.</p>
            <button
              onClick={handleSuccessClose}
              className="w-full btn-primary py-3 text-base font-semibold"
            >
              Start Generating
            </button>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-white font-semibold mb-1">Purchase Failed</p>
            <p className="text-sm text-red-400 mb-6">{error}</p>
            <button
              onClick={() => setState('idle')}
              className="px-8 py-3 rounded-xl border border-[#222228] text-gray-300 hover:text-white hover:border-gray-600 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
