import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { PriceProvider, BtcPrice, SolPrice } from '@/components/PriceTicker';
import { FooterSocialLinks } from '@/components/Heartbeat';

export const metadata: Metadata = {
  title: 'Vanity Wallet Generator - SolReclaimer',
  description: 'Generate custom Solana wallet addresses with your chosen prefix or suffix. Free, client-side, secure.',
};

const VanityGenerator = dynamic(
  () => import('@/components/VanityGenerator').then(m => m.VanityGenerator),
  { ssr: false }
);

const VanityFAQ = dynamic(
  () => import('@/components/VanityFAQ').then(m => m.VanityFAQ),
  { ssr: false }
);

export default function VanityPage() {
  return (
    <PriceProvider>
    <main className="min-h-screen xl:h-screen xl:overflow-hidden flex flex-col">
      {/* Page header */}
      <header className="flex items-center pt-4 px-4 mb-2 mx-auto w-full max-w-3xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center xl:hidden">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Vanity Generator</h1>
            <p className="text-xs text-gray-500">Generate custom Solana addresses</p>
          </div>
        </div>
      </header>

      {/* Desktop FAQ side panel */}
      <div className="hidden xl:block">
        <VanityFAQ />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 pb-4 xl:pb-2 max-w-3xl flex flex-col flex-1">
        <VanityGenerator />

        {/* Footer — exact copy of SolReclaimer footer */}
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
