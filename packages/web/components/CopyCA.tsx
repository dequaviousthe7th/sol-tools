'use client';

import { useState } from 'react';

export const SOLT_CA = '5hfhGS4qSLuTVDuVDksndxBb3PaTwFxC6wPEXZcdpump';

export default function CopyCA() {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(SOLT_CA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0d0d0f] border border-[#1a1a1f]">
      <span className="text-gray-500 text-[10px] uppercase tracking-wider">CA</span>
      <code className="text-solana-purple text-[11px] font-mono">{SOLT_CA}</code>
      <button
        onClick={copy}
        className="ml-1 text-gray-500 hover:text-white transition-colors"
        title="Copy contract address"
      >
        {copied ? (
          <svg className="w-3.5 h-3.5 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
