'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';

const VanityGenerator = dynamic(
  () => import('@/components/VanityGenerator').then(m => m.VanityGenerator),
  { ssr: false }
);

const VanityFAQ = dynamic(
  () => import('@/components/VanityFAQ').then(m => m.VanityFAQ),
  { ssr: false }
);

const BuyTokensModal = dynamic(
  () => import('@/components/BuyTokensModal').then(m => m.BuyTokensModal),
  { ssr: false }
);

const VanityTokenCard = dynamic(
  () => import('@/components/VanityTokenCard').then(m => m.VanityTokenCard),
  { ssr: false }
);

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || '';

export const VanityPageClient = () => {
  const { publicKey } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  // Fetch balance for passing to VanityGenerator (mobile inline display)
  useEffect(() => {
    if (!publicKey || !WORKER_URL) {
      setTokenBalance(null);
      return;
    }

    let cancelled = false;

    fetch(`${WORKER_URL}/api/vanity/balance?wallet=${publicKey.toBase58()}`)
      .then(res => res.json())
      .then((data: { balance: number }) => {
        if (!cancelled) setTokenBalance(data.balance);
      })
      .catch(() => {
        if (!cancelled) setTokenBalance(0);
      });

    return () => { cancelled = true; };
  }, [publicKey, refreshKey]);

  const handleNeedTokens = useCallback(() => {
    setModalOpen(true);
  }, []);

  const handlePurchaseComplete = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return (
    <>
      {/* Desktop FAQ side panel */}
      <div className="hidden xl:block">
        <VanityFAQ />
      </div>

      {/* Desktop Token Card side panel */}
      <VanityTokenCard
        refreshKey={refreshKey}
        onBuyTokens={handleNeedTokens}
      />

      {/* Content */}
      <div className="container mx-auto px-4 pb-4 xl:pb-2 max-w-3xl flex flex-col flex-1">
        <VanityGenerator
          onNeedTokens={handleNeedTokens}
          onTokenUsed={handlePurchaseComplete}
          tokenBalance={tokenBalance}
        />
      </div>

      {/* Buy Tokens Modal */}
      <BuyTokensModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </>
  );
};
