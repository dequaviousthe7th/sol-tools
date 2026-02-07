'use client';

import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { MobileWalletPicker } from './MobileWalletPicker';

function isMobileBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

interface WalletButtonInnerProps {
  autoOpen?: boolean;
}

export const WalletButtonInner = ({ autoOpen }: WalletButtonInnerProps) => {
  const { setVisible } = useWalletModal();
  const { wallets, connected } = useWallet();
  const hasAutoOpened = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(isMobileBrowser());
  }, []);

  // Auto-open modal if user clicked before providers loaded
  useEffect(() => {
    if (autoOpen && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      const timer = setTimeout(() => {
        if (mobile && wallets.length === 0) {
          setPickerOpen(true);
        } else {
          setVisible(true);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [autoOpen, setVisible, mobile, wallets.length]);

  // On mobile with no wallets detected and not connected: show custom button + picker
  if (mobile && wallets.length === 0 && !connected) {
    return (
      <>
        <button
          onClick={() => setPickerOpen(true)}
          className="wallet-adapter-button wallet-adapter-button-trigger"
        >
          Select Wallet
        </button>
        <MobileWalletPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      </>
    );
  }

  return <WalletMultiButton />;
};
