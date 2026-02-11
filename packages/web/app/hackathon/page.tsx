import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Heartbeat } from '@/components/Heartbeat';

export const metadata: Metadata = {
  title: 'Hackathon Screener - SolTools',
  description: 'Track PumpFun Build in Public hackathon tokens with live market data.',
};

const HackathonScreener = dynamic(
  () => import('@/components/HackathonScreener').then(m => m.HackathonScreener),
  { ssr: false }
);

const HackathonInfo = dynamic(
  () => import('@/components/HackathonInfo').then(m => m.HackathonInfo),
  { ssr: false }
);

const HackathonDetails = dynamic(
  () => import('@/components/HackathonDetails').then(m => m.HackathonDetails),
  { ssr: false }
);

export default function HackathonPage() {
  return (
    <main className="flex-1 flex flex-col xl:min-h-0">
      <Heartbeat />

      {/* Page header */}
      <header className="flex items-center justify-between pt-4 px-4 mb-2 mx-auto w-full max-w-5xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center">
            <svg className="w-5 h-3" viewBox="0 0 20 12" fill="none">
              <rect x="0.5" y="0.5" width="19" height="11" rx="5.5" fill="white" stroke="#222228" strokeWidth="1" />
              <path d="M10 0.5H14.5C17.2614 0.5 19.5 2.73858 19.5 5.5V6.5C19.5 9.26142 17.2614 11.5 14.5 11.5H10V0.5Z" fill="#82e24c" stroke="#222228" strokeWidth="1" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">Hackathon Screener</h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-semibold bg-solana-green/20 text-solana-green rounded-full border border-solana-green/30">
                LIVE
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-gray-500">PumpFun Build in Public tokens</p>
              <span className="sm:hidden px-1.5 py-0.5 text-[9px] font-semibold bg-solana-green/20 text-solana-green rounded-full border border-solana-green/30">
                LIVE
              </span>
            </div>
          </div>
        </div>
        <a
          href="https://hackathon.pump.fun/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111113] border border-[#222228] text-xs text-gray-400 hover:text-solana-purple hover:border-solana-purple/30 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="hidden sm:inline">hackathon.pump.fun</span>
          <span className="sm:hidden">Hackathon</span>
        </a>
      </header>

      {/* Desktop side panels */}
      <div className="hidden xl:block">
        <HackathonDetails />
        <HackathonInfo />
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto scroll-fade px-4 pb-4 xl:pb-2">
        <div className="max-w-5xl mx-auto">
          <HackathonScreener />
        </div>
      </div>
    </main>
  );
}
