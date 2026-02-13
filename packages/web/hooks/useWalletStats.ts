'use client';

import { useState, useEffect, useCallback } from 'react';

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || '';

export interface ReclaimStats {
  totalSolReclaimed: number;
  totalAccountsClosed: number;
  uses: number;
}

export interface VanityStats {
  purchases: number;
  tokensBought: number;
  tokensUsed: number;
  totalSol: number;
  lastPurchase: number;
  currentBalance: number;
}

const EMPTY_RECLAIM: ReclaimStats = {
  totalSolReclaimed: 0,
  totalAccountsClosed: 0,
  uses: 0,
};

const EMPTY_VANITY: VanityStats = {
  purchases: 0,
  tokensBought: 0,
  tokensUsed: 0,
  totalSol: 0,
  lastPurchase: 0,
  currentBalance: 0,
};

function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout));
}

interface UseWalletStatsOptions {
  reclaim?: boolean;
  vanity?: boolean;
}

interface UseWalletStatsResult {
  reclaimStats: ReclaimStats | null;
  vanityStats: VanityStats | null;
  loading: boolean;
  refresh: () => void;
}

export function useWalletStats(
  publicKey: string | null,
  options: UseWalletStatsOptions = { reclaim: true, vanity: true }
): UseWalletStatsResult {
  const [reclaimStats, setReclaimStats] = useState<ReclaimStats | null>(null);
  const [vanityStats, setVanityStats] = useState<VanityStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!publicKey) {
      setReclaimStats(null);
      setVanityStats(null);
      return;
    }

    // No worker URL — show empty stats (no fake data)
    if (!WORKER_URL) {
      if (options.reclaim) setReclaimStats(EMPTY_RECLAIM);
      if (options.vanity) setVanityStats(EMPTY_VANITY);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetches: Promise<void>[] = [];

    if (options.reclaim) {
      fetches.push(
        fetchWithTimeout(`${WORKER_URL}/api/stats/wallet?wallet=${publicKey}`)
          .then(res => { if (!res.ok) throw new Error('not ok'); return res.json(); })
          .then((data: ReclaimStats) => { if (!cancelled) setReclaimStats(data); })
          .catch(() => { if (!cancelled) setReclaimStats(EMPTY_RECLAIM); })
      );
    }

    if (options.vanity) {
      fetches.push(
        fetchWithTimeout(`${WORKER_URL}/api/vanity/stats?wallet=${publicKey}`)
          .then(res => { if (!res.ok) throw new Error('not ok'); return res.json(); })
          .then((data: VanityStats) => { if (!cancelled) setVanityStats(data); })
          .catch(() => { if (!cancelled) setVanityStats(EMPTY_VANITY); })
      );
    }

    Promise.all(fetches).finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [publicKey, refreshKey, options.reclaim, options.vanity]);

  return { reclaimStats, vanityStats, loading, refresh };
}
