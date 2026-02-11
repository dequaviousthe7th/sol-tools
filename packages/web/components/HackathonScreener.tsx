'use client';

import { useState, useEffect, useMemo } from 'react';
import { TokenCard, TokenCardData } from './TokenCard';
import { SubmitTokenModal } from './SubmitTokenModal';

type SortKey = 'marketCap' | 'priceUsd' | 'priceChange24h' | 'volume24h' | 'liquidity';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'marketCap', label: 'Market Cap' },
  { value: 'volume24h', label: 'Volume' },
  { value: 'priceChange24h', label: '24h Change' },
  { value: 'liquidity', label: 'Liquidity' },
  { value: 'priceUsd', label: 'Price' },
];

const DEADLINE = new Date('2026-02-18T00:00:00Z').getTime();

function useCountdown(target: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { days, hours, minutes, seconds, expired: diff === 0 };
}

const INITIAL_MINTS = [
  '6CRayr4GnspC1GUDLs693oPk7AoDSXLXSx9kskgupump',
  '2PzS5SYYWjUFvzXNFaMmRkpjkxGX6R5v8DnKYtdcpump',
  '2FQK7ZE2DpWy4e3BLpJas5VtBozsWgsoDRLeA8mvpump',
  'FyPDfX92B4uEk4zZouy96d1Kk1LgnCznBpzAFSsZpump',
  'B1rGc4HM4Q6q4nU78ADM7fGguxqiasH53fh6ViDXpump',
  'DNhQZ1CE9qZ2FNrVhsCXwQJ2vZG8ufZkcYakTS5Jpump',
  '2LzLh5pHg3nDQz6goTLAvDXfDbSBgAR8qem3bdXdpump',
  'CASHiSiReNKnoKghZqzASoPe8RiH2D3ntr52WfLhon8A',
  '84nGjHwSScH1wVHzQWgK6EzNmTX9FwPNdY3BQBZjpump',
  'H5b4iYiZYycr7fmQ1dMj7hdfLGAEPcDH261K4hugpump',
  '8SePknMizxUWZFnyHcNLXy6wiqEWUKG1kgV9Z6N7BS6a',
  'DK9nBUMfdu4XprPRWeh8f6KnQiGWD8Z4xz3yzs9gpump',
  '5wVtfsFhLjxm27K9mN3ziYWCCpQwXXq7HWUiRMW7pump',
];

interface DexPair {
  baseToken: { address: string; name: string; symbol: string };
  priceUsd: string;
  priceChange: { h24: number };
  marketCap: number;
  volume: { h24: number };
  liquidity: { usd: number };
  url: string;
  info?: {
    imageUrl?: string;
    socials?: Array<{ type: string; url: string }>;
    websites?: Array<{ url: string }>;
  };
}

function parseDexPairs(pairs: DexPair[], mints: string[]): TokenCardData[] {
  const best = new Map<string, DexPair>();
  for (const pair of pairs) {
    const addr = pair.baseToken.address;
    const existing = best.get(addr);
    if (!existing || (pair.liquidity?.usd || 0) > (existing.liquidity?.usd || 0)) {
      best.set(addr, pair);
    }
  }
  return mints.map(mint => {
    const pair = best.get(mint);
    if (!pair) {
      return {
        address: mint, name: mint.slice(0, 6) + '...', symbol: '???',
        imageUrl: null, priceUsd: 0, priceChange24h: 0, marketCap: 0,
        volume24h: 0, liquidity: 0, pairUrl: '', pumpFunUrl: `https://pump.fun/coin/${mint}`,
        twitterUrl: null, websiteUrl: null, telegramUrl: null,
      };
    }
    const socials = pair.info?.socials || [];
    return {
      address: mint,
      name: pair.baseToken.name,
      symbol: pair.baseToken.symbol,
      imageUrl: pair.info?.imageUrl || null,
      priceUsd: parseFloat(pair.priceUsd) || 0,
      priceChange24h: pair.priceChange?.h24 || 0,
      marketCap: pair.marketCap || 0,
      volume24h: pair.volume?.h24 || 0,
      liquidity: pair.liquidity?.usd || 0,
      pairUrl: pair.url || '',
      pumpFunUrl: `https://pump.fun/coin/${mint}`,
      twitterUrl: socials.find(s => s.type === 'twitter')?.url || null,
      websiteUrl: (pair.info?.websites || [])[0]?.url || null,
      telegramUrl: socials.find(s => s.type === 'telegram')?.url || null,
    };
  });
}

export const HackathonScreener = () => {
  const [tokens, setTokens] = useState<TokenCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('marketCap');
  const [submitOpen, setSubmitOpen] = useState(false);
  const countdown = useCountdown(DEADLINE);

  const fetchTokens = async () => {
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;

    // Try worker first
    if (workerUrl) {
      try {
        const res = await fetch(`${workerUrl}/api/hackathon/tokens`);
        if (res.ok) {
          const data = await res.json() as { tokens: TokenCardData[] };
          setTokens(data.tokens);
          setError('');
          setLoading(false);
          return;
        }
      } catch {
        // Worker unavailable, fall through to direct fetch
      }
    }

    // Direct DexScreener fallback
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${INITIAL_MINTS.join(',')}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { pairs: DexPair[] | null };
      setTokens(parseDexPairs(data.pairs || [], INITIAL_MINTS));
      setError('');
    } catch {
      if (tokens.length === 0) setError('Failed to load token data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
    const id = setInterval(fetchTokens, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = tokens;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => b[sortBy] - a[sortBy]);
  }, [tokens, search, sortBy]);

  return (
    <div>
      {/* Banner */}
      <div className="card mb-4 overflow-hidden">
        <div className="h-[2px] w-full bg-gradient-to-r from-solana-purple to-solana-green" />
        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-white font-bold text-base sm:text-lg">PumpFun "Build in Public" Hackathon</h2>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">$3M fund &middot; 12 projects &middot; $250k each @ $10M valuation</p>
            </div>
            <div className="flex items-center gap-3 text-center">
              {countdown.expired ? (
                <span className="text-red-400 font-semibold text-sm">Deadline passed</span>
              ) : (
                <>
                  <div>
                    <p className="text-white font-bold text-lg leading-none">{countdown.days}</p>
                    <p className="text-gray-500 text-[10px] uppercase">Days</p>
                  </div>
                  <span className="text-gray-600">:</span>
                  <div>
                    <p className="text-white font-bold text-lg leading-none">{String(countdown.hours).padStart(2, '0')}</p>
                    <p className="text-gray-500 text-[10px] uppercase">Hrs</p>
                  </div>
                  <span className="text-gray-600">:</span>
                  <div>
                    <p className="text-white font-bold text-lg leading-none">{String(countdown.minutes).padStart(2, '0')}</p>
                    <p className="text-gray-500 text-[10px] uppercase">Min</p>
                  </div>
                  <span className="text-gray-600">:</span>
                  <div>
                    <p className="text-white font-bold text-lg leading-none">{String(countdown.seconds).padStart(2, '0')}</p>
                    <p className="text-gray-500 text-[10px] uppercase">Sec</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tokens..."
            className="w-full bg-[#111113] border border-[#222228] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-solana-green/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Sort */}
        <div className="relative min-w-[150px]">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="w-full appearance-none bg-[#111113] border border-[#222228] rounded-xl px-4 pr-9 py-2.5 text-sm text-white focus:border-solana-green/50 focus:outline-none transition-colors cursor-pointer"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Submit button */}
        <button
          onClick={() => setSubmitOpen(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-solana-purple to-solana-green text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 hover:opacity-90 hover:scale-[1.01] active:scale-[0.98] whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Submit Token
        </button>
      </div>

      {/* Error state */}
      {error && !loading && tokens.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchTokens(); }}
            className="text-solana-purple text-sm hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && tokens.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="h-[2px] w-full bg-gradient-to-r from-solana-purple/30 to-solana-green/30" />
              <div className="p-4 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#222228]" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-[#222228] rounded" />
                    <div className="h-3 w-16 bg-[#222228] rounded mt-1.5" />
                  </div>
                  <div className="text-right">
                    <div className="h-4 w-16 bg-[#222228] rounded" />
                    <div className="h-3 w-12 bg-[#222228] rounded mt-1.5 ml-auto" />
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="h-3 w-16 bg-[#222228] rounded" />
                  <div className="h-3 w-16 bg-[#222228] rounded" />
                  <div className="h-3 w-16 bg-[#222228] rounded" />
                </div>
                <div className="border-t border-[#222228]" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-[#222228] rounded-lg" />
                  <div className="h-6 w-20 bg-[#222228] rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Token grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(token => (
            <TokenCard key={token.address} token={token} />
          ))}
        </div>
      )}

      {/* No results */}
      {!loading && tokens.length > 0 && filtered.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-gray-400 text-sm">No tokens match your search.</p>
        </div>
      )}

      {/* Token count */}
      {!loading && tokens.length > 0 && (
        <p className="text-center text-gray-600 text-xs mt-4">
          Showing {filtered.length} of {tokens.length} tokens &middot; Updates every 60s
        </p>
      )}

      <SubmitTokenModal open={submitOpen} onClose={() => setSubmitOpen(false)} />
    </div>
  );
};
