import { Metadata } from 'next';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const CopyCA = dynamic(() => import('@/components/CopyCA'), { ssr: false });
const SoltLiveData = dynamic(() => import('@/components/SoltLiveData'), { ssr: false });

export const metadata: Metadata = {
  title: '$SOLT Token - SolTools',
  description: 'The community token powering the future of SolTools. Revenue share, early access, governance, and more.',
};

const SolToolsBadge = () => (
  <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="solt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9945FF" />
        <stop offset="100%" stopColor="#14F195" />
      </linearGradient>
    </defs>
    <polygon points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5" fill="url(#solt-grad)" />
    <polygon points="55,18 38,52 50,52 45,82 62,48 50,48" fill="white" />
  </svg>
);

const benefits = [
  {
    title: 'Revenue Share',
    description: 'Earn a cut of platform revenue. As SolTools grows, so does your bag.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Early Access',
    description: 'Try new tools first. Holders get access before anyone else.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Governance',
    description: 'Vote on what gets built next. You decide the roadmap.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Priority Builds',
    description: 'Request features directly. Holder requests get built first.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
];

const steps = [
  {
    num: '1',
    title: 'Get SOL ready',
    description: 'Have SOL in a wallet like Phantom or Solflare.',
  },
  {
    num: '2',
    title: 'Open Pump.fun',
    description: 'Go to pump.fun and connect your wallet.',
  },
  {
    num: '3',
    title: 'Find $SOLT',
    description: 'Search "SOLTOOLS" or paste the contract address.',
  },
  {
    num: '4',
    title: 'Buy and hold',
    description: 'Confirm the transaction. Welcome to the community.',
  },
];

export default function PumpTokenPage() {
  return (
    <main className="flex-1 flex flex-col xl:overflow-hidden relative">
      <div className="flex-1 overflow-y-auto scroll-fade">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-12 sm:pt-20">

          {/* Hero */}
          <section className="text-center mb-14 sm:mb-20">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="float w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden relative shadow-[0_0_40px_rgba(153,69,255,0.2)]">
                  <div className="absolute inset-0 shimmer" />
                  <SolToolsBadge />
                </div>
                <div className="absolute -inset-5 rounded-3xl bg-gradient-to-br from-solana-purple/10 to-solana-green/10 blur-2xl -z-10 pulse-glow" />
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
              SOLTOOLS <span className="bg-gradient-to-r from-solana-purple to-solana-green bg-clip-text text-transparent">$SOLT</span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-base max-w-lg mx-auto mb-4 leading-relaxed">
              The community token behind SolTools. Hold $SOLT to earn revenue, get early access, and decide what gets built next.
            </p>

            {/* Launched on pump.fun badge */}
            <div className="flex items-center justify-center gap-2 mb-5">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0d0d0f] border border-[#1a1a1f]">
                <img src="/pumpfun-avatar.jpg" alt="pump.fun" className="w-5 h-5 rounded-full" />
                <span className="text-[11px] text-gray-400 font-medium">Launched on <span className="text-white font-semibold">pump.fun</span></span>
              </div>
            </div>

            {/* Contract address */}
            <div className="flex items-center justify-center mb-8">
              <CopyCA />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-solana-purple to-solana-green text-white font-semibold text-sm hover:opacity-90 hover:shadow-[0_0_30px_rgba(153,69,255,0.25)] active:scale-[0.98] transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Buy on Pump.fun
              </a>
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-[#1a1a1f] text-gray-500 text-sm font-medium hover:text-white hover:border-[#333] transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to SolTools
              </Link>
            </div>

            {/* Social links */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <a
                href="https://x.com/SolToolsApp"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0d0d0f] border border-[#1a1a1f] text-gray-500 text-[11px] font-medium hover:text-white hover:border-[#333] transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Follow @SolToolsApp
              </a>
              <a
                href="https://github.com/dequaviousthe7th/sol-tools"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0d0d0f] border border-[#1a1a1f] text-gray-500 text-[11px] font-medium hover:text-white hover:border-[#333] transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                GitHub
              </a>
            </div>

            {/* Trade on */}
            <div className="mt-8">
              <p className="text-[10px] uppercase tracking-[0.25em] text-gray-600 font-semibold mb-3">Trade on</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <a href="#" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0d0d0f] border border-[#1a1a1f] text-gray-400 text-[11px] font-medium hover:text-white hover:border-solana-purple/25 transition-all">
                  <img src="/pumpfun-avatar.jpg" alt="Pump.fun" className="w-3.5 h-3.5 rounded-full" />
                  Pump.fun
                </a>
                <a href="https://axiom.trade" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0d0d0f] border border-[#1a1a1f] text-gray-400 text-[11px] font-medium hover:text-white hover:border-solana-purple/25 transition-all">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 19.5h20L12 2z" fill="#6366f1" /><path d="M12 8l-5 9h10l-5-9z" fill="#111" /></svg>
                  Axiom
                </a>
                <a href="https://photon-sol.tinyastro.io" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0d0d0f] border border-[#1a1a1f] text-gray-400 text-[11px] font-medium hover:text-white hover:border-solana-purple/25 transition-all">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#f59e0b" /><circle cx="12" cy="12" r="5" fill="#111" /><circle cx="12" cy="12" r="2" fill="#f59e0b" /></svg>
                  Photon
                </a>
                <a href="https://gmgn.ai" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0d0d0f] border border-[#1a1a1f] text-gray-400 text-[11px] font-medium hover:text-white hover:border-solana-purple/25 transition-all">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#10b981" /><path d="M7 13l3 3 7-7" stroke="#111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  GMGN
                </a>
                <a href="https://dexscreener.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0d0d0f] border border-[#1a1a1f] text-gray-400 text-[11px] font-medium hover:text-white hover:border-solana-purple/25 transition-all">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#0ea5e9" /><path d="M8 16l3-5 3 3 4-6" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Dexscreener
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Live Chart + Top Traders — only visible when CA is set */}
        <SoltLiveData />

        <div className="max-w-4xl mx-auto px-5 sm:px-8 pb-12 sm:pb-20">
          {/* Why $SOLT */}
          <section className="mb-14 sm:mb-20">
            <div className="text-center mb-8">
              <p className="text-[10px] uppercase tracking-[0.25em] text-solana-purple/70 font-semibold mb-2">The Vision</p>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Why $SOLT?</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
              <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-xl p-5 hover:border-solana-purple/20 transition-all duration-300">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-solana-purple/10 to-solana-green/10 flex items-center justify-center text-solana-purple mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-[13px] mb-1.5">Free forever</h3>
                <p className="text-gray-500 text-[11.5px] leading-relaxed">SolTools is free and verifiable — always. $SOLT funds development while giving back to the community.</p>
              </div>
              <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-xl p-5 hover:border-solana-purple/20 transition-all duration-300">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-solana-purple/10 to-solana-green/10 flex items-center justify-center text-solana-green mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-[13px] mb-1.5">Be a stakeholder</h3>
                <p className="text-gray-500 text-[11.5px] leading-relaxed">Revenue share, early access, and a direct voice in what gets built. Not a cash grab — a community fund.</p>
              </div>
              <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-xl p-5 hover:border-solana-purple/20 transition-all duration-300">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-solana-purple/10 to-solana-green/10 flex items-center justify-center text-solana-purple mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-[13px] mb-1.5">Win together</h3>
                <p className="text-gray-500 text-[11.5px] leading-relaxed">Building in public, shipping real tools. If SolTools wins, $SOLT holders win.</p>
              </div>
            </div>
          </section>

          {/* Benefits Grid */}
          <section className="mb-14 sm:mb-20">
            <div className="text-center mb-8">
              <p className="text-[10px] uppercase tracking-[0.25em] text-solana-green/70 font-semibold mb-2">Holder Benefits</p>
              <h2 className="text-xl sm:text-2xl font-bold text-white">What you get</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {benefits.map(b => (
                <div key={b.title} className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-xl p-5 sm:p-6 hover:border-solana-purple/20 transition-all duration-300">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-solana-purple/10 to-solana-green/10 flex items-center justify-center text-solana-purple mb-3">
                    {b.icon}
                  </div>
                  <h3 className="text-white font-semibold text-[13px] mb-1.5">{b.title}</h3>
                  <p className="text-gray-500 text-[11.5px] leading-relaxed">{b.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Tokenomics */}
          <section className="mb-14 sm:mb-20">
            <div className="text-center mb-8">
              <p className="text-[10px] uppercase tracking-[0.25em] text-solana-purple/70 font-semibold mb-2">Tokenomics</p>
              <h2 className="text-xl sm:text-2xl font-bold text-white">100% fair launch</h2>
            </div>

            <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-xl p-6 sm:p-8 max-w-2xl mx-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Presale', value: 'None' },
                  { label: 'Team Alloc', value: '0%' },
                  { label: 'VC Funding', value: 'None' },
                  { label: 'Launch', value: 'Pump.fun' },
                ].map(stat => (
                  <div key={stat.label} className="text-center">
                    <p className="text-white font-bold text-lg sm:text-xl">{stat.value}</p>
                    <p className="text-gray-500 text-[10px] sm:text-[11px] uppercase tracking-wider mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="h-3 rounded-full bg-[#111113] border border-[#222228] overflow-hidden">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-solana-purple to-solana-green" />
              </div>
              <p className="text-center text-gray-500 text-[11px] mt-2">100% available on pump.fun — no hidden allocations</p>
            </div>
          </section>

          {/* How to Buy */}
          <section className="mb-14 sm:mb-20">
            <div className="text-center mb-8">
              <p className="text-[10px] uppercase tracking-[0.25em] text-solana-green/70 font-semibold mb-2">Get Started</p>
              <h2 className="text-xl sm:text-2xl font-bold text-white">How to buy</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {steps.map(step => (
                <div key={step.num} className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-xl p-5 hover:border-solana-green/20 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-solana-purple/15 to-solana-green/15 flex items-center justify-center text-solana-green font-bold text-sm border border-solana-green/20">
                      {step.num}
                    </div>
                    <h3 className="text-white font-semibold text-[13px]">{step.title}</h3>
                  </div>
                  <p className="text-gray-500 text-[11.5px] leading-relaxed pl-11">{step.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <CopyCA />
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="pb-8">
            <div className="relative rounded-2xl border border-solana-purple/15 bg-gradient-to-br from-solana-purple/[0.05] to-solana-green/[0.03] p-10 sm:p-14 text-center overflow-hidden">
              <div className="shimmer absolute inset-0 pointer-events-none opacity-50" />
              <div className="relative z-10">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">Get in early</h2>
                <p className="text-gray-500 text-[13px] sm:text-sm mb-8 max-w-md mx-auto">
                  SolTools is growing. Get $SOLT now and grow with it.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
                  <a
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-solana-purple to-solana-green text-white font-semibold text-sm hover:opacity-90 hover:shadow-[0_0_30px_rgba(153,69,255,0.25)] active:scale-[0.98] transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    Buy $SOLT on Pump.fun
                  </a>
                </div>
                <div className="mb-6">
                  <CopyCA />
                </div>
                <div className="flex items-center justify-center gap-4">
                  <a href="https://x.com/SolToolsApp" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-white transition-colors" title="X (Twitter)">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <a href="https://github.com/dequaviousthe7th/sol-tools" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-white transition-colors" title="GitHub">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                  </a>
                  <Link href="/" className="text-gray-600 hover:text-solana-purple transition-colors" title="SolTools">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2L21 7V17L12 22L3 17V7Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 8L10.5 12.5H13.5L11 17" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
