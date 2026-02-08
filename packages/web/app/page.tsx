import { WalletButton } from '@/components/WalletButton';
import { ClientApp } from '@/components/ClientApp';
import { PriceProvider, BtcPrice, SolPrice } from '@/components/PriceTicker';

export default function Home() {
  return (
    <PriceProvider>
    <main className="min-h-screen flex flex-col">
      {/* Header — aligns with side panels on xl */}
      <header className="flex justify-between items-center pt-4 px-4 mb-2 mx-auto w-full max-w-4xl xl:max-w-none xl:px-[calc(50vw-38.5rem)]">
        <div className="xl:w-64 xl:flex xl:justify-center">
          <a href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">SolReclaimer</h1>
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

      <div className="container mx-auto px-4 pb-4 max-w-4xl flex flex-col flex-1">
        {/* Main App */}
        <ClientApp />

        {/* Footer */}
        <footer className="mt-auto pt-3 border-t border-[#222228]">
          <div className="flex items-center justify-between text-xs text-gray-500">
            {/* BTC price — left (desktop only) */}
            <div className="hidden xl:block"><BtcPrice /></div>

            {/* Center links */}
            <div className="flex items-center gap-3 mx-auto xl:mx-0 flex-shrink-0">
              <a
                href="https://github.com/dequaviousthe7th/sol-reclaimer"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-solana-purple transition-colors"
                title="View on GitHub"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
              <a
                href="https://x.com/SolanaReclaimer"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-solana-purple transition-colors"
                title="Follow on X"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <span className="text-gray-700">·</span>
              <span>Built by <a href="https://x.com/dequavious7th" target="_blank" rel="noopener noreferrer" className="hover:text-solana-purple transition-colors">Dequavious</a></span>
            </div>

            {/* SOL price — right (desktop only) */}
            <div className="hidden xl:block"><SolPrice /></div>
          </div>
        </footer>
      </div>

    </main>
    </PriceProvider>
  );
}
