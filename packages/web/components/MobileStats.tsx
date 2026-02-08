'use client';

import { FC, useState, useEffect, useCallback } from 'react';

interface Stats {
  totalSolReclaimed: number;
  totalAccountsClosed: number;
  totalWallets: number;
}

interface RecentReclaim {
  wallet: string;
  solReclaimed: number;
  accountsClosed: number;
  timestamp: number;
}

function truncateWallet(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const MobileStats: FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [reclaims, setReclaims] = useState<RecentReclaim[]>([]);

  const fetchData = useCallback(() => {
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
    if (!workerUrl) return;

    fetch(`${workerUrl}/api/stats`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Stats | null) => {
        if (data) setStats(data);
      })
      .catch(() => {});

    fetch(`${workerUrl}/api/stats/recent`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RecentReclaim[] | null) => {
        if (data && data.length > 0) {
          setReclaims(data.slice(0, 3));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 5_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
  if (!workerUrl) return null;

  const display = stats ?? { totalSolReclaimed: 0, totalAccountsClosed: 0, totalWallets: 0 };

  return (
    <div className="xl:hidden space-y-3 max-w-md mx-auto w-full">
      {/* Compact stats row */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Global Stats</p>
          <div className="w-1.5 h-1.5 rounded-full bg-solana-green animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-solana-green">{display.totalSolReclaimed.toFixed(2)}</div>
            <div className="text-[10px] text-gray-500">SOL Reclaimed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">{display.totalAccountsClosed.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500">Accounts</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">{display.totalWallets.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500">Wallets</div>
          </div>
        </div>
      </div>

      {/* Mini activity feed */}
      {reclaims.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Live Activity</p>
            <div className="w-1.5 h-1.5 rounded-full bg-solana-green animate-pulse" />
          </div>
          <div className="space-y-0">
            {reclaims.map((r, i) => (
              <div
                key={`${r.wallet}-${r.timestamp}`}
                className={`flex items-center justify-between py-2 ${
                  i !== reclaims.length - 1 ? 'border-b border-[#1a1a1f]' : ''
                }`}
              >
                <div className="min-w-0">
                  <span className="text-xs font-mono text-solana-purple">{truncateWallet(r.wallet)}</span>
                  <span className="text-[10px] text-gray-600 ml-2">{timeAgo(r.timestamp)}</span>
                </div>
                <span className="text-xs font-semibold text-solana-green flex-shrink-0 ml-3">
                  +{r.solReclaimed.toFixed(3)} SOL
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
