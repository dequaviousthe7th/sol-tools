'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { SOLT_CA } from '@/components/CopyCA';

const TradingChart = dynamic(() => import('./TradingChart'), { ssr: false });

const ACTIVE_MINT = SOLT_CA;

interface TopTrader {
  wallet: string;
  pnl: number;
  bought: number;
  sold: number;
  holding: boolean;
  buys: number;
  sells: number;
}

interface TokenData {
  price: number | null;
  marketCap: number | null;
  volume24h: number | null;
  liquidity: number | null;
}

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

type ChartCandle = { time: number; open: number; high: number; low: number; close: number };

export default function SoltLiveData() {
  const [chartData, setChartData] = useState<ChartCandle[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [topTraders, setTopTraders] = useState<TopTrader[]>([]);
  const [tradersLoading, setTradersLoading] = useState(true);
  const [traderPage, setTraderPage] = useState(1);
  const [traderPageSize, setTraderPageSize] = useState(5);

  // Convert price OHLC to market cap OHLC using supply = mcap / price
  const mcapChartData = useMemo(() => {
    if (!tokenData || !tokenData.marketCap || !tokenData.price || tokenData.price <= 0 || chartData.length === 0) {
      return chartData;
    }
    const supply = tokenData.marketCap / tokenData.price;
    return chartData.map(d => ({
      time: d.time,
      open: d.open * supply,
      high: d.high * supply,
      low: d.low * supply,
      close: d.close * supply,
    }));
  }, [chartData, tokenData]);

  const fetchData = useCallback(() => {
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
    if (!workerUrl) return;

    fetch(`${workerUrl}/api/token-chart?mint=${ACTIVE_MINT}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: ChartCandle[] | null) => {
        if (Array.isArray(d) && d.length > 0) setChartData(d);
      })
      .catch(() => {})
      .finally(() => setChartLoading(false));

    fetch(`${workerUrl}/api/token-scan?mint=${ACTIVE_MINT}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: TokenData | null) => {
        if (d && d.price) setTokenData(d);
      })
      .catch(() => {});

    fetch(`${workerUrl}/api/top-traders?mint=${ACTIVE_MINT}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: TopTrader[] | null) => {
        if (Array.isArray(d)) setTopTraders(d);
      })
      .catch(() => {})
      .finally(() => setTradersLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(topTraders.length / traderPageSize));

  return (
    <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 mb-14 sm:mb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Market Cap Chart + Stats */}
        <div className="min-w-0 flex flex-col gap-3">
          <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-2xl overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-[#1a1a1f] flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <h3 className="text-white text-sm font-semibold">Market Cap</h3>
              <span className="px-1.5 py-0.5 rounded-md bg-solana-green/15 text-solana-green text-[10px] font-bold">LIVE</span>
            </div>
            {(chartLoading || chartData.length > 0) ? (
              <TradingChart
                type="candlestick"
                data={mcapChartData}
                height={280}
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
            ) : (
              <div className="flex items-center justify-center py-16">
                <p className="text-gray-600 text-xs">No chart data available yet</p>
              </div>
            )}
          </div>

          {/* Stat cards under chart */}
          {tokenData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(() => {
                const latestCandle = chartData.length > 0 ? chartData[chartData.length - 1] : null;
                const latestMcap = mcapChartData.length > 0 ? mcapChartData[mcapChartData.length - 1] : null;
                const displayPrice = latestCandle ? latestCandle.close : tokenData.price;
                const displayMcap = latestMcap ? latestMcap.close : tokenData.marketCap;
                return [
                  { label: 'Price', value: formatPrice(displayPrice), icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                  { label: 'Market Cap', value: formatNumber(displayMcap), icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                  { label: 'Vol 24h', value: formatNumber(tokenData.volume24h), icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
                  { label: 'Liquidity', value: formatNumber(tokenData.liquidity), icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
                ].map(stat => (
                  <div key={stat.label} className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-xl p-3 group hover:border-cyan-500/20 transition-all duration-300">
                    <div className="flex items-center gap-1.5 mb-1">
                      <svg className="w-3 h-3 text-gray-600 group-hover:text-cyan-400/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                      </svg>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider font-medium">{stat.label}</p>
                    </div>
                    <p className="text-white text-sm font-semibold">{stat.value}</p>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Top Traders */}
        <div className="min-w-0">
          <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-2xl overflow-hidden h-full flex flex-col">
            <div className="px-5 sm:px-6 py-4 border-b border-[#1a1a1f] flex items-center gap-2">
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
              <div className="flex-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#1a1a1f]/40">
                    <div className="w-5 h-4 bg-[#1a1a1f] rounded shimmer" />
                    <div className="h-3 w-24 bg-[#1a1a1f] rounded shimmer" />
                    <div className="flex-1" />
                    <div className="h-3 w-16 bg-[#1a1a1f] rounded shimmer" />
                    <div className="h-3 w-14 bg-[#1a1a1f] rounded shimmer" />
                    <div className="hidden lg:block h-3 w-12 bg-[#1a1a1f] rounded shimmer" />
                  </div>
                ))}
              </div>
            ) : topTraders.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <p className="text-gray-600 text-xs">No trader data available yet</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1a1a1f]">
                        <th className="px-3 lg:px-4 py-3 text-left">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500">#</span>
                        </th>
                        <th className="px-3 lg:px-4 py-3 text-left">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500">Wallet</span>
                        </th>
                        <th className="px-3 lg:px-4 py-3 text-right">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500">Bought</span>
                        </th>
                        <th className="px-3 lg:px-4 py-3 text-right">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500">PnL</span>
                        </th>
                        <th className="px-3 lg:px-4 py-3 text-right">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500">Buys/Sells</span>
                        </th>
                        <th className="px-3 lg:px-4 py-3 text-right">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500">Status</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topTraders
                        .slice((traderPage - 1) * traderPageSize, traderPage * traderPageSize)
                        .map((trader, i) => (
                        <tr key={trader.wallet} className="border-b border-[#1a1a1f]/40 hover:bg-white/[0.02] transition-colors">
                          <td className="px-3 lg:px-4 py-3">
                            <span className="text-gray-600 text-xs font-mono">{(traderPage - 1) * traderPageSize + i + 1}</span>
                          </td>
                          <td className="px-3 lg:px-4 py-3">
                            <a
                              href={`/xray?wallet=${trader.wallet}`}
                              className="text-cyan-400 hover:text-cyan-300 text-xs font-mono transition-colors"
                            >
                              {truncateAddress(trader.wallet)}
                            </a>
                          </td>
                          <td className="px-3 lg:px-4 py-3 text-right">
                            <span className="text-gray-300 text-xs">{formatNumber(trader.bought)}</span>
                          </td>
                          <td className="px-3 lg:px-4 py-3 text-right">
                            <span className={`text-xs font-medium ${pnlColor(trader.pnl)}`}>
                              {formatPnlUsd(trader.pnl)}
                            </span>
                          </td>
                          <td className="px-3 lg:px-4 py-3 text-right">
                            <span className="text-xs">
                              <span className="text-green-400/70">{trader.buys}</span>
                              <span className="text-gray-600 mx-0.5">/</span>
                              <span className="text-red-400/70">{trader.sells}</span>
                            </span>
                          </td>
                          <td className="px-3 lg:px-4 py-3 text-right">
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

                {topTraders.length > 5 && (
                  <div className="px-5 sm:px-6 py-3 border-t border-[#1a1a1f] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">Show</span>
                      <select
                        value={traderPageSize}
                        onChange={e => { setTraderPageSize(Number(e.target.value)); setTraderPage(1); }}
                        className="bg-[#111113] border border-[#1a1a1f] rounded-lg text-xs text-gray-400 px-2 py-1.5 focus:outline-none focus:border-cyan-500/50"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                    <span className="text-gray-400 text-xs tabular-nums">
                      Page {traderPage} of {totalPages}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setTraderPage(p => Math.max(1, p - 1))}
                        disabled={traderPage <= 1}
                        className="px-3 py-1.5 border border-[#1a1a1f] rounded-lg text-xs text-gray-400 hover:text-white hover:border-cyan-500/30 hover:bg-cyan-500/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setTraderPage(p => Math.min(totalPages, p + 1))}
                        disabled={traderPage >= totalPages}
                        className="px-3 py-1.5 border border-[#1a1a1f] rounded-lg text-xs text-gray-400 hover:text-white hover:border-cyan-500/30 hover:bg-cyan-500/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
