import { Metadata } from 'next';
import { WalletButton } from '@/components/WalletButton';
import { ClientApp } from '@/components/ClientApp';
import { PriceProvider, BtcPrice, SolPrice } from '@/components/PriceTicker';
import { Heartbeat, FooterSocialLinks } from '@/components/Heartbeat';

export const metadata: Metadata = {
  title: 'Reclaim SOL - SolReclaimer',
  description: 'Reclaim locked SOL from empty token accounts. Zero fees, open source.',
};

export default function ReclaimPage() {
  return (
    <PriceProvider>
    <main className="min-h-screen xl:h-screen xl:overflow-hidden flex flex-col">
      {/* Anonymous analytics heartbeat */}
      <Heartbeat />

      {/* Header — aligns with side panels on xl */}
      <header className="flex justify-between items-center pt-4 px-4 mb-2 mx-auto w-full max-w-4xl xl:max-w-none xl:px-[calc(50vw-38.5rem)]">
        <div className="xl:w-64 xl:flex xl:justify-center">
          <a href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">Reclaimer</h1>
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
            </div>
          </a>
        </div>
        <div className="xl:w-64 xl:flex xl:justify-center">
          <WalletButton />
        </div>
      </header>

      <div className="container mx-auto px-4 pb-4 xl:pb-2 max-w-4xl flex flex-col flex-1">
        {/* Main App */}
        <ClientApp />

        {/* Footer */}
        <footer className="mt-auto pt-3 border-t border-[#222228]">
          <div className="flex items-center justify-between text-xs text-gray-500">
            {/* BTC price — left (desktop only) */}
            <div className="hidden xl:block"><BtcPrice /></div>

            {/* Center links with social tracking */}
            <FooterSocialLinks />

            {/* SOL price — right (desktop only) */}
            <div className="hidden xl:block"><SolPrice /></div>
          </div>
        </footer>
      </div>

    </main>
    </PriceProvider>
  );
}
