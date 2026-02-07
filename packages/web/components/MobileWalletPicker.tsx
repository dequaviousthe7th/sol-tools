'use client';

import { FC, useEffect, useState } from 'react';

interface WalletOption {
  name: string;
  icon: React.ReactNode;
  getLink: (url: string) => string;
}

const WALLETS: WalletOption[] = [
  {
    name: 'Phantom',
    icon: (
      <svg viewBox="0 0 128 128" className="w-8 h-8" fill="none">
        <rect width="128" height="128" rx="26" fill="#AB9FF2" />
        <path d="M110.584 64.9142H99.142C99.142 41.7651 80.173 23 56.7724 23C33.6612 23 14.8716 41.3057 14.4118 64.0583C13.936 87.5709 36.168 108 59.8402 108H63.6285C84.4817 108 110.584 90.4505 110.584 64.9142Z" fill="url(#phantom_grad)" />
        <path d="M86.5303 64.1428C86.5303 68.0539 83.4045 71.2142 79.5303 71.2142C75.6562 71.2142 72.5303 68.0539 72.5303 64.1428C72.5303 60.2317 75.6562 57.0714 79.5303 57.0714C83.4045 57.0714 86.5303 60.2317 86.5303 64.1428Z" fill="white" />
        <path d="M65.5303 64.1428C65.5303 68.0539 62.4045 71.2142 58.5303 71.2142C54.6562 71.2142 51.5303 68.0539 51.5303 64.1428C51.5303 60.2317 54.6562 57.0714 58.5303 57.0714C62.4045 57.0714 65.5303 60.2317 65.5303 64.1428Z" fill="white" />
        <defs>
          <linearGradient id="phantom_grad" x1="64" y1="23" x2="64" y2="108" gradientUnits="userSpaceOnUse">
            <stop stopColor="#534BB1" />
            <stop offset="1" stopColor="#551BF9" />
          </linearGradient>
        </defs>
      </svg>
    ),
    getLink: (url) => `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(url)}`,
  },
  {
    name: 'Solflare',
    icon: (
      <svg viewBox="0 0 128 128" className="w-8 h-8" fill="none">
        <rect width="128" height="128" rx="26" fill="#FC822B" />
        <path d="M64 28L38 64L64 100L90 64L64 28Z" fill="white" />
        <path d="M64 28L38 64L64 78L90 64L64 28Z" fill="white" fillOpacity="0.8" />
      </svg>
    ),
    getLink: (url) => `https://solflare.com/ul/v1/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(url)}`,
  },
  {
    name: 'Backpack',
    icon: (
      <svg viewBox="0 0 128 128" className="w-8 h-8" fill="none">
        <rect width="128" height="128" rx="26" fill="#1A1A2E" />
        <rect x="36" y="32" width="56" height="64" rx="12" stroke="white" strokeWidth="6" fill="none" />
        <path d="M48 32V26C48 17.1634 55.1634 10 64 10C72.8366 10 80 17.1634 80 26V32" stroke="white" strokeWidth="6" strokeLinecap="round" />
        <rect x="48" y="56" width="32" height="16" rx="4" fill="white" />
      </svg>
    ),
    getLink: (url) => `https://backpack.app/ul/v1/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(url)}`,
  },
  {
    name: 'Coinbase Wallet',
    icon: (
      <svg viewBox="0 0 128 128" className="w-8 h-8" fill="none">
        <rect width="128" height="128" rx="26" fill="#0052FF" />
        <circle cx="64" cy="64" r="36" fill="white" />
        <rect x="50" y="50" width="28" height="28" rx="4" fill="#0052FF" />
      </svg>
    ),
    getLink: (url) => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`,
  },
  {
    name: 'Trust Wallet',
    icon: (
      <svg viewBox="0 0 128 128" className="w-8 h-8" fill="none">
        <rect width="128" height="128" rx="26" fill="#0500FF" />
        <path d="M64 28C64 28 36 44 36 68C36 92 64 100 64 100C64 100 92 92 92 68C92 44 64 28 64 28Z" fill="white" />
        <path d="M64 38C64 38 44 50 44 68C44 86 64 92 64 92" fill="#0500FF" fillOpacity="0.15" />
      </svg>
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
