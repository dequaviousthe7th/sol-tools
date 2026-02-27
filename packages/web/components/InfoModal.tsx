'use client';

import { FC, useEffect, useCallback } from 'react';

interface InfoModalProps {
  open: boolean;
  onClose: () => void;
}

export const InfoModal: FC<InfoModalProps> = ({ open, onClose }) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60 backdrop-blur-sm modal-enter"
      onClick={onClose}
    >
      <div
        className="card p-6 sm:p-8 max-w-lg w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto scroll-fade modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">How It Works</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {/* What is Solana Rent? */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-solana-purple/15 flex items-center justify-center text-solana-purple flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white">What is Solana Rent?</h3>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Every account on Solana requires a small SOL deposit (roughly 0.002 SOL) called "rent" to stay alive on-chain. When you swap or receive tokens, a token account is created and rent is deducted from your wallet automatically.
            </p>
          </section>

          {/* How SolReclaimer Works */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-solana-green/15 flex items-center justify-center text-solana-green flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white">How SolReclaimer Works</h3>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              SolReclaimer scans your wallet for token accounts with a zero balance — these are leftover from tokens you've sold or transferred. It then creates transactions to close them, returning the rent deposit directly to your wallet. You review and approve every transaction.
            </p>
          </section>

          {/* Is it Safe? */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-solana-purple/15 flex items-center justify-center text-solana-purple flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white">Is it Safe?</h3>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Yes. SolReclaimer is fully verifiable, non-custodial, and never requests your private keys. It only closes accounts with a zero token balance — your funds are never at risk. All transactions are signed locally in your wallet and verified on-chain.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
