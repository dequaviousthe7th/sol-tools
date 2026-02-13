import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { WalletButton } from '@/components/WalletButton';
import { MobileToolDropdown } from '@/components/MobileToolDropdown';

export const metadata: Metadata = {
  title: 'My Stats - SolTools',
  description: 'View your personal activity stats across SolTools.',
};

const StatsContent = dynamic(() => import('@/components/StatsContent'), { ssr: false });

export default function StatsPage() {
  return (
    <main className="flex-1 flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center pt-4 px-4 mb-2 mx-auto w-full max-w-5xl">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center border border-[#222228]">
              <svg className="w-5 h-5 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <MobileToolDropdown />
          </div>
          <a href="/" className="cursor-pointer hover:opacity-90 transition-opacity">
            <h1 className="text-xl font-bold text-white">My Stats</h1>
            <p className="text-xs text-gray-500">Your activity across SolTools</p>
          </a>
        </div>
        <WalletButton />
      </header>

      <div className="container mx-auto px-4 pb-4 sm:pb-6 max-w-5xl">
        <StatsContent />
      </div>
    </main>
  );
}
