'use client';

import Link from 'next/link';

export default function WalletStatsHub() {
  return (
    <Link
      href="/stats"
      className="stats-enter inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#111113]/80 border border-[#222228] hover:border-solana-purple/30 hover:shadow-[0_0_12px_rgba(153,69,255,0.1)] transition-all group"
    >
      <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-solana-purple transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <span className="text-[11px] text-gray-400 group-hover:text-gray-300 font-medium transition-colors">My Stats</span>
      <svg className="w-3 h-3 text-gray-600 group-hover:text-solana-purple transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
