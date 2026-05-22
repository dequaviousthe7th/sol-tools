import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Heartbeat } from '@/components/Heartbeat';
import { MobileToolDropdown } from '@/components/MobileToolDropdown';

export const metadata: Metadata = {
  title: 'Wallet X-Ray',
  description: "Deep-dive any Solana wallet's real trading performance. PnL breakdown, win rate, trader grade, and per-token analysis. Free, no login.",
  alternates: { canonical: 'https://soltools.net/xray' },
  openGraph: {
    title: 'Wallet X-Ray — SolTools',
    description: "See any wallet's true Solana trading performance. PnL, win rate, trader grade.",
    url: 'https://soltools.net/xray',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};

const WalletStatsHub = dynamic(() => import('@/components/WalletStatsHub'), { ssr: false });

const WalletXRayClient = dynamic(
  () => import('@/components/WalletXRayClient'),
  { ssr: false }
);

export default function XRayPage() {
  return (
    <main className="flex-1 flex flex-col xl:overflow-hidden relative">
      <div className="hidden sm:block absolute top-4 right-4 z-10">
        <WalletStatsHub />
      </div>

      <Heartbeat />

      <header className="pt-4 px-4 sm:px-6 lg:px-8 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <MobileToolDropdown />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">Wallet X-Ray</h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-semibold bg-solana-green/20 text-solana-green rounded-full border border-solana-green/30">
                LIVE
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-gray-500">See any wallet&apos;s true trading performance</p>
              <span className="sm:hidden px-1.5 py-0.5 text-[9px] font-semibold bg-solana-green/20 text-solana-green rounded-full border border-solana-green/30">
                LIVE
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scroll-fade px-4 sm:px-6 lg:px-8 pb-4">
        <WalletXRayClient />
      </div>
    </main>
  );
}
