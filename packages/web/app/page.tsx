import Link from 'next/link';
import { PriceProvider, BtcPrice, SolPrice } from '@/components/PriceTicker';

const tools = [
  {
    id: 'reclaim',
    title: 'SOL Reclaimer',
    badge: 'MAINNET',
    badgeClass: 'bg-solana-green/20 text-solana-green border-solana-green/30',
    description: 'Reclaim locked SOL from empty token accounts. Connect your wallet, scan for reclaimable rent, and close accounts in one click.',
    href: '/reclaim',
    icon: (
      <svg className="w-6 h-6 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'vanity',
    title: 'Vanity Generator',
    badge: 'CLIENT-SIDE',
    badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    description: 'Generate custom Solana wallet addresses with your chosen prefix or suffix. Runs entirely in your browser — keys never leave your device.',
    href: '/vanity',
    icon: (
      <svg className="w-6 h-6 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
];

export default function HubPage() {
  return (
    <PriceProvider>
    <main className="min-h-screen flex flex-col">

      {/* Hero */}
      <section className="pt-16 sm:pt-24 pb-10 sm:pb-14 text-center px-4">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center shadow-lg shadow-solana-purple/20">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-3">SolReclaimer</h1>
        <p className="text-gray-400 text-base sm:text-lg max-w-md mx-auto">
          Free, open-source Solana tools. No fees, no tracking, no compromise.
        </p>
      </section>

      {/* Tools grid */}
      <section className="px-4 max-w-2xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tools.map(tool => (
          <Link
            key={tool.id}
            href={tool.href}
            className="card card-hover group flex flex-col p-5 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#16161a] flex items-center justify-center border border-[#222228] group-hover:border-solana-purple/40 transition-colors">
                {tool.icon}
              </div>
              <div>
                <h2 className="text-white font-semibold text-sm">{tool.title}</h2>
                <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-semibold rounded-full border ${tool.badgeClass}`}>
                  {tool.badge}
                </span>
              </div>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed flex-1">{tool.description}</p>
            <span className="mt-4 text-solana-purple text-xs font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
              Open tool
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        ))}
      </section>

      {/* Footer */}
      <footer className="mt-auto pt-3 pb-3 border-t border-[#222228]">
        <div className="px-6 lg:px-10 flex items-center justify-between text-[11px] text-gray-500">
          <BtcPrice />
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <a
              href="https://github.com/dequaviousthe7th/sol-reclaimer"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-solana-purple transition-colors"
              title="View on GitHub"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
            <a
              href="https://x.com/SolanaReclaimer"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-solana-purple transition-colors"
              title="Follow on X"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <span className="text-gray-700">&middot;</span>
            <span className="text-[10px]">Built by <a
              href="https://x.com/dequavious7th"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-solana-purple transition-colors"
            >Dequavious</a></span>
          </div>
          <SolPrice />
        </div>
      </footer>

    </main>
    </PriceProvider>
  );
}
