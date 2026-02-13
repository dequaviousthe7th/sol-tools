import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { WalletButton } from '@/components/WalletButton';
import { MobileToolDropdown } from '@/components/MobileToolDropdown';

export const metadata: Metadata = {
  title: 'Vanity Wallet Generator - SolTools',
  description: 'Generate custom Solana wallet addresses with your chosen prefix or suffix. Free, client-side, secure.',
};

const WalletStatsHub = dynamic(() => import('@/components/WalletStatsHub'), { ssr: false });

const VanityPageClient = dynamic(
  () => import('@/components/VanityPageClient').then(m => m.VanityPageClient),
  { ssr: false }
);

export default function VanityPage() {
  return (
    <main className="flex-1 flex flex-col xl:overflow-hidden relative">
      {/* My Stats pill — top right */}
      <div className="absolute top-4 right-4 z-10">
        <WalletStatsHub />
      </div>

      {/* Page header */}
      <header className="pt-4 px-4 mb-2 mx-auto w-full max-w-3xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <MobileToolDropdown />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">Vanity Generator</h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-semibold bg-solana-green/20 text-solana-green rounded-full border border-solana-green/30">
                  CLIENT-SIDE
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-gray-500">Generate custom Solana addresses</p>
                <span className="sm:hidden px-1.5 py-0.5 text-[9px] font-semibold bg-solana-green/20 text-solana-green rounded-full border border-solana-green/30">
                  CLIENT-SIDE
                </span>
              </div>
            </div>
          </div>
          <div className="hidden sm:block">
            <WalletButton />
          </div>
        </div>
      </header>

      <VanityPageClient />
    </main>
  );
}
