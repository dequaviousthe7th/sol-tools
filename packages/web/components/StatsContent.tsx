'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletStats, ReclaimStats, VanityStats } from '../hooks/useWalletStats';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

/* ── SOL price hook ──────────────────────────── */
function useSolPrice() {
  const [price, setPrice] = useState<number | null>(null);
  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
      .then(r => r.json())
      .then(d => setPrice(d?.solana?.usd ?? null))
      .catch(() => {});
  }, []);
  return price;
}

/* ── Animated counter hook ───────────────────── */
function useCounter(end: number, duration = 1000) {
  const [val, setVal] = useState(0);
  const frame = useRef(0);
  useEffect(() => {
    if (!end) { setVal(0); return; }
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setVal((1 - Math.pow(1 - p, 3)) * end);
      if (p < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [end, duration]);
  return val;
}

/* ── Achievements ────────────────────────────── */
interface Achievement {
  id: string;
  label: string;
  desc: string;
  icon: string;
  check: (r: ReclaimStats | null, v: VanityStats | null) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'rent-buster', label: 'Rent Buster', desc: 'Reclaimed SOL for the first time', icon: '💰', check: (r) => (r?.uses ?? 0) > 0 },
  { id: 'clean-sweep', label: 'Clean Sweep', desc: 'Closed 10+ token accounts', icon: '🧹', check: (r) => (r?.totalAccountsClosed ?? 0) >= 10 },
  { id: 'sol-saver', label: 'SOL Saver', desc: 'Reclaimed over 1 SOL', icon: '✨', check: (r) => (r?.totalSolReclaimed ?? 0) >= 1 },
  { id: 'deep-clean', label: 'Deep Clean', desc: 'Reclaimed over 5 SOL', icon: '🐋', check: (r) => (r?.totalSolReclaimed ?? 0) >= 5 },
  { id: 'key-maker', label: 'Key Maker', desc: 'Generated a vanity address', icon: '🔑', check: (_r, v) => (v?.purchases ?? 0) > 0 },
  { id: 'collector', label: 'Collector', desc: 'Bought 10+ vanity tokens', icon: '💎', check: (_r, v) => (v?.tokensBought ?? 0) >= 10 },
  { id: 'power-user', label: 'Power User', desc: 'Used both Reclaimer & Vanity', icon: '⚡', check: (r, v) => (r?.uses ?? 0) > 0 && (v?.purchases ?? 0) > 0 },
];

/* ── Toast notification types ────────────────── */
interface Toast {
  id: string;
  achievement: Achievement;
  exiting: boolean;
}

/* ── Main component ──────────────────────────── */
export default function StatsContent() {
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;
  const { reclaimStats, vanityStats, loading } = useWalletStats(walletAddress);
  const solPrice = useSolPrice();
  const [toasts, setToasts] = useState<Toast[]>([]);

  /* ── Toast helpers ─────────────────────────── */
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 400);
  }, []);

  // Show toasts only for NEW achievements (persisted in localStorage)
  useEffect(() => {
    if (loading || !connected) return;
    const STORAGE_KEY = `soltools-achievements-${walletAddress}`;
    let seen: string[] = [];
    try { seen = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch {}
    const seenSet = new Set(seen);

    const newlyEarned = ACHIEVEMENTS.filter(a => {
      if (seenSet.has(a.id)) return false;
      return a.check(reclaimStats, vanityStats);
    });
    if (newlyEarned.length === 0) return;

    // Persist immediately so they never fire again
    const updated = [...seen, ...newlyEarned.map(a => a.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    newlyEarned.forEach((a, i) => {
      setTimeout(() => {
        const toastId = `${a.id}-${Date.now()}`;
        setToasts(prev => [...prev, { id: toastId, achievement: a, exiting: false }]);
        setTimeout(() => dismissToast(toastId), 4000);
      }, i * 600);
    });
  }, [loading, connected, walletAddress, reclaimStats, vanityStats, dismissToast]);

  /* ── Disconnected ──────────────────────────── */
  if (!connected) {
    return (
      <div className="text-center py-20 stat-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-solana-purple/10 to-solana-green/10 border border-[#222228] flex items-center justify-center mx-auto mb-5">
          <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-white font-semibold text-lg mb-2">Connect Your Wallet</h2>
        <p className="text-gray-500 text-sm max-w-xs mx-auto mb-6">
          Link your wallet to see personal stats, achievements, and activity across all SolTools.
        </p>
        <div className="flex justify-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111113] border border-[#1a1a1f] text-[10px] text-gray-600">
            <span className="w-1 h-1 rounded-full bg-solana-green" />
            Track reclaims
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111113] border border-[#1a1a1f] text-[10px] text-gray-600">
            <span className="w-1 h-1 rounded-full bg-solana-purple" />
            Earn achievements
          </div>
        </div>
      </div>
    );
  }

  /* ── Connected — compute values ────────────── */
  const solReclaimed = reclaimStats?.totalSolReclaimed ?? 0;
  const accountsClosed = reclaimStats?.totalAccountsClosed ?? 0;
  const totalReclaims = reclaimStats?.uses ?? 0;
  const usdReclaimed = solPrice ? solReclaimed * solPrice : null;

  const tokensBought = vanityStats?.tokensBought ?? 0;
  const tokensUsed = vanityStats?.tokensUsed ?? 0;
  const vanitySpent = vanityStats?.totalSol ?? 0;
  const vanityPurchases = vanityStats?.purchases ?? 0;
  const currentBalance = vanityStats?.currentBalance ?? 0;
  const lastPurchase = vanityStats?.lastPurchase ?? 0;
  const usdVanitySpent = solPrice ? vanitySpent * solPrice : null;

  const earned = ACHIEVEMENTS.filter(a => a.check(reclaimStats, vanityStats));
  const locked = ACHIEVEMENTS.filter(a => !a.check(reclaimStats, vanityStats));

  return (
    <>
      {/* ── Toast Notifications ─────────────────── */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto w-[calc(100vw-2rem)] sm:w-80 ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}
          >
            <div className="relative overflow-hidden rounded-xl bg-[#16161a] border border-solana-purple/30 shadow-[0_8px_32px_rgba(153,69,255,0.15),0_0_0_1px_rgba(153,69,255,0.1)]">
              <div className="h-[2px] w-full bg-gradient-to-r from-solana-purple via-solana-green to-solana-purple" />
              <div className="p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center flex-shrink-0 border border-solana-purple/20">
                  <span className="text-lg">{toast.achievement.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-semibold text-solana-purple uppercase tracking-wider">Achievement Unlocked</p>
                  </div>
                  <p className="text-sm font-bold text-white truncate">{toast.achievement.label}</p>
                  <p className="text-[11px] text-gray-500 truncate">{toast.achievement.desc}</p>
                </div>
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-400 hover:bg-[#222228] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Auto-dismiss progress bar */}
              <div className="h-[2px] w-full bg-[#111113]">
                <div className="h-full bg-gradient-to-r from-solana-purple to-solana-green toast-progress" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Layout ─────────────────────────── */}
      <div className="mt-2 pb-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-solana-purple/30 border-t-solana-purple animate-spin" />
            <p className="text-[11px] text-gray-600">Loading your stats...</p>
          </div>
        ) : (
          <div className="flex flex-col xl:flex-row gap-5">
            {/* ═══ LEFT COLUMN — Stats ═══════════════ */}
            <div className="flex-1 min-w-0 space-y-5">
              {/* Hero — Total Value Recovered */}
              <HeroCard
                solReclaimed={solReclaimed}
                usdReclaimed={usdReclaimed}
                solPrice={solPrice}
                accountsClosed={accountsClosed}
                totalReclaims={totalReclaims}
              />

              {/* Reclaimer */}
              <section className="stat-fade-in" style={{ animationDelay: '0.15s' }}>
                <SectionHeader
                  title="SOL Reclaimer"
                  href="/reclaim"
                  iconBg="from-solana-green/15 to-solana-green/5"
                  iconBorder="border-solana-green/10"
                  icon={
                    <svg className="w-3.5 h-3.5 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <StatCard label="SOL Reclaimed" value={solReclaimed.toFixed(4)} accent="green" />
                  <StatCard label="USD Value" value={usdReclaimed !== null ? `$${usdReclaimed.toFixed(2)}` : '—'} accent="green" />
                  <StatCard label="Accounts Closed" value={String(accountsClosed)} />
                  <StatCard label="Total Reclaims" value={String(totalReclaims)} />
                </div>
              </section>

              {/* Vanity */}
              <section className="stat-fade-in" style={{ animationDelay: '0.25s' }}>
                <SectionHeader
                  title="Vanity Generator"
                  href="/vanity"
                  iconBg="from-solana-purple/15 to-solana-purple/5"
                  iconBorder="border-solana-purple/10"
                  icon={
                    <svg className="w-3.5 h-3.5 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  }
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <StatCard label="Purchases" value={String(vanityPurchases)} />
                  <StatCard label="Tokens Bought" value={String(tokensBought)} accent="purple" />
                  <StatCard label="Tokens Used" value={String(tokensUsed)} />
                  <StatCard label="Balance" value={String(currentBalance)} accent="green" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2.5">
                  <StatCard label="SOL Spent" value={vanitySpent.toFixed(4)} />
                  {usdVanitySpent !== null && (
                    <StatCard label="USD Spent" value={`$${usdVanitySpent.toFixed(2)}`} />
                  )}
                  <StatCard label="Last Purchase" value={lastPurchase ? new Date(lastPurchase).toLocaleDateString() : '—'} />
                </div>
              </section>

              {/* Empty state */}
              {totalReclaims === 0 && vanityPurchases === 0 && (
                <div className="stat-fade-in text-center py-6" style={{ animationDelay: '0.45s' }}>
                  <p className="text-sm text-gray-500 mb-4">No activity yet — start using SolTools to earn achievements!</p>
                  <Link
                    href="/reclaim"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-solana-purple to-solana-green text-white text-xs font-semibold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Start Reclaiming SOL
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>

            {/* ═══ RIGHT COLUMN — Achievements Card ══ */}
            <div className="xl:w-80 flex-shrink-0 stat-fade-in" style={{ animationDelay: '0.35s' }}>
              <div className="card card-hover sticky top-4 overflow-hidden">
                {/* Top gradient accent */}
                <div className="h-[2px] w-full bg-gradient-to-r from-amber-500/60 via-solana-purple to-amber-500/60" />

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 flex items-center justify-center border border-amber-500/10">
                      <span className="text-sm">🏆</span>
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">Achievements</h2>
                      <p className="text-[10px] text-gray-600">Unlock by using SolTools</p>
                    </div>
                    <span className="ml-auto px-2.5 py-1 rounded-full bg-[#0d0d0f] border border-[#222228] text-[11px] font-bold text-white">
                      {earned.length}<span className="text-gray-600">/{ACHIEVEMENTS.length}</span>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-5 rounded-full h-2 bg-[#0d0d0f] border border-[#222228] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-solana-purple to-solana-green transition-all duration-1000 ease-out"
                      style={{ width: `${(earned.length / ACHIEVEMENTS.length) * 100}%` }}
                    />
                  </div>

                  {/* Achievement list */}
                  <div className="space-y-2.5">
                    {earned.map(a => (
                      <div
                        key={a.id}
                        className="group relative flex items-center gap-3 rounded-xl bg-[#16161a] border border-solana-purple/15 p-3 hover:border-solana-purple/30 hover:shadow-[0_0_15px_rgba(153,69,255,0.06)] transition-all cursor-default"
                      >
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-solana-purple/15 to-solana-green/10 flex items-center justify-center flex-shrink-0 border border-solana-purple/10 group-hover:scale-105 transition-transform">
                          <span className="text-sm">{a.icon}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold text-white truncate">{a.label}</p>
                          <p className="text-[10px] text-gray-500 truncate">{a.desc}</p>
                        </div>
                        <svg className="w-3.5 h-3.5 text-solana-green flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ))}
                    {locked.map(a => (
                      <div
                        key={a.id}
                        className="relative flex items-center gap-3 rounded-xl bg-[#0d0d0f] border border-[#1a1a1f] p-3 opacity-50 cursor-default"
                      >
                        <div className="w-9 h-9 rounded-lg bg-[#111113] flex items-center justify-center flex-shrink-0 border border-[#1a1a1f]">
                          <span className="text-sm grayscale">{a.icon}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold text-gray-600 truncate">{a.label}</p>
                          <p className="text-[10px] text-gray-700 truncate">{a.desc}</p>
                        </div>
                        <svg className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Hero Card ───────────────────────────────── */
function HeroCard({
  solReclaimed,
  usdReclaimed,
  solPrice,
  accountsClosed,
  totalReclaims,
}: {
  solReclaimed: number;
  usdReclaimed: number | null;
  solPrice: number | null;
  accountsClosed: number;
  totalReclaims: number;
}) {
  const animSol = useCounter(solReclaimed);
  const animUsd = useCounter(usdReclaimed ?? 0);
  const animAccounts = useCounter(accountsClosed);

  return (
    <div className="stat-fade-in" style={{ animationDelay: '0.05s' }}>
      <div className="relative overflow-hidden rounded-2xl border border-[#222228] bg-[#111113] group hover:border-solana-green/20 transition-all duration-500">
        {/* Top gradient accent */}
        <div className="h-[2px] w-full bg-gradient-to-r from-solana-purple via-solana-green to-solana-purple opacity-70 group-hover:opacity-100 transition-opacity" />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded-md bg-solana-green/10 flex items-center justify-center">
              <svg className="w-3 h-3 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Total Value Recovered</p>
          </div>

          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-3xl sm:text-4xl font-bold text-solana-green tabular-nums tracking-tight">
              {animSol.toFixed(4)}
            </span>
            <span className="text-base sm:text-lg text-gray-500 font-medium">SOL</span>
          </div>

          {usdReclaimed !== null && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-400 tabular-nums font-medium">
                ≈ ${animUsd.toFixed(2)}
              </span>
              <span className="text-[10px] text-gray-600">USD</span>
              {solPrice && (
                <span className="px-1.5 py-0.5 rounded bg-[#0d0d0f] text-[9px] text-gray-600 font-mono">
                  ${solPrice.toFixed(2)}/SOL
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-5 pt-4 border-t border-[#1a1a1f]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-solana-green/10 flex items-center justify-center">
                <span className="text-[10px] font-bold text-solana-green tabular-nums">{Math.round(animAccounts)}</span>
              </div>
              <span className="text-[11px] text-gray-500">accounts cleaned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-solana-purple/10 flex items-center justify-center">
                <span className="text-[10px] font-bold text-solana-purple tabular-nums">{totalReclaims}</span>
              </div>
              <span className="text-[11px] text-gray-500">reclaim sessions</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Section Header ──────────────────────────── */
function SectionHeader({
  title,
  href,
  icon,
  iconBg,
  iconBorder,
}: {
  title: string;
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  iconBorder: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${iconBg} flex items-center justify-center border ${iconBorder}`}>
        {icon}
      </div>
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <a
        href={href}
        className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111113] border border-[#222228] text-[11px] text-gray-500 hover:text-solana-purple hover:border-solana-purple/30 transition-all"
      >
        Open
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </div>
  );
}

/* ── Stat Card ───────────────────────────────── */
function StatCard({ label, value, accent }: {
  label: string;
  value: string;
  accent?: 'green' | 'purple';
}) {
  const dotColor = accent === 'green'
    ? 'bg-solana-green'
    : accent === 'purple'
      ? 'bg-solana-purple'
      : 'bg-gray-600';

  const valueColor = accent === 'green'
    ? 'text-solana-green'
    : accent === 'purple'
      ? 'text-solana-purple'
      : 'text-white';

  const hoverBorder = accent === 'green'
    ? 'hover:border-solana-green/20 hover:shadow-[0_0_12px_rgba(20,241,149,0.05)]'
    : accent === 'purple'
      ? 'hover:border-solana-purple/20 hover:shadow-[0_0_12px_rgba(153,69,255,0.05)]'
      : 'hover:border-[#333]';

  return (
    <div className={`rounded-xl bg-[#111113] border border-[#222228] p-3.5 transition-all duration-200 ${hoverBorder}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <div className={`w-1 h-1 rounded-full ${dotColor}`} />
        <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">{label}</p>
      </div>
      <p className={`text-base sm:text-lg font-bold ${valueColor} tabular-nums leading-none`}>{value}</p>
    </div>
  );
}
