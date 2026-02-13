import Link from 'next/link';
import dynamic from 'next/dynamic';

const WalletStatsHub = dynamic(() => import('../components/WalletStatsHub'), { ssr: false });

const tools = [
  {
    id: 'reclaim',
    title: 'SOL Reclaimer',
    badge: 'MAINNET',
    badgeClass: 'bg-solana-green/20 text-solana-green border-solana-green/30',
    description: 'Reclaim locked SOL from empty token accounts. Connect your wallet, scan for reclaimable rent, and close accounts in one click.',
    href: '/reclaim',
    accentFrom: 'from-solana-purple',
    accentTo: 'to-solana-green',
    iconBg: 'from-solana-purple/10 to-solana-green/10',
    iconColor: 'text-solana-purple',
    hoverBorder: 'group-hover:border-solana-purple/40 group-hover:shadow-[0_0_15px_rgba(153,69,255,0.15)]',
    linkColor: 'text-solana-purple',
    dotColor: 'bg-solana-green/60 group-hover:bg-solana-green',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'vanity',
    title: 'Vanity Generator',
    badge: 'CLIENT-SIDE',
    badgeClass: 'bg-solana-green/20 text-solana-green border-solana-green/30',
    description: 'Generate custom Solana wallet addresses with your chosen prefix or suffix. Runs entirely in your browser — keys never leave your device.',
    href: '/vanity',
    accentFrom: 'from-solana-green',
    accentTo: 'to-emerald-400',
    iconBg: 'from-solana-purple/10 to-solana-green/10',
    iconColor: 'text-solana-purple',
    hoverBorder: 'group-hover:border-solana-purple/40 group-hover:shadow-[0_0_15px_rgba(153,69,255,0.15)]',
    linkColor: 'text-solana-purple',
    dotColor: 'bg-solana-green/60 group-hover:bg-solana-green',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
  {
    id: 'hackathon',
    title: 'Hackathon Screener',
    badge: 'LIVE',
    badgeClass: 'bg-solana-green/20 text-solana-green border-solana-green/30',
    description: 'Track PumpFun "Build in Public" hackathon tokens with live market data, price changes, and key links — all in one place.',
    href: '/hackathon',
    accentFrom: 'from-solana-purple',
    accentTo: 'to-solana-green',
    iconBg: 'from-solana-purple/10 to-solana-green/10',
    iconColor: 'text-solana-purple',
    hoverBorder: 'group-hover:border-solana-purple/40 group-hover:shadow-[0_0_15px_rgba(153,69,255,0.15)]',
    linkColor: 'text-solana-purple',
    dotColor: 'bg-solana-green/60 group-hover:bg-solana-green',
    icon: (
      <svg className="w-6 h-3.5" viewBox="0 0 20 12" fill="none">
        <rect x="0.5" y="0.5" width="19" height="11" rx="5.5" fill="white" stroke="#222228" strokeWidth="1" />
        <path d="M10 0.5H14.5C17.2614 0.5 19.5 2.73858 19.5 5.5V6.5C19.5 9.26142 17.2614 11.5 14.5 11.5H10V0.5Z" fill="#82e24c" stroke="#222228" strokeWidth="1" />
      </svg>
    ),
  },
];

const features = [
  { label: 'Zero Fees', icon: '0' },
  { label: 'Open Source', icon: '{}' },
  { label: 'No Tracking', icon: '~' },
];

export default function HubPage() {
  return (
    <main className="flex-1 flex flex-col pb-6 relative">

      {/* My Stats pill — top right, only when wallet connected */}
      <div className="hidden sm:block absolute top-4 right-4 z-10">
        <WalletStatsHub />
      </div>

      {/* Hero */}
      <section className="pt-14 sm:pt-20 pb-8 sm:pb-12 text-center px-4 relative">
        {/* Floating animated logo */}
        <div className="flex justify-center mb-5">
          <div className="float pulse-glow w-14 sm:w-[72px] h-14 sm:h-[72px] rounded-2xl bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center">
            <svg className="w-8 sm:w-10 h-8 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2L21 7V17L12 22L3 17V7Z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 8L10.5 12.5H13.5L11 17" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-2.5">SolTools</h1>
        <p className="text-gray-400 text-base sm:text-lg max-w-md mx-auto mb-6">
          Free, open-source Solana tools. No fees, no tracking, no compromise.
        </p>

        {/* Feature pills */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          {features.map(f => (
            <div key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111113] border border-[#222228] text-xs text-gray-400">
              <span className="text-solana-purple font-mono font-bold text-[10px]">{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>
      </section>

      {/* Tools grid */}
      <section className="px-4 max-w-4xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map(tool => (
          <Link
            key={tool.id}
            href={tool.href}
            className="card card-hover group flex flex-col overflow-hidden transition-all"
          >
            {/* Gradient accent top bar */}
            <div className={`h-[2px] w-full bg-gradient-to-r ${tool.accentFrom} ${tool.accentTo} opacity-60 group-hover:opacity-100 transition-opacity`} />

            <div className="p-5 flex flex-col flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.iconBg} flex items-center justify-center border border-[#222228] ${tool.iconColor} ${tool.hoverBorder} transition-all`}>
                  {tool.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-white font-semibold text-sm">{tool.title}</h2>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-semibold rounded-full border ${tool.badgeClass}`}>
                      {tool.badge}
                    </span>
                    {tool.id === 'hackathon' && (
                      <span className="inline-flex px-1.5 py-0.5 text-[8px] font-bold uppercase bg-solana-purple/20 text-solana-purple rounded-full border border-solana-purple/30">
                        Limited Time
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed flex-1">{tool.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className={`${tool.linkColor} text-xs font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1`}>
                  Open tool
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
                <div className={`w-1.5 h-1.5 rounded-full ${tool.dotColor} animate-pulse`} />
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* Coming soon teaser */}
      <section className="px-4 max-w-4xl mx-auto w-full mt-4">
        <div className="relative rounded-2xl border border-dashed border-[#222228] p-5 flex items-center gap-4 overflow-hidden">
          <div className="shimmer absolute inset-0 pointer-events-none" />
          <div className="w-11 h-11 rounded-xl bg-[#111113] flex items-center justify-center border border-[#222228] text-gray-600 flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium">More tools coming soon</p>
            <p className="text-gray-600 text-[11px] mt-0.5">Token analytics, portfolio tracker, and more in the works.</p>
          </div>
        </div>
      </section>

    </main>
  );
}
