import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Heartbeat } from '@/components/Heartbeat';
import { MobileToolDropdown } from '@/components/MobileToolDropdown';

export const metadata: Metadata = {
  title: 'Token Scanner - SolTools',
  description: 'Instant safety reports for any Solana token. Check risk scores, holder concentration, LP status, and market data.',
};

const WalletStatsHub = dynamic(() => import('@/components/WalletStatsHub'), { ssr: false });

const TokenScannerClient = dynamic(
  () => import('@/components/TokenScannerClient'),
  { ssr: false }
);

export default function ScanPage() {
  return (
    <main className="flex-1 flex flex-col xl:overflow-hidden relative">
      <div className="hidden sm:block absolute top-4 right-4 z-10">
        <WalletStatsHub />
      </div>

      <Heartbeat />

      <header className="pt-4 px-4 mb-2 mx-auto w-full max-w-3xl">
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <MobileToolDropdown />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">Token Scanner</h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
                FREE
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-gray-500">Instant safety reports for any token</p>
              <span className="sm:hidden px-1.5 py-0.5 text-[9px] font-semibold bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
                FREE
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scroll-fade px-4 pb-4">
        <div className="max-w-3xl mx-auto">
          <TokenScannerClient />
        </div>
      </div>
    </main>
  );
}
