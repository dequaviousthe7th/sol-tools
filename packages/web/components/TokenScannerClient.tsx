'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const TradingChart = dynamic(() => import('./TradingChart'), { ssr: false });

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TokenScanResult {
  mint: string;
  name: string | null;
  symbol: string | null;
  imageUrl: string | null;
  riskScore: number | null;
  riskLevel: string | null;
  risks: Array<{ name: string; description: string; level: string; score: number }>;
  price: number | null;
  marketCap: number | null;
  volume24h: number | null;
  liquidity: number | null;
  lpLockedPct: number | null;
  tokenAge: string | null;
  pairUrl: string | null;
  mintAuthority: boolean | null;
  freezeAuthority: boolean | null;
  topHolderPct: number | null;
  socials: { twitter: string | null; website: string | null; telegram: string | null };
}

interface TopTrader {
  wallet: string;
  pnl: number;
  bought: number;
  sold: number;
  holding: boolean;
  buys: number;
  sells: number;
}

type State = 'idle' | 'loading' | 'results' | 'error';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const isValidBase58 = (str: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(str);

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return '\u2014';
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  if (n < 0.01 && n > 0) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(2)}`;
}

function formatPrice(n: number | null): string {
  if (n === null || n === undefined) return '\u2014';
  if (n < 0.000001) return `$${n.toExponential(2)}`;
  if (n < 0.01) return `$${n.toFixed(6)}`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function formatPnlUsd(n: number): string {
  const abs = Math.abs(n);
  const sign = n >= 0 ? '+' : '-';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function pnlColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-gray-400';
}

function riskScoreColor(score: number | null): string {
  if (score === null) return 'bg-gray-600/80 text-gray-200';
  if (score <= 300) return 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30';
  if (score <= 700) return 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30';
  return 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30';
}

function riskGradientBar(score: number | null): string {
  if (score === null) return 'from-gray-600 to-gray-700';
  if (score <= 300) return 'from-green-500 to-emerald-500';
  if (score <= 700) return 'from-yellow-500 to-amber-500';
  return 'from-red-500 to-rose-600';
}

function riskLevelColor(level: string | null): string {
  if (!level) return 'text-gray-400';
  const l = level.toLowerCase();
  if (l === 'good' || l === 'low') return 'text-green-400';
  if (l === 'warn' || l === 'medium') return 'text-yellow-400';
  return 'text-red-400';
}

function severityBorder(level: string): string {
  const l = level.toLowerCase();
  if (l === 'danger' || l === 'high' || l === 'critical') return 'border-l-red-500';
  if (l === 'warn' || l === 'warning' || l === 'medium') return 'border-l-yellow-500';
  return 'border-l-gray-600';
}

function severityDot(level: string): string {
  const l = level.toLowerCase();
  if (l === 'danger' || l === 'high' || l === 'critical') return 'bg-red-500';
  if (l === 'warn' || l === 'warning' || l === 'medium') return 'bg-yellow-500';
  return 'bg-gray-500';
}

/* ------------------------------------------------------------------ */
/*  SVG Icons (inline for zero-dep)                                    */
/* ------------------------------------------------------------------ */

const ShieldIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const SearchIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const WarningIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const ExternalLinkIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const CheckCircleIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CopyIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ArrowLeftIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TokenScannerClient() {
  const [state, setState] = useState<State>('idle');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<TokenScanResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [chartData, setChartData] = useState<{time:number;open:number;high:number;low:number;close:number}[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [topTraders, setTopTraders] = useState<TopTrader[]>([]);
  const [tradersLoading, setTradersLoading] = useState(false);
  const chartMintRef = useRef<string | null>(null);

  // Auto-refresh chart data every 30s when viewing results
  useEffect(() => {
    if (state !== 'results' || !chartMintRef.current) return;
    const mint = chartMintRef.current;
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
    if (!workerUrl) return;

    const interval = setInterval(() => {
      fetch(`${workerUrl}/api/token-chart?mint=${mint}`)
        .then(r => r.ok ? r.json() : null)
        .then((d: Array<{time:number;open:number;high:number;low:number;close:number}> | null) => {
          if (Array.isArray(d) && d.length > 0) {
            setChartData(d);
          }
        })
        .catch(() => {});
    }, 30_000);

    return () => clearInterval(interval);
  }, [state]);

  const scan = useCallback(async () => {
    const mint = input.trim();
    if (!isValidBase58(mint)) return;

    setState('loading');
    setError('');
    setChartData([]);
    setChartLoading(true);
    setTopTraders([]);
    setTradersLoading(true);
    chartMintRef.current = mint;

    try {
      const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
      if (!workerUrl) throw new Error('API not configured');

      // Fire chart + top traders in parallel (non-blocking)
      fetch(`${workerUrl}/api/token-chart?mint=${mint}`)
        .then(r => r.ok ? r.json() : null)
        .then((d: Array<{time:number;open:number;high:number;low:number;close:number}> | null) => {
          if (Array.isArray(d) && d.length > 0) {
            setChartData(d);
          }
        })
        .catch(() => {})
        .finally(() => setChartLoading(false));

      fetch(`${workerUrl}/api/top-traders?mint=${mint}`)
        .then(r => r.ok ? r.json() : null)
        .then((d: TopTrader[] | null) => {
          if (Array.isArray(d)) {
            setTopTraders(d);
          }
        })
        .catch(() => {})
        .finally(() => setTradersLoading(false));

      const res = await fetch(`${workerUrl}/api/token-scan?mint=${mint}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error((data as { error?: string }).error || `Error ${res.status}`);
      }

      const data = await res.json() as TokenScanResult;
      setResult(data);
      setState('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setState('error');
    }
  }, [input]);

  const reset = () => {
    setState('idle');
    setInput('');
    setResult(null);
    setError('');
    setChartData([]);
    setChartLoading(false);
    setTopTraders([]);
    setTradersLoading(false);
    chartMintRef.current = null;
  };

  const copyMint = useCallback(async (mint: string) => {
    try {
      await navigator.clipboard.writeText(mint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  IDLE STATE                                                       */
  /* ---------------------------------------------------------------- */

  if (state === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-10 sm:py-16">
        {/* Animated shield */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-xl scale-150 animate-pulse" />
          <div className="float relative w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 flex items-center justify-center border border-cyan-500/20 pulse-glow" style={{ '--tw-shadow-color': 'rgba(6, 182, 212, 0.3)', boxShadow: '0 0 20px rgba(6, 182, 212, 0.15), 0 0 40px rgba(6, 182, 212, 0.08)' } as React.CSSProperties}>
            <ShieldIcon className="w-10 h-10 text-cyan-400" />
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-gray-400 text-sm sm:text-base mb-8 text-center max-w-md leading-relaxed">
          Get an instant safety report on any Solana token. Detect rug pulls, honeypots, and suspicious activity before you ape in.
        </p>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mb-8">
          {/* Risk Analysis */}
          <div className="card card-hover p-4 text-center group">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-red-500/15 transition-colors">
              <WarningIcon className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-white text-sm font-semibold mb-1">Risk Analysis</h3>
            <p className="text-gray-500 text-xs leading-relaxed">Checks RugCheck for scam signals and rug pull patterns</p>
          </div>

          {/* Market Data */}
          <div className="card card-hover p-4 text-center group">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-cyan-500/15 transition-colors">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <h3 className="text-white text-sm font-semibold mb-1">Market Data</h3>
            <p className="text-gray-500 text-xs leading-relaxed">Live price, market cap, volume, and liquidity depth</p>
          </div>

          {/* Security Audit */}
          <div className="card card-hover p-4 text-center group">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-green-500/15 transition-colors">
              <ShieldIcon className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-white text-sm font-semibold mb-1">Security Audit</h3>
            <p className="text-gray-500 text-xs leading-relaxed">Mint/freeze authority, holder concentration checks</p>
          </div>
        </div>

        {/* Input field */}
        <div className="w-full max-w-xl">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && isValidBase58(input.trim()) && scan()}
                placeholder="Enter token mint address..."
                className="w-full bg-[#111113] border border-[#222228] rounded-xl pl-10 pr-4 py-3.5 text-sm text-white font-mono placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <button
              onClick={scan}
              disabled={!isValidBase58(input.trim())}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-[0.98] transition-all"
            >
              Scan
            </button>
          </div>
          <p className="text-gray-600 text-[11px] text-center mt-3">
            Powered by RugCheck, DexScreener, GoPlus
          </p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  LOADING STATE                                                    */
  /* ---------------------------------------------------------------- */

  if (state === 'loading') {
    return (
      <div className="py-10 sm:py-16">
        {/* Skeleton feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mx-auto mb-10">
          {[0, 1, 2].map(i => (
            <div key={i} className="card p-4 overflow-hidden" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-[#1a1a1e] shimmer mb-3" />
                <div className="h-3 w-20 rounded-full bg-[#1a1a1e] shimmer mb-2" />
                <div className="h-2 w-32 rounded-full bg-[#1a1a1e] shimmer" />
              </div>
            </div>
          ))}
        </div>

        {/* Spinner section */}
        <div className="flex flex-col items-center">
          <div className="relative mb-5">
            <div className="w-14 h-14 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ShieldIcon className="w-6 h-6 text-cyan-400/60" />
            </div>
          </div>
          <p className="text-gray-300 text-sm font-medium mb-1">Scanning token...</p>
          <p className="text-gray-600 text-xs font-mono">{truncateAddress(input.trim())}</p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  ERROR STATE                                                      */
  /* ---------------------------------------------------------------- */

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16">
        <div className="card overflow-hidden max-w-md w-full">
          {/* Red accent bar */}
          <div className="h-1 bg-gradient-to-r from-red-500 to-rose-600" />

          <div className="p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <XCircleIcon className="w-7 h-7 text-red-400" />
            </div>

            <h3 className="text-white font-semibold mb-2">Scan Failed</h3>
            <p className="text-red-400 text-sm mb-6">{error}</p>

            <button
              onClick={() => { setState('idle'); setError(''); }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Try Again
            </button>

            <p className="text-gray-600 text-xs mt-4 leading-relaxed">
              Need help? Make sure you&apos;re using a valid Solana token mint address.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  RESULTS STATE                                                    */
  /* ---------------------------------------------------------------- */

  if (!result) return null;

  return (
    <div className="space-y-4 pb-6">

      {/* ===== TOKEN HEADER CARD ===== */}
      <div className="card overflow-hidden">
        {/* Gradient accent bar */}
        <div className={`h-1 bg-gradient-to-r ${riskGradientBar(result.riskScore)}`} />

        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Token image */}
            {result.imageUrl ? (
              <img
                src={result.imageUrl}
                alt=""
                className="w-12 h-12 rounded-xl flex-shrink-0 bg-[#1a1a1e]"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a1a1e] to-[#111113] flex items-center justify-center flex-shrink-0 border border-[#222228]">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            )}

            {/* Name + mint */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-white font-bold text-lg leading-tight truncate">
                  {result.name || 'Unknown Token'}
                </h2>
                {result.symbol && (
                  <span className="text-gray-500 text-sm font-medium">${result.symbol}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-gray-600 text-xs font-mono truncate">{truncateAddress(result.mint)}</p>
                <button
                  onClick={() => copyMint(result.mint)}
                  className="text-gray-600 hover:text-cyan-400 transition-colors flex-shrink-0"
                  title="Copy address"
                >
                  {copied ? (
                    <CheckCircleIcon className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <CopyIcon className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Risk score pill */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {result.riskScore !== null ? (
                <>
                  <div className={`px-3.5 py-1.5 rounded-lg text-lg font-bold tabular-nums ${riskScoreColor(result.riskScore)}`}>
                    {result.riskScore}
                  </div>
                  {result.riskLevel && (
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${riskLevelColor(result.riskLevel)}`}>
                      {result.riskLevel}
                    </span>
                  )}
                </>
              ) : (
                <div className="px-3.5 py-1.5 rounded-lg text-lg font-bold bg-gray-700/30 text-gray-500 ring-1 ring-gray-600/30">
                  N/A
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== PRICE CHART ===== */}
      {(chartLoading || chartData.length > 0) && (
        <TradingChart
          type="candlestick"
          data={chartData}
          height={250}
          mobileHeight={200}
          color="cyan"
          loading={chartLoading}
          ranges={[
            { label: '1H', seconds: 3600 },
            { label: '4H', seconds: 14400 },
            { label: '1D', seconds: 86400 },
            { label: '7D', seconds: 604800 },
          ]}
        />
      )}

      {/* ===== MARKET DATA SECTION ===== */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <h3 className="text-white text-sm font-semibold">Market Data</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Price */}
          <div className="stat-card group hover:border-cyan-500/20 transition-colors">
            <div className="flex items-center gap-1.5 mb-1.5">
              <svg className="w-3 h-3 text-gray-600 group-hover:text-cyan-400/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider font-medium">Price</p>
            </div>
            <p className="text-white text-sm font-semibold">{formatPrice(result.price)}</p>
          </div>

          {/* Market Cap */}
          <div className="stat-card group hover:border-cyan-500/20 transition-colors">
            <div className="flex items-center gap-1.5 mb-1.5">
              <svg className="w-3 h-3 text-gray-600 group-hover:text-cyan-400/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider font-medium">Market Cap</p>
            </div>
            <p className="text-white text-sm font-semibold">{formatNumber(result.marketCap)}</p>
          </div>

          {/* Volume 24h */}
          <div className="stat-card group hover:border-cyan-500/20 transition-colors">
            <div className="flex items-center gap-1.5 mb-1.5">
              <svg className="w-3 h-3 text-gray-600 group-hover:text-cyan-400/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider font-medium">Volume 24h</p>
            </div>
            <p className="text-white text-sm font-semibold">{formatNumber(result.volume24h)}</p>
          </div>

          {/* Liquidity */}
          <div className="stat-card group hover:border-cyan-500/20 transition-colors">
            <div className="flex items-center gap-1.5 mb-1.5">
              <svg className="w-3 h-3 text-gray-600 group-hover:text-cyan-400/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider font-medium">Liquidity</p>
            </div>
            <p className="text-white text-sm font-semibold">{formatNumber(result.liquidity)}</p>
          </div>

          {/* LP Locked */}
          <div className="stat-card group hover:border-cyan-500/20 transition-colors">
            <div className="flex items-center gap-1.5 mb-1.5">
              <svg className="w-3 h-3 text-gray-600 group-hover:text-cyan-400/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider font-medium">LP Locked</p>
            </div>
            <p className="text-white text-sm font-semibold">
              {result.lpLockedPct !== null ? `${result.lpLockedPct.toFixed(1)}%` : '\u2014'}
            </p>
          </div>

          {/* Token Age */}
          <div className="stat-card group hover:border-cyan-500/20 transition-colors">
            <div className="flex items-center gap-1.5 mb-1.5">
              <svg className="w-3 h-3 text-gray-600 group-hover:text-cyan-400/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider font-medium">Token Age</p>
            </div>
            <p className="text-white text-sm font-semibold">{result.tokenAge || '\u2014'}</p>
          </div>
        </div>
      </div>

      {/* ===== SECURITY AUDIT SECTION ===== */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <ShieldIcon className="w-4 h-4 text-cyan-400" />
          <h3 className="text-white text-sm font-semibold">Security Audit</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Mint Authority */}
          <div className="card p-4 flex items-center gap-3">
            <div className="flex-shrink-0">
              {result.mintAuthority === false ? (
                <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-400" />
                </div>
              ) : result.mintAuthority === true ? (
                <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center">
                  <WarningIcon className="w-5 h-5 text-red-400" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-gray-700/30 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-gray-600" />
                </div>
              )}
            </div>
            <div>
              <p className="text-white text-xs font-semibold">Mint Authority</p>
              <p className={`text-[11px] font-medium ${
                result.mintAuthority === false ? 'text-green-400' :
                result.mintAuthority === true ? 'text-red-400' : 'text-gray-500'
              }`}>
                {result.mintAuthority === false ? 'Disabled' : result.mintAuthority === true ? 'Enabled' : 'Unknown'}
              </p>
            </div>
          </div>

          {/* Freeze Authority */}
          <div className="card p-4 flex items-center gap-3">
            <div className="flex-shrink-0">
              {result.freezeAuthority === false ? (
                <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-400" />
                </div>
              ) : result.freezeAuthority === true ? (
                <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center">
                  <WarningIcon className="w-5 h-5 text-red-400" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-gray-700/30 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-gray-600" />
                </div>
              )}
            </div>
            <div>
              <p className="text-white text-xs font-semibold">Freeze Authority</p>
              <p className={`text-[11px] font-medium ${
                result.freezeAuthority === false ? 'text-green-400' :
                result.freezeAuthority === true ? 'text-red-400' : 'text-gray-500'
              }`}>
                {result.freezeAuthority === false ? 'Disabled' : result.freezeAuthority === true ? 'Enabled' : 'Unknown'}
              </p>
            </div>
          </div>

          {/* Top Holder */}
          <div className="card p-4 flex items-center gap-3">
            <div className="flex-shrink-0">
              {result.topHolderPct !== null ? (
                result.topHolderPct <= 20 ? (
                  <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <WarningIcon className="w-5 h-5 text-yellow-400" />
                  </div>
                )
              ) : (
                <div className="w-9 h-9 rounded-full bg-gray-700/30 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-gray-600" />
                </div>
              )}
            </div>
            <div>
              <p className="text-white text-xs font-semibold">Top Holder</p>
              <p className={`text-[11px] font-medium ${
                result.topHolderPct !== null
                  ? result.topHolderPct <= 20 ? 'text-green-400' : 'text-yellow-400'
                  : 'text-gray-500'
              }`}>
                {result.topHolderPct !== null ? `${result.topHolderPct.toFixed(1)}%` : 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== RISKS SECTION ===== */}
      {result.risks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <WarningIcon className="w-4 h-4 text-yellow-400" />
            <h3 className="text-white text-sm font-semibold">Risk Factors</h3>
            <span className="px-1.5 py-0.5 rounded-md bg-yellow-500/15 text-yellow-400 text-[10px] font-bold tabular-nums">
              {result.risks.length}
            </span>
          </div>

          <div className="space-y-2">
            {result.risks.map((risk, i) => (
              <div
                key={i}
                className={`card p-3.5 border-l-[3px] ${severityBorder(risk.level)} flex items-start gap-3`}
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${severityDot(risk.level)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold">{risk.name}</p>
                  <p className="text-gray-400 text-[11px] leading-relaxed mt-0.5">{risk.description}</p>
                </div>
                {risk.score > 0 && (
                  <span className="text-gray-500 text-[11px] font-mono flex-shrink-0 tabular-nums">
                    {risk.score}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== TOP TRADERS ===== */}
      {(tradersLoading || topTraders.length > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-white text-sm font-semibold">Top Traders</h3>
            {topTraders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 text-[10px] font-bold tabular-nums">
                {topTraders.length}
              </span>
            )}
          </div>

          {tradersLoading ? (
            <div className="card overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[#222228]/40">
                  <div className="w-5 h-4 bg-[#1a1a1e] rounded shimmer" />
                  <div className="h-3 w-24 bg-[#1a1a1e] rounded shimmer" />
                  <div className="flex-1" />
                  <div className="h-3 w-16 bg-[#1a1a1e] rounded shimmer" />
                  <div className="hidden sm:block h-3 w-14 bg-[#1a1a1e] rounded shimmer" />
                  <div className="hidden sm:block h-3 w-12 bg-[#1a1a1e] rounded shimmer" />
                </div>
              ))}
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#222228]">
                      <th className="px-3 sm:px-4 py-3 text-left">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">#</span>
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">Wallet</span>
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-right">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">Bought</span>
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-right">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">PnL</span>
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-right hidden sm:table-cell">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">Buys/Sells</span>
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-right hidden sm:table-cell">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">Status</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTraders.map((trader, i) => (
                      <tr key={trader.wallet} className="border-b border-[#222228]/40 hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 sm:px-4 py-2.5">
                          <span className="text-gray-600 text-xs font-mono">{i + 1}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5">
                          <a
                            href={`/xray?wallet=${trader.wallet}`}
                            className="text-cyan-400 hover:text-cyan-300 text-xs font-mono transition-colors"
                          >
                            {truncateAddress(trader.wallet)}
                          </a>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 text-right">
                          <span className="text-gray-300 text-xs">{formatNumber(trader.bought)}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 text-right">
                          <span className={`text-xs font-medium ${pnlColor(trader.pnl)}`}>
                            {formatPnlUsd(trader.pnl)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 text-right hidden sm:table-cell">
                          <span className="text-xs">
                            <span className="text-green-400/70">{trader.buys}</span>
                            <span className="text-gray-600 mx-0.5">/</span>
                            <span className="text-red-400/70">{trader.sells}</span>
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 text-right hidden sm:table-cell">
                          {trader.holding && (
                            <span className="px-1.5 py-0.5 text-[8px] font-bold bg-amber-500/15 text-amber-400 rounded border border-amber-500/20">
                              HOLD
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== EXTERNAL LINKS ===== */}
      <div>
        <div className="flex flex-wrap gap-2">
          {result.pairUrl && (
            <a
              href={result.pairUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#111113] border border-[#222228] text-xs text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all"
            >
              <ExternalLinkIcon />
              DexScreener
            </a>
          )}
          <a
            href={`https://solscan.io/token/${result.mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#111113] border border-[#222228] text-xs text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all"
          >
            <ExternalLinkIcon />
            Solscan
          </a>
          <a
            href={`https://rugcheck.xyz/tokens/${result.mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#111113] border border-[#222228] text-xs text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all"
          >
            <ExternalLinkIcon />
            RugCheck
          </a>

          {/* Social links */}
          {result.socials.twitter && (
            <a
              href={result.socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#111113] border border-[#222228] text-xs text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Twitter
            </a>
          )}
          {result.socials.website && (
            <a
              href={result.socials.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#111113] border border-[#222228] text-xs text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Website
            </a>
          )}
          {result.socials.telegram && (
            <a
              href={result.socials.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#111113] border border-[#222228] text-xs text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Telegram
            </a>
          )}
        </div>
      </div>

      {/* ===== SCAN ANOTHER BUTTON ===== */}
      <div className="text-center pt-2">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#222228] text-sm text-gray-400 hover:text-white hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all group"
        >
          <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Scan another token
        </button>
      </div>
    </div>
  );
}
