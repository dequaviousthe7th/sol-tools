'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useProvidersLoaded } from './LazyProviders';
import { MobileWalletPicker } from './MobileWalletPicker';

// Inner component that uses wallet hooks (only rendered when providers are loaded)
const WalletButtonInner = dynamic(
  () => import('./WalletButtonInner').then((mod) => mod.WalletButtonInner),
  {
    ssr: false,
    loading: () => (
      <button className="wallet-adapter-button wallet-adapter-button-trigger">
        Loading...
      </button>
    ),
  }
);

function isMobileBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

interface WalletButtonProps {
  autoOpen?: boolean;
}

const WalletButtonWithAutoOpen = ({ autoOpen }: WalletButtonProps) => {
  return <WalletButtonInner autoOpen={autoOpen} />;
};

export const WalletButton = () => {
  const providersLoaded = useProvidersLoaded();
  const [pendingClick, setPendingClick] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(isMobileBrowser());
  }, []);

  // Handle placeholder click - store intent to open modal
  const handlePlaceholderClick = useCallback(() => {
    if (mobile) {
      setPickerOpen(true);
    } else {
      setPendingClick(true);
    }
  }, [mobile]);

  // Reset pending click after providers load and we've passed it to the inner component
  useEffect(() => {
    if (providersLoaded && pendingClick) {
      // Clear pending click after a short delay (after inner component receives it)
      const timer = setTimeout(() => setPendingClick(false), 100);
      return () => clearTimeout(timer);
    }
  }, [providersLoaded, pendingClick]);

  // Show placeholder before providers load
  if (!providersLoaded) {
    return (
      <>
        <button
          onClick={handlePlaceholderClick}
          className="wallet-adapter-button wallet-adapter-button-trigger"
        >
          {pendingClick ? 'Loading...' : 'Select Wallet'}
        </button>
        <MobileWalletPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      </>
    );
  }

  // Render actual wallet button, passing autoOpen if user clicked placeholder
  return <WalletButtonWithAutoOpen autoOpen={pendingClick} />;
};
