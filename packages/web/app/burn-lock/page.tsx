import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { WalletButton } from '@/components/WalletButton';
import { MobileToolDropdown } from '@/components/MobileToolDropdown';

const WalletStatsHub = dynamic(() => import('@/components/WalletStatsHub'), { ssr: false });
const TokenBurnLock = dynamic(() => import('@/components/TokenBurnLock').then(m => ({ default: m.TokenBurnLock })), { ssr: false });

export const metadata: Metadata = {
  title: 'Burn or Lock - SolTools',
  description: 'Burn or permanently lock tokens on Solana. Build trust with your community. Zero fees, open source.',
};

export default function BurnPage() {
  return (
    <main className="flex-1 flex flex-col xl:overflow-hidden xl:min-h-0 relative">
      {/* My Stats — absolutely positioned under wallet button */}
      <div className="hidden sm:block absolute top-[76px] right-8 z-10 mr-5">
        <WalletStatsHub />
      </div>

      {/* Header */}
      <header className="flex justify-between items-center pt-4 px-4 mb-2 mx-auto w-full max-w-none xl:px-8">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
              </svg>
            </div>
            <MobileToolDropdown />
          </div>
          <a href="/" className="cursor-pointer hover:opacity-90 transition-opacity">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Burn or Lock</h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-semibold bg-solana-green/20 text-solana-green rounded-full border border-solana-green/30">
                MAINNET
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-gray-500">Zero fees</p>
              <span className="sm:hidden px-1.5 py-0.5 text-[9px] font-semibold bg-solana-green/20 text-solana-green rounded-full border border-solana-green/30">
                MAINNET
              </span>
            </div>
          </a>
        </div>
        <WalletButton />
      </header>

      <div className="flex-1 flex flex-col min-h-0">
        <TokenBurnLock />
      </div>
    </main>
  );
}
