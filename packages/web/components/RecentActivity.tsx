'use client';

import { FC, useState, useEffect, useRef, useCallback } from 'react';

interface RecentReclaim {
  wallet: string;
  solReclaimed: number;
  accountsClosed: number;
  timestamp: number;
}

const POLL_INTERVAL = 5_000; // 5 seconds — near real-time

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

export const RecentActivity: FC = () => {
  const [reclaims, setReclaims] = useState<RecentReclaim[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  const fetchRecent = useCallback(() => {
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
    if (!workerUrl) return;

    fetch(`${workerUrl}/api/stats/recent`)
      .then((res) => res.ok ? res.json() : null)
      .then((data: RecentReclaim[] | null) => {
        if (data && data.length > 0) {
          setReclaims(data.slice(0, 5));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchRecent();
    const id = setInterval(fetchRecent, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchRecent]);

  // Auto-scroll to top when new entries arrive
  useEffect(() => {
    if (reclaims.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    prevCountRef.current = reclaims.length;
  }, [reclaims]);

  return (
    <div className="card p-5 h-[320px] flex flex-col group/activity">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Live Activity</p>
        <div className="w-1.5 h-1.5 rounded-full bg-solana-green animate-pulse"></div>
      </div>
      {reclaims.length === 0 ? (
        <p className="text-sm text-gray-600 py-4">No activity yet</p>
      ) : (
        <div ref={scrollRef} className="overflow-y-auto min-h-0 flex-1 pr-3 activity-scroll">
          {reclaims.map((r, i) => (
            <div
              key={`${r.wallet}-${r.timestamp}`}
              className={`flex items-center justify-between py-2.5 ${
                i !== reclaims.length - 1 ? 'border-b border-[#1a1a1f]' : ''
              }`}
            >
              <div className="min-w-0">
                <span className="text-sm font-mono text-solana-purple">{truncateWallet(r.wallet)}</span>
                <p className="text-xs text-gray-600 mt-0.5">{r.accountsClosed} acct{r.accountsClosed !== 1 ? 's' : ''} closed</p>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <span className="text-sm font-semibold text-solana-green">+{r.solReclaimed.toFixed(3)}</span>
                <p className="text-[11px] text-gray-600 mt-0.5">{timeAgo(r.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
