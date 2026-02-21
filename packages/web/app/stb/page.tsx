import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Discord Bot - SolTools',
  description: 'Real-time Solana token intelligence for Discord. Scan tokens, track fee locks, spot trending Pump.fun tokens, and more.',
};

const commands = [
  {
    name: '/scan',
    args: '<mint>',
    description: 'Full token breakdown — price, market cap, liquidity, volume, top holders, creator, and direct links.',
  },
  {
    name: '/holders',
    args: '<mint>',
    description: 'Top 10 holders with wallet addresses, percentage of supply, and combined concentration.',
  },
  {
    name: '/dev',
    args: '<mint>',
    description: 'Deployer wallet history — every token this dev launched and their FDV. Spot serial ruggers instantly.',
  },
  {
    name: '/trending',
    args: '',
    description: 'Top 10 trending Pump.fun tokens sorted by market cap with live data and direct links.',
  },
  {
    name: '/watch',
    args: '<mint>',
    description: 'Add a token to your server\'s fee-authority lock watchlist. Get instant alerts when it locks.',
  },
  {
    name: '/setscan',
    args: 'enable',
    description: 'Auto-scan mode — paste any mint address in the channel and the bot scans it automatically.',
  },
];

const features = [
  {
    title: 'Real-Time Lock Alerts',
    description: 'WebSocket-powered monitoring detects fee authority locks the instant they happen on-chain.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    title: 'Auto-Scan Channels',
    description: 'Drop any Solana address in chat and the bot scans it instantly. No commands needed.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Dev History Lookup',
    description: 'See every token a deployer has launched. Identify serial ruggers before they get you.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    title: 'Multi-Server Ready',
    description: 'Independent watchlists, scan channels, and configs per server. Add to unlimited servers.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
];

const SolToolsBadge = () => (
  <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="stb-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9945FF" />
        <stop offset="100%" stopColor="#14F195" />
      </linearGradient>
    </defs>
    <polygon points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5" fill="url(#stb-grad)" />
    <polygon points="55,18 38,52 50,52 45,82 62,48 50,48" fill="white" />
  </svg>
);

const DiscordIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

/* Separator line matching the bot's ════════════════ */
const Sep = () => <div className="text-[#3a3c41] text-[10px] leading-none select-none my-1.5">{'━'.repeat(32)}</div>;

export default function BotPage() {
  return (
    <main className="flex-1 flex flex-col xl:overflow-hidden relative">
      <div className="flex-1 overflow-y-auto scroll-fade">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-20">

          {/* Hero */}
          <section className="text-center mb-20 sm:mb-28">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="float w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#5865F2] to-[#4752C4] flex items-center justify-center relative overflow-hidden shadow-[0_0_40px_rgba(88,101,242,0.2)]">
                  <div className="absolute inset-0 shimmer" />
                  <DiscordIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white relative z-10" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-lg overflow-hidden">
                  <SolToolsBadge />
                </div>
                <div className="absolute -inset-5 rounded-3xl bg-[#5865F2]/10 blur-2xl -z-10 pulse-glow" />
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
              SolTools <span className="text-[#5865F2]">Bot</span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto mb-9 leading-relaxed">
              Real-time Solana token intelligence in your Discord server.
              Scan tokens, track locks, spot trends — without leaving chat.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="https://discord.com/oauth2/authorize?client_id=1474858597438455910"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-[#5865F2] text-white font-semibold text-sm hover:bg-[#4752C4] hover:shadow-[0_0_30px_rgba(88,101,242,0.25)] active:scale-[0.98] transition-all duration-200"
              >
                <DiscordIcon className="w-5 h-5" />
                Add to Discord
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
          </section>

          {/* Commands */}
          <section className="mb-20 sm:mb-28">
            <div className="text-center mb-8">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#5865F2]/70 font-semibold mb-2">Slash Commands</p>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Everything you need, one slash away</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {commands.map(cmd => (
                <div
                  key={cmd.name}
                  className="group bg-[#0d0d0f] border border-[#1a1a1f] rounded-xl p-5 hover:border-[#5865F2]/25 hover:bg-[#5865F2]/[0.03] transition-all duration-300"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <code className="text-[#5865F2] font-mono font-bold text-sm group-hover:text-[#7289DA] transition-colors">{cmd.name}</code>
                    {cmd.args && <code className="text-gray-600 font-mono text-[11px]">{cmd.args}</code>}
                  </div>
                  <p className="text-gray-500 text-[11.5px] leading-relaxed">{cmd.description}</p>
                </div>
              ))}
            </div>

            <p className="text-center text-gray-600 text-[11px] mt-4">
              Plus <code className="text-gray-500">/unwatch</code>, <code className="text-gray-500">/list</code>, and <code className="text-gray-500">/setchannel</code> for full server management.
            </p>
          </section>

          {/* Features */}
          <section className="mb-20 sm:mb-28">
            <div className="text-center mb-8">
              <p className="text-[10px] uppercase tracking-[0.25em] text-solana-purple/70 font-semibold mb-2">Features</p>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Built for trading communities</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map(f => (
                <div key={f.title} className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-xl p-5 sm:p-6 hover:border-solana-purple/20 transition-all duration-300">
                  <div className="w-9 h-9 rounded-lg bg-solana-purple/10 flex items-center justify-center text-solana-purple mb-3">
                    {f.icon}
                  </div>
                  <h3 className="text-white font-semibold text-[13px] mb-1.5">{f.title}</h3>
                  <p className="text-gray-500 text-[11.5px] leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Live previews */}
          <section className="mb-20 sm:mb-28">
            <div className="text-center mb-10">
              <p className="text-[10px] uppercase tracking-[0.25em] text-green-400/70 font-semibold mb-2">Preview</p>
              <h2 className="text-xl sm:text-2xl font-bold text-white">See it in action</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Preview 1: /scan */}
              <div className="bg-[#1e1f22] rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-[#1a1b1e] flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#80848e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  <span className="text-[#80848e] text-[13px] font-medium">token-calls</span>
                </div>

                <div className="px-4 py-4 space-y-4">
                  {/* User command */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#ed4245] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">D</div>
                    <div className="min-w-0 pt-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[#ed4245] text-[13px] font-semibold">degen_trader</span>
                        <span className="text-[#5c5e66] text-[11px]">Today at 4:20 PM</span>
                      </div>
                      <p className="text-[#dcddde] text-[13px] mt-0.5"><span className="text-[#00b0f4]">/scan</span> <span className="bg-[#2b2d31] text-[#b5bac1] px-1 py-0.5 rounded text-[12px] font-mono">NV2RYH...pump</span></p>
                    </div>
                  </div>

                  {/* Bot response */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      <SolToolsBadge />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-white text-[13px] font-semibold">SolToolsBot</span>
                        <span className="bg-[#5865F2] text-white text-[8px] px-1 py-0.5 rounded font-semibold leading-none">BOT</span>
                        <span className="text-[#5c5e66] text-[11px]">Today at 4:20 PM</span>
                      </div>

                      {/* Embed */}
                      <div className="bg-[#2b2d31] border-l-[4px] border-[#00d1ff] rounded-r overflow-hidden max-w-[420px]">
                        <div className="p-3">
                          {/* Author */}
                          <p className="text-[#b5bac1] text-[11px] font-semibold mb-1.5">STB &bull; Token Scanner</p>

                          <div className="flex gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Title */}
                              <p className="text-white text-[15px] font-bold mb-0.5">{'\u30d1\u30f3\u30c1'} ($Punch)</p>
                              <p className="text-[#b5bac1] font-mono text-[11px] mb-3 truncate">NV2RYH954cTJ3ckFUpvfqaQXU4ARqqDH3562nFSpump</p>

                              {/* Fields — 3 columns like Discord inline fields */}
                              <div className="grid grid-cols-3 gap-x-3 gap-y-2.5 mb-3">
                                <div>
                                  <p className="text-[#b5bac1] text-[11px] font-semibold mb-0.5">💰 Price</p>
                                  <p className="text-white text-[12px] font-mono bg-[#1e1f22] rounded px-1.5 py-0.5 inline-block">$0.04288</p>
                                </div>
                                <div>
                                  <p className="text-[#b5bac1] text-[11px] font-semibold mb-0.5">📊 Market Cap</p>
                                  <p className="text-white text-[12px] font-mono bg-[#1e1f22] rounded px-1.5 py-0.5 inline-block">$42.88M</p>
                                </div>
                                <div>
                                  <p className="text-[#b5bac1] text-[11px] font-semibold mb-0.5">📈 FDV</p>
                                  <p className="text-white text-[12px] font-mono bg-[#1e1f22] rounded px-1.5 py-0.5 inline-block">$42.88M</p>
                                </div>
                                <div>
                                  <p className="text-[#b5bac1] text-[11px] font-semibold mb-0.5">💧 Liquidity</p>
                                  <p className="text-white text-[12px] font-mono bg-[#1e1f22] rounded px-1.5 py-0.5 inline-block">$904.51K</p>
                                </div>
                                <div>
                                  <p className="text-[#b5bac1] text-[11px] font-semibold mb-0.5">📊 24h Volume</p>
                                  <p className="text-white text-[12px] font-mono bg-[#1e1f22] rounded px-1.5 py-0.5 inline-block">$13.71M</p>
                                </div>
                                <div>
                                  <p className="text-[#b5bac1] text-[11px] font-semibold mb-0.5">📈 24h Change</p>
                                  <p className="text-green-400 text-[12px] font-mono bg-[#1e1f22] rounded px-1.5 py-0.5 inline-block">▲ 54.40%</p>
                                </div>
                              </div>

                              {/* Top 5 Holders */}
                              <div className="mb-3">
                                <p className="text-[#b5bac1] text-[11px] font-semibold mb-1">👥 Top 5 Holders</p>
                                <div className="text-[11px] space-y-0.5 font-mono">
                                  <p><span className="text-[#b5bac1]">1.</span> <span className="text-[#00b0f4]">3xfG...mK9w</span> <span className="text-[#b5bac1]">—</span> <span className="text-white font-bold">4.21%</span></p>
                                  <p><span className="text-[#b5bac1]">2.</span> <span className="text-[#00b0f4]">7f1o...xYz2</span> <span className="text-[#b5bac1]">—</span> <span className="text-white font-bold">3.12%</span></p>
                                  <p><span className="text-[#b5bac1]">3.</span> <span className="text-[#00b0f4]">9aB3...LmN4</span> <span className="text-[#b5bac1]">—</span> <span className="text-white font-bold">2.83%</span></p>
                                  <p><span className="text-[#b5bac1]">4.</span> <span className="text-[#00b0f4]">4xK2...9fRq</span> <span className="text-[#b5bac1]">—</span> <span className="text-white font-bold">1.94%</span></p>
                                  <p><span className="text-[#b5bac1]">5.</span> <span className="text-[#00b0f4]">2mPq...hJ7s</span> <span className="text-[#b5bac1]">—</span> <span className="text-white font-bold">1.41%</span></p>
                                </div>
                              </div>

                              {/* Creator */}
                              <div className="mb-3">
                                <p className="text-[#b5bac1] text-[11px] font-semibold mb-0.5">🔧 Creator</p>
                                <p className="text-[#00b0f4] text-[11px] font-mono">7xK2m...4fRq</p>
                              </div>

                              {/* Links */}
                              <div className="mb-2">
                                <p className="text-[#b5bac1] text-[11px] font-semibold mb-0.5">🔗 Links</p>
                                <p className="text-[11px]">
                                  <span className="text-[#00b0f4]">Pump.fun</span>
                                  <span className="text-[#5c5e66]"> &bull; </span>
                                  <span className="text-[#00b0f4]">Axiom</span>
                                  <span className="text-[#5c5e66]"> &bull; </span>
                                  <span className="text-[#00b0f4]">DexScreener</span>
                                  <span className="text-[#5c5e66]"> &bull; </span>
                                  <span className="text-[#00b0f4]">Solscan</span>
                                  <span className="text-[#5c5e66]"> &bull; </span>
                                  <span className="text-[#00b0f4]">SolTools</span>
                                </p>
                              </div>
                            </div>

                            {/* Thumbnail */}
                            <div className="flex-shrink-0 hidden sm:block">
                              <img src="https://cdn.dexscreener.com/cms/images/91da26a8f6bb6493c28e76be1d9f1b952fc00a3ff9f20c0f20d42a85bbb166f1?width=128&height=128&quality=90" alt="Punch" className="w-16 h-16 rounded-lg object-cover" />
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="mt-2 pt-2 border-t border-[#3a3c41] flex items-center gap-1.5">
                            <span className="text-[#72767d] text-[10px]">STB &bull; soltools.net</span>
                            <span className="text-[#72767d] text-[10px]">&bull;</span>
                            <span className="text-[#72767d] text-[10px]">Today at 4:20 PM</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview 2: /dev */}
              <div className="bg-[#1e1f22] rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-[#1a1b1e] flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#80848e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  <span className="text-[#80848e] text-[13px] font-medium">token-calls</span>
                </div>

                <div className="px-4 py-4 space-y-4">
                  {/* User command */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#ed4245] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">W</div>
                    <div className="min-w-0 pt-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[#ed4245] text-[13px] font-semibold">whale_watcher</span>
                        <span className="text-[#5c5e66] text-[11px]">Today at 4:21 PM</span>
                      </div>
                      <p className="text-[#dcddde] text-[13px] mt-0.5"><span className="text-[#00b0f4]">/dev</span> <span className="bg-[#2b2d31] text-[#b5bac1] px-1 py-0.5 rounded text-[12px] font-mono">NV2RYH...pump</span></p>
                    </div>
                  </div>

                  {/* Bot response */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      <SolToolsBadge />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-white text-[13px] font-semibold">SolToolsBot</span>
                        <span className="bg-[#5865F2] text-white text-[8px] px-1 py-0.5 rounded font-semibold leading-none">BOT</span>
                        <span className="text-[#5c5e66] text-[11px]">Today at 4:21 PM</span>
                      </div>

                      {/* Embed */}
                      <div className="bg-[#2b2d31] border-l-[4px] border-[#ff6b35] rounded-r overflow-hidden max-w-[420px]">
                        <div className="p-3">
                          {/* Author */}
                          <p className="text-[#b5bac1] text-[11px] font-semibold mb-1.5">STB &bull; Dev Checker</p>

                          <div className="flex gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Title */}
                              <p className="text-white text-[15px] font-bold mb-2">{'\u30d1\u30f3\u30c1'} ($Punch)</p>

                              {/* Creator */}
                              <p className="text-[#b5bac1] text-[12px] font-semibold mb-0.5">🔧 Creator</p>
                              <div className="bg-[#1e1f22] border-l-[3px] border-[#4f545c] rounded-r px-2 py-1 mb-3">
                                <p className="text-[#00b0f4] text-[11px] font-mono">7xK2mR9...v4fRq</p>
                              </div>

                              <Sep />

                              {/* Other launches */}
                              <p className="text-[#b5bac1] text-[12px] font-semibold mb-1.5">📋 Other Launches (3 found)</p>
                              <div className="space-y-1 text-[11.5px] font-mono mb-1">
                                <p><span className="text-[#b5bac1]">1.</span> <span className="text-[#00b0f4] font-bold">QuantumCat</span> <span className="text-[#b5bac1]">($QCAT)</span> <span className="text-[#5c5e66]">&bull;</span> <span className="text-[#b5bac1]">FDV:</span> <span className="text-white bg-[#1e1f22] rounded px-1 py-0.5">$1.24M</span></p>
                                <p><span className="text-[#b5bac1]">2.</span> <span className="text-[#00b0f4] font-bold">MoonDust</span> <span className="text-[#b5bac1]">($MDUST)</span> <span className="text-[#5c5e66]">&bull;</span> <span className="text-[#b5bac1]">FDV:</span> <span className="text-white bg-[#1e1f22] rounded px-1 py-0.5">$8.41K</span></p>
                                <p><span className="text-[#b5bac1]">3.</span> <span className="text-[#00b0f4] font-bold">Elon2024</span> <span className="text-[#b5bac1]">($ELON24)</span> <span className="text-[#5c5e66]">&bull;</span> <span className="text-[#b5bac1]">FDV:</span> <span className="text-white bg-[#1e1f22] rounded px-1 py-0.5">N/A</span></p>
                              </div>

                              <Sep />

                              {/* Links */}
                              <p className="text-[11px] mt-1">
                                <span className="text-[#00b0f4]">Pump.fun</span>
                                <span className="text-[#5c5e66]"> &bull; </span>
                                <span className="text-[#00b0f4]">Axiom</span>
                                <span className="text-[#5c5e66]"> &bull; </span>
                                <span className="text-[#00b0f4]">DexScreener</span>
                                <span className="text-[#5c5e66]"> &bull; </span>
                                <span className="text-[#00b0f4]">Solscan</span>
                                <span className="text-[#5c5e66]"> &bull; </span>
                                <span className="text-[#00b0f4]">SolTools</span>
                              </p>
                            </div>

                            {/* Thumbnail */}
                            <div className="flex-shrink-0 hidden sm:block">
                              <img src="https://cdn.dexscreener.com/cms/images/91da26a8f6bb6493c28e76be1d9f1b952fc00a3ff9f20c0f20d42a85bbb166f1?width=128&height=128&quality=90" alt="Punch" className="w-16 h-16 rounded-lg object-cover" />
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="mt-2 pt-2 border-t border-[#3a3c41] flex items-center gap-1.5">
                            <span className="text-[#72767d] text-[10px]">STB &bull; soltools.net</span>
                            <span className="text-[#72767d] text-[10px]">&bull;</span>
                            <span className="text-[#72767d] text-[10px]">Today at 4:21 PM</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Bottom CTA */}
          <section className="pb-8">
            <div className="relative rounded-2xl border border-[#5865F2]/15 bg-gradient-to-br from-[#5865F2]/[0.05] to-transparent p-10 sm:p-14 text-center overflow-hidden">
              <div className="shimmer absolute inset-0 pointer-events-none opacity-50" />
              <div className="relative z-10">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">Ready to level up your server?</h2>
                <p className="text-gray-500 text-[13px] sm:text-sm mb-8 max-w-md mx-auto">No premium tiers, no paywalls. Just add and go.</p>
                <a
                  href="https://discord.com/oauth2/authorize?client_id=1474858597438455910"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-[#5865F2] text-white font-semibold text-sm hover:bg-[#4752C4] hover:shadow-[0_0_30px_rgba(88,101,242,0.25)] active:scale-[0.98] transition-all duration-200"
                >
                  <DiscordIcon className="w-5 h-5" />
                  Add to Discord
                </a>
              </div>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
