'use client';

import { FC, useEffect, useState } from 'react';

interface WalletOption {
  name: string;
  icon: React.ReactNode;
  getLink: (url: string) => string;
}

function WalletIcon({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
      {children}
    </div>
  );
}

const WALLETS: WalletOption[] = [
  {
    name: 'Phantom',
    icon: (
      <WalletIcon bg="bg-[#AB9FF2]">
        <svg viewBox="0 0 40 40" className="w-5 h-5" fill="none">
          <path d="M33 20.7H29.5C29.5 13.5 23.7 7.5 16.5 7.5C9.4 7.5 3.6 13.2 3.5 20.2C3.3 27.5 10.1 33.8 17.4 33.8H18.6C24.9 33.8 33 28.3 33 20.7Z" fill="url(#pg)" />
          <circle cx="24" cy="20" r="2.5" fill="white" />
          <circle cx="17.5" cy="20" r="2.5" fill="white" />
          <defs><linearGradient id="pg" x1="18" y1="7.5" x2="18" y2="33.8"><stop stopColor="#534BB1" /><stop offset="1" stopColor="#551BF9" /></linearGradient></defs>
        </svg>
      </WalletIcon>
    ),
    getLink: (url) => `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(url)}`,
  },
  {
    name: 'Solflare',
    icon: (
      <WalletIcon bg="bg-[#FC822B]">
        <svg viewBox="0 0 40 40" className="w-5 h-5" fill="white">
          <path d="M20 8L12 20L20 32L28 20L20 8Z" />
        </svg>
      </WalletIcon>
    ),
    getLink: (url) => `https://solflare.com/ul/v1/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(url)}`,
  },
  {
    name: 'Backpack',
    icon: (
      <WalletIcon bg="bg-[#E33E3F]">
        <svg viewBox="0 0 40 40" className="w-5 h-5" fill="none">
          <rect x="12" y="13" width="16" height="18" rx="3" stroke="white" strokeWidth="2" />
          <path d="M15 13V11C15 8.24 17.24 6 20 6C22.76 6 25 8.24 25 11V13" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <rect x="15.5" y="20" width="9" height="4.5" rx="1" fill="white" />
        </svg>
      </WalletIcon>
    ),
    getLink: (url) => `https://backpack.app/ul/v1/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(url)}`,
  },
  {
    name: 'Coinbase Wallet',
    icon: (
      <WalletIcon bg="bg-[#0052FF]">
        <svg viewBox="0 0 40 40" className="w-5 h-5" fill="none">
          <circle cx="20" cy="20" r="11" fill="white" />
          <rect x="15.5" y="15.5" width="9" height="9" rx="1.5" fill="#0052FF" />
        </svg>
      </WalletIcon>
    ),
    getLink: (url) => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`,
  },
  {
    name: 'Trust Wallet',
    icon: (
      <WalletIcon bg="bg-[#0500FF]">
        <svg viewBox="0 0 40 40" className="w-5 h-5" fill="white">
          <path d="M20 8C20 8 10 14 10 22C10 30 20 33 20 33C20 33 30 30 30 22C30 14 20 8 20 8Z" />
        </svg>
      </WalletIcon>
    ),
    getLink: (url) => `https://link.trustwallet.com/open_url?coin_id=501&url=${encodeURIComponent(url)}`,
  },
];

interface MobileWalletPickerProps {
  open: boolean;
  onClose: () => void;
}

export const MobileWalletPicker: FC<MobileWalletPickerProps> = ({ open, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!visible) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://solreclaimer.net';

  return (
    <div
      className={`fixed inset-0 z-[900] transition-opacity duration-200 ${animating ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Bottom sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-[#111113] border-t border-[#222228] rounded-t-2xl transition-transform duration-200 ease-out ${
          animating ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#333]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h3 className="text-lg font-semibold text-white">Connect Wallet</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="px-5 pb-4 text-sm text-gray-500">
          Open SolReclaimer in your wallet app
        </p>

        {/* Wallet list */}
        <div className="px-4 pb-6 space-y-2">
          {WALLETS.map((wallet) => (
            <a
              key={wallet.name}
              href={wallet.getLink(currentUrl)}
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-3.5 rounded-xl bg-[#0d0d0f] border border-[#1a1a1f] active:bg-[#1a1a1f] transition-colors"
            >
              <div className="flex-shrink-0">{wallet.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{wallet.name}</p>
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0">Open</span>
              <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ))}
        </div>

        {/* Safe area padding for phones with home indicator */}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </div>
    </div>
  );
};
