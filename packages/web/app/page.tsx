import Link from 'next/link';
import dynamic from 'next/dynamic';

const WalletStatsHub = dynamic(() => import('../components/WalletStatsHub'), { ssr: false });
const HomePromoPanel = dynamic(() => import('../components/HomePromoPanel').then(m => ({ default: m.HomePromoPanel })), { ssr: false });
const FeatureRequestTrigger = dynamic(() => import('../components/FeatureRequestTrigger').then(m => ({ default: m.FeatureRequestTrigger })), { ssr: false });
const ActiveUsersPill = dynamic(() => import('../components/Heartbeat').then(m => ({ default: m.ActiveUsersCount })), { ssr: false });

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
    accentFrom: 'from-cyan-400',
    accentTo: 'to-blue-500',
    iconBg: 'from-cyan-400/10 to-blue-500/10',
    iconColor: 'text-cyan-400',
    hoverBorder: 'group-hover:border-cyan-400/40 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.15)]',
    linkColor: 'text-cyan-400',
    dotColor: 'bg-solana-green/60 group-hover:bg-solana-green',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
  {
    id: 'burn',
    title: 'Burn or Lock',
    badge: 'MAINNET',
    badgeClass: 'bg-solana-green/20 text-solana-green border-solana-green/30',
    description: 'Burn or permanently lock tokens on Solana. Build trust with your community — verifiable on-chain.',
    href: '/burn-lock',
    accentFrom: 'from-orange-500',
    accentTo: 'to-blue-500',
    iconBg: 'from-orange-500/10 to-blue-500/10',
    iconColor: 'text-orange-500',
    hoverBorder: 'group-hover:border-orange-500/40 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.15)]',
    linkColor: 'text-orange-500',
    dotColor: 'bg-solana-green/60 group-hover:bg-solana-green',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    ),
  },
  {
    id: 'scan',
    title: 'Token Scanner',
    badge: 'LIVE',
    badgeClass: 'bg-solana-green/20 text-solana-green border-solana-green/30',
    description: 'Instant safety reports for any Solana token. Check risk scores, holder concentration, LP status, and market data before you buy.',
    href: '/scan',
    accentFrom: 'from-blue-400',
    accentTo: 'to-indigo-500',
    iconBg: 'from-blue-400/10 to-indigo-500/10',
    iconColor: 'text-blue-400',
    hoverBorder: 'group-hover:border-blue-400/40 group-hover:shadow-[0_0_15px_rgba(96,165,250,0.15)]',
    linkColor: 'text-blue-400',
    dotColor: 'bg-solana-green/60 group-hover:bg-solana-green',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    id: 'xray',
    title: 'Wallet X-Ray',
    badge: 'LIVE',
    badgeClass: 'bg-solana-green/20 text-solana-green border-solana-green/30',
    description: 'See any wallet\'s true trading performance. PnL breakdown, win rate, trader grade, and per-token analysis — no wallet connection needed.',
    href: '/xray',
    accentFrom: 'from-violet-400',
    accentTo: 'to-pink-500',
    iconBg: 'from-violet-400/10 to-pink-500/10',
    iconColor: 'text-violet-400',
    hoverBorder: 'group-hover:border-violet-400/40 group-hover:shadow-[0_0_15px_rgba(167,139,250,0.15)]',
    linkColor: 'text-violet-400',
    dotColor: 'bg-solana-green/60 group-hover:bg-solana-green',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  {
    id: 'hackathon',
    title: 'Hackathon Screener',
    badge: 'LIVE',
    badgeClass: 'bg-solana-green/20 text-solana-green border-solana-green/30',
    description: 'PumpFun Build in Public hackathon screener. Track entries, filter by status, and find promising projects.',
    href: '/hackathon',
    accentFrom: 'from-emerald-500',
    accentTo: 'to-lime-400',
    iconBg: 'from-emerald-500/10 to-lime-400/10',
    iconColor: 'text-emerald-500',
    hoverBorder: 'group-hover:border-emerald-500/40 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    linkColor: 'text-emerald-500',
    dotColor: 'bg-solana-green/60 group-hover:bg-solana-green',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 20 12" fill="none">
        <rect x="0.5" y="0.5" width="19" height="11" rx="5.5" fill="white" stroke="currentColor" strokeWidth="1" />
        <path d="M10 0.5H14.5C17.2614 0.5 19.5 2.73858 19.5 5.5V6.5C19.5 9.26142 17.2614 11.5 14.5 11.5H10V0.5Z" fill="#82e24c" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
];

const features = [
  { label: 'Zero Fees', icon: '0' },
  { label: 'Verifiable', icon: '{}' },
  { label: 'No Tracking', icon: '~' },
];

export default function HubPage() {
  return (
    <main className="flex-1 flex flex-col pb-6 relative overflow-hidden">

      {/* My Stats pill — top right, only when wallet connected */}
      <div className="hidden sm:block absolute top-4 right-4 z-10">
        <WalletStatsHub />
      </div>

      {/* Hero */}
      <section className="pt-8 sm:pt-11 pb-4 sm:pb-6 text-center px-4 relative">
        {/* Floating animated logo */}
        <div className="flex justify-center mb-3.5">
          <div className="float pulse-glow w-[54px] sm:w-[68px] h-[54px] sm:h-[68px] rounded-2xl bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center">
            <svg className="w-[31px] sm:w-[39px] h-[31px] sm:h-[39px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2L21 7V17L12 22L3 17V7Z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 8L10.5 12.5H13.5L11 17" />
            </svg>
          </div>
        </div>
        <h1 className="text-[1.9rem] sm:text-[2.4rem] font-bold gradient-text mb-1.5">SolTools</h1>
        <p className="text-gray-400 text-[13.5px] sm:text-[15px] max-w-md mx-auto mb-4">
          Free, verifiable Solana tools. No fees, no tracking, no compromise.
        </p>

        {/* Feature pills */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          {features.map(f => (
            <div key={f.label} className="flex items-center gap-1.5 px-[11px] py-1.5 rounded-full bg-[#111113] border border-[#222228] text-[11.5px] text-gray-400">
              <span className="text-solana-purple font-mono font-bold text-[10px]">{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>

        {/* Live active users indicator */}
        <div className="flex justify-center mt-2.5 text-[11px] text-gray-500">
          <ActiveUsersPill />
        </div>
      </section>

      {/* Tools grid */}
      <section className="px-4 max-w-[51rem] mx-auto w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tools.map(tool => (
          <Link
            key={tool.id}
            href={tool.href}
            className="card card-hover group flex flex-col overflow-hidden transition-all"
          >
            {/* Gradient accent top bar */}
            <div className={`h-[2px] w-full bg-gradient-to-r ${tool.accentFrom} ${tool.accentTo} opacity-60 group-hover:opacity-100 transition-opacity`} />

            <div className="p-[16px] flex flex-col flex-1">
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-[39px] h-[39px] rounded-xl bg-gradient-to-br ${tool.iconBg} flex items-center justify-center border border-[#222228] ${tool.iconColor} ${tool.hoverBorder} transition-all [&>svg]:w-[21px] [&>svg]:h-[21px]`}>
                  {tool.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-white font-semibold text-[13.5px] leading-snug">{tool.title}</h2>
                  <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-semibold rounded-full border ${tool.badgeClass}`}>
                    {tool.badge}
                  </span>
                </div>
              </div>
              <p className="text-gray-400 text-[11.5px] leading-[1.6] flex-1">{tool.description}</p>
              <div className="mt-2.5 flex items-center justify-between">
                <span className={`${tool.linkColor} text-[11.5px] font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1`}>
                  Open tool
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
                <div className={`w-1.5 h-1.5 rounded-full ${tool.dotColor} animate-pulse`} />
              </div>
            </div>
          </Link>
        ))}

      </section>

      {/* Floating side promo panels (desktop) */}
      <HomePromoPanel />

      {/* Coming soon teaser + feature request trigger */}
      <FeatureRequestTrigger />

    </main>
  );
}
