'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { RentReclaimer } from '@/components/RentReclaimer';

export default function Home() {
  const { connected } = useWallet();

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">SolReclaimer</h1>
              <p className="text-xs text-gray-500">Zero fees, open source</p>
            </div>
          </div>
          <WalletMultiButton />
        </header>

        {/* Hero Section */}
        {!connected && (
          <section className="text-center py-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-solana-purple/10 border border-solana-purple/20 text-solana-purple text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-solana-green animate-pulse"></span>
              100% Free - No Hidden Fees
            </div>

            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="text-white">Reclaim Your</span>
              <br />
              <span className="gradient-text">Locked SOL</span>
            </h2>

            <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
              Empty token accounts are holding your SOL hostage. Close them instantly and get your rent deposits back.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <div className="gradient-border">
                <div className="px-6 py-3">
                  <WalletMultiButton />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 max-w-md mx-auto mb-16">
              <div className="text-center">
                <div className="text-3xl font-bold text-solana-green mb-1">0%</div>
                <div className="text-sm text-gray-500">Fees</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">~0.002</div>
                <div className="text-sm text-gray-500">SOL/Account</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-solana-purple mb-1">100%</div>
                <div className="text-sm text-gray-500">Yours</div>
              </div>
            </div>

            {/* How it works */}
            <div className="grid md:grid-cols-3 gap-4">
              <FeatureCard
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                }
                step="1"
                title="Connect"
                description="Connect your Solana wallet"
              />
              <FeatureCard
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
                step="2"
                title="Scan"
                description="Find empty token accounts"
              />
              <FeatureCard
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                step="3"
                title="Reclaim"
                description="Get your SOL back instantly"
              />
            </div>
          </section>
        )}

        {/* Main App */}
        {connected && <RentReclaimer />}

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-[#222228] text-center">
          <p className="text-xs text-gray-500 mb-2">Free forever</p>
          <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
            <a
              href="https://github.com/dequaviousthe7th/sol-rent-reclaimer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-solana-purple transition-colors"
              title="View on GitHub"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub</span>
            </a>
            <span className="text-gray-700">·</span>
            <a
              href="https://x.com/dequavious7th"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-solana-purple transition-colors"
              title="Follow on X"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>X</span>
            </a>
            <span className="text-gray-700">·</span>
            <span>
              Built by{' '}
              <a
                href="https://github.com/dequaviousthe7th"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-solana-purple transition-colors"
              >
                Dequavious
              </a>
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}

function FeatureCard({ icon, step, title, description }: { icon: React.ReactNode; step: string; title: string; description: string }) {
  return (
    <div className="card card-hover p-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center mx-auto mb-4 text-solana-purple">
        {icon}
      </div>
      <div className="text-xs text-solana-purple font-medium mb-2">Step {step}</div>
      <h3 className="font-semibold text-lg mb-1 text-white">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}
