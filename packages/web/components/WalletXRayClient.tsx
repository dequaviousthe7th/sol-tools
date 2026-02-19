'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSavedWallets, type SavedWalletWithLive } from '../hooks/useSavedWallets';

const TradingChart = dynamic(() => import('./TradingChart'), { ssr: false });

/* ─── Types ─── */

interface WalletXRayToken {
  mint: string;
  symbol: string;
  name: string;
  imageUrl: string | null;
  invested: number;
  pnl: number;
  realized: number;
  unrealized: number;
  pnlPercent: number;
  trades: number;
  buyTxns: number;
  sellTxns: number;
  holding: boolean;
  currentValue: number;
  totalSold: number;
  lastTradeTime: number;
  investedUsd?: number;
  pnlUsd?: number;
  realizedUsd?: number;
}

interface WalletTransfer {
  type: 'in' | 'out';
  amount: number;
  counterparty: string;
  timestamp: number;
  signature: string;
}

interface WalletXRayResult {
  wallet: string;
  totalPnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalInvested: number;
  totalPnlUsd?: number;
  realizedPnlUsd?: number;
  totalInvestedUsd?: number;
  winRate: number;
  wins: number;
  losses: number;
  grade: string;
  tokens: WalletXRayToken[];
  transfers: WalletTransfer[];
  pnlHistory?: Array<{ time: number; value: number }>;
}

type State = 'idle' | 'loading' | 'results' | 'error';
type Tab = 'top' | 'active' | 'history' | 'activity' | 'transfers';
type SortDir = 'asc' | 'desc';

interface SortState {
  key: string;
  dir: SortDir;
}

/* ─── Helpers ─── */

const isValidBase58 = (str: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(str);

function formatSol(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

function formatSolWithUnit(n: number): string {
  return `${formatSol(n)} SOL`;
}

function formatPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function formatPnl(n: number): string {
  return `${n >= 0 ? '+' : ''}${formatSol(n)} SOL`;
}

function relativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts * 1000;
  if (diff < 0) return 'Just now';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatUsd(solAmount: number, solPrice: number): string {
  if (!solPrice) return '';
  return formatUsdDirect(solAmount * solPrice);
}

function formatUsdDirect(usd: number): string {
  const abs = Math.abs(usd);
  const sign = usd < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function formatValue(sol: number, usdDirect: number | undefined, solPrice: number, showUsd: boolean): string {
  if (showUsd) {
    if (usdDirect != null) return formatUsdDirect(usdDirect);
    if (solPrice > 0) return formatUsdDirect(sol * solPrice);
    return formatSol(sol) + ' SOL';
  }
  return formatSol(sol) + ' SOL';
}

function formatPnlValue(sol: number, usdDirect: number | undefined, solPrice: number, showUsd: boolean): string {
  const sign = sol >= 0 ? '+' : '';
  if (showUsd) {
    if (usdDirect != null) return `${usdDirect >= 0 ? '+' : ''}${formatUsdDirect(usdDirect)}`;
    if (solPrice > 0) return `${sign}${formatUsdDirect(sol * solPrice)}`;
  }
  return `${sign}${formatSol(sol)} SOL`;
}

function pnlColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-gray-400';
}

function gradeGradient(grade: string): string {
  const g = grade.toUpperCase().replace('+', '+');
  if (g === 'A+' || g === 'A') return 'from-emerald-500 to-green-500';
  if (g.startsWith('B')) return 'from-cyan-500 to-blue-500';
  if (g.startsWith('C')) return 'from-yellow-500 to-amber-500';
  if (g.startsWith('D')) return 'from-orange-500 to-red-500';
  return 'from-red-600 to-red-800';
}

function gradeGlow(grade: string): string {
  const g = grade.toUpperCase().replace('+', '+');
  if (g === 'A+' || g === 'A') return 'shadow-[0_0_40px_rgba(16,185,129,0.25)]';
  if (g.startsWith('B')) return 'shadow-[0_0_40px_rgba(6,182,212,0.25)]';
  if (g.startsWith('C')) return 'shadow-[0_0_40px_rgba(245,158,11,0.25)]';
  if (g.startsWith('D')) return 'shadow-[0_0_40px_rgba(249,115,22,0.25)]';
  return 'shadow-[0_0_40px_rgba(239,68,68,0.25)]';
}

function truncateWallet(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function sortTokens<T extends WalletXRayToken>(tokens: T[], key: string, dir: SortDir): T[] {
  const sorted = [...tokens];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case 'symbol': cmp = a.symbol.localeCompare(b.symbol); break;
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'invested': cmp = a.invested - b.invested; break;
      case 'pnl': cmp = a.pnl - b.pnl; break;
      case 'absPnl': cmp = Math.abs(a.pnl) - Math.abs(b.pnl); break;
      case 'pnlPercent': cmp = a.pnlPercent - b.pnlPercent; break;
      case 'roi': cmp = a.pnlPercent - b.pnlPercent; break;
      case 'trades': cmp = a.trades - b.trades; break;
      case 'currentValue': cmp = a.currentValue - b.currentValue; break;
      case 'unrealized': cmp = a.unrealized - b.unrealized; break;
      case 'realized': cmp = a.realized - b.realized; break;
      case 'totalSold': cmp = a.totalSold - b.totalSold; break;
      case 'lastTradeTime': cmp = a.lastTradeTime - b.lastTradeTime; break;
      default: cmp = 0;
    }
    return dir === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

/* ─── Sub-components ─── */

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-700">&uarr;</span>;
  return <span className="ml-1 text-amber-400">{dir === 'asc' ? '\u2191' : '\u2193'}</span>;
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  align = 'right',
}: {
  label: string;
  sortKey: string;
  currentSort: SortState;
  onSort: (key: string) => void;
  align?: 'left' | 'right';
}) {
  return (
    <th className={`px-3 lg:px-4 py-3 ${align === 'left' ? 'text-left' : 'text-right'}`}>
      <button
        onClick={() => onSort(sortKey)}
        className="text-[10px] uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap inline-flex items-center"
      >
        {label}
        <SortArrow active={currentSort.key === sortKey} dir={currentSort.dir} />
      </button>
    </th>
  );
}

function TokenCell({ token }: { token: WalletXRayToken }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="flex items-center gap-2.5">
      {token.imageUrl && !imgError ? (
        <img
          src={token.imageUrl}
          alt=""
          className="w-8 h-8 rounded-lg flex-shrink-0 bg-[#1a1a1f]"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-8 h-8 rounded-lg bg-[#1a1a1f] flex items-center justify-center text-gray-600 flex-shrink-0">
          <span className="text-[10px] font-bold">{token.symbol.slice(0, 2)}</span>
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-white text-xs font-medium truncate max-w-[120px] lg:max-w-[180px]">
            {token.symbol}
          </span>
          {token.holding && (
            <span className="px-1.5 py-0.5 text-[8px] font-bold bg-amber-500/15 text-amber-400 rounded border border-amber-500/20">
              HOLD
            </span>
          )}
        </div>
        <p className="text-gray-600 text-[10px] truncate max-w-[120px] lg:max-w-[180px]">{token.name}</p>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#1a1a1f] flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

function PaginationControls({
  page,
  setPage,
  pageSize,
  setPageSize,
  totalItems,
}: {
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  totalItems: number;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#1a1a1f]">
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs">Show</span>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
          className="bg-[#111113] border border-[#1a1a1f] rounded-lg px-2 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-amber-500/50"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>
      <span className="text-gray-500 text-xs">
        {totalItems > 0 ? `${start}-${end} of ${totalItems}` : '0 items'}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
          className="px-2.5 py-1.5 rounded-lg border border-[#1a1a1f] text-xs text-gray-400 hover:text-white hover:border-[#333] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Prev
        </button>
        <span className="text-gray-500 text-xs px-1">
          {page + 1}/{totalPages}
        </span>
        <button
          onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
          className="px-2.5 py-1.5 rounded-lg border border-[#1a1a1f] text-xs text-gray-400 hover:text-white hover:border-[#333] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* ─── Emoji Picker & Saved Wallet Helpers ─── */

const EMOJI_OPTIONS = [
  '🤖','👻','🦊','🐙','🦈','🐋','🐺','🦅','🦁','🐯',
  '💜','💎','🔥','⚡','🎯','🎲','🚀','💰','🪙','👑',
  '🌊','🌙','⭐','🎭','🧪','🔮','📊','🏆','🐸','🦑',
  '🐍','🦇','🐝','🦋','🐢','🦎','🎵','💣','🗡️','🛡️',
  '🔴','🟢','🔵','🟡','🟣','⚪','🖤','💚','💙','🧡',
  '❤️','🔑','🌀','❄️','🏴‍☠️','🪲','🦂','⚔️','🧲','🎪',
];

function EmojiPicker({ current, onSelect, onClose }: { current: string; onSelect: (e: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute z-50 bg-[#111113] border border-[#1a1a1f] rounded-xl shadow-2xl p-3 grid grid-cols-6 gap-1.5 w-[220px]" onClick={e => e.stopPropagation()}>
      {EMOJI_OPTIONS.map(emoji => (
        <button
          key={emoji}
          onClick={(e) => { e.stopPropagation(); onSelect(emoji); }}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-base hover:bg-white/10 transition-colors ${emoji === current ? 'bg-amber-500/20 ring-1 ring-amber-500/50' : ''}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function formatRelativeTime(tsMs: number | null): string {
  if (!tsMs) return '—';
  const diff = Date.now() - tsMs;
  if (diff < 0) return 'Just now';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function SavedWalletRow({
  wallet,
  onAnalyze,
  onRemove,
  onUpdateName,
  onUpdateEmoji,
}: {
  wallet: SavedWalletWithLive;
  onAnalyze: (address: string) => void;
  onRemove: (address: string) => void;
  onUpdateName: (address: string, name: string) => void;
  onUpdateEmoji: (address: string, emoji: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(wallet.name);
  const [showPicker, setShowPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const handleNameSubmit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== wallet.name) {
      onUpdateName(wallet.address, trimmed);
    } else {
      setEditName(wallet.name);
    }
    setEditing(false);
  };

  const copyAddr = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const shortAddr = `${wallet.address.slice(0, 4)}...${wallet.address.slice(-4)}`;
  const smShortAddr = `${wallet.address.slice(0, 4)}...${wallet.address.slice(-3)}`;

  return (
    <div
      onClick={() => onAnalyze(wallet.address)}
      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 hover:bg-white/[0.02] cursor-pointer transition-colors group relative"
    >
      {/* Emoji */}
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker); }}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-base"
        >
          {wallet.emoji}
        </button>
        {showPicker && (
          <div className="absolute left-0 top-full mt-1">
            <EmojiPicker
              current={wallet.emoji}
              onSelect={(e) => { onUpdateEmoji(wallet.address, e); setShowPicker(false); }}
              onClose={() => setShowPicker(false)}
            />
          </div>
        )}
      </div>

      {/* Name */}
      <div className="min-w-0 flex-shrink-0 w-20 sm:w-28">
        {editing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={e => { if (e.key === 'Enter') handleNameSubmit(); if (e.key === 'Escape') { setEditName(wallet.name); setEditing(false); } }}
            onClick={e => e.stopPropagation()}
            className="w-full bg-transparent border-b border-amber-500/50 text-white text-xs outline-none py-0.5"
            maxLength={20}
          />
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            className="text-white text-xs truncate block max-w-full hover:text-amber-400 transition-colors"
            title="Click to rename"
          >
            {wallet.name}
          </button>
        )}
      </div>

      {/* Address */}
      <button
        onClick={copyAddr}
        className="text-gray-500 text-[11px] font-mono hover:text-amber-400 transition-colors flex-1 min-w-0 text-left"
        title={wallet.address}
      >
        <span className="hidden sm:inline">{copied ? 'Copied!' : shortAddr}</span>
        <span className="sm:hidden">{copied ? 'Copied!' : smShortAddr}</span>
      </button>

      {/* Balance */}
      <div className="text-right w-24 sm:w-28 flex-shrink-0">
        {wallet.balanceSol !== null ? (
          <span className="text-gray-300 text-xs inline-flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 397.7 311.7" fill="currentColor">
              <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"/>
              <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"/>
              <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"/>
            </svg>
            {wallet.balanceSol.toFixed(2)}
          </span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </div>

      {/* Last Active — hidden on mobile */}
      <div className="hidden sm:block text-right w-24 flex-shrink-0">
        <span className="text-gray-500 text-[11px]">
          {formatRelativeTime(wallet.lastActive)}
        </span>
      </div>

      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(wallet.address); }}
        className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
        title="Remove wallet"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Main Component ─── */

export default function WalletXRayClient() {
  const [state, setState] = useState<State>('idle');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<WalletXRayResult | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('top');
  const [chartData, setChartData] = useState<{time:number;value:number}[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [solPrice, setSolPrice] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showUsd, setShowUsd] = useState(false);

  // Saved wallets
  const savedWallets = useSavedWallets();
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-tab sort states
  const [topSort, setTopSort] = useState<SortState>({ key: 'pnl', dir: 'desc' });
  const [activeSort, setActiveSort] = useState<SortState>({ key: 'unrealized', dir: 'desc' });
  const [historySort, setHistorySort] = useState<SortState>({ key: 'lastTradeTime', dir: 'desc' });
  const [activitySort, setActivitySort] = useState<SortState>({ key: 'lastTradeTime', dir: 'desc' });

  // Pagination
  const [pageSize, setPageSize] = useState(10);
  const [topPage, setTopPage] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [activityPage, setActivityPage] = useState(0);
  const [transfersPage, setTransfersPage] = useState(0);

  // Fetch SOL price on mount
  useEffect(() => {
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
    if (!workerUrl) return;
    fetch(`${workerUrl}/api/prices`).then(r => r.json())
      .then((d: Record<string, Record<string, number>>) => { if (d?.solana?.usd) setSolPrice(d.solana.usd); }).catch(() => {});
  }, []);

  // Check for wallet param in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const w = params.get('wallet');
    if (w && isValidBase58(w)) {
      setInput(w);
      // Auto-analyze after a tick
      setTimeout(() => {
        setInput(w);
        analyzeWallet(w);
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const analyzeWallet = useCallback(async (wallet: string) => {
    if (!isValidBase58(wallet)) return;

    setState('loading');
    setError('');
    setChartData([]);
    setChartLoading(true);

    try {
      const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
      if (!workerUrl) throw new Error('API not configured');

      const res = await fetch(`${workerUrl}/api/wallet-xray?wallet=${wallet}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error((data as { error?: string }).error || `Error ${res.status}`);
      }

      const data = await res.json() as WalletXRayResult;
      // Build PnL chart from our own computed data
      if (data.pnlHistory && data.pnlHistory.length > 0) {
        setChartData(data.pnlHistory);
      }
      setChartLoading(false);
      setResult(data);
      setActiveTab('top');
      setTopSort({ key: 'pnl', dir: 'desc' });
      setActiveSort({ key: 'unrealized', dir: 'desc' });
      setHistorySort({ key: 'lastTradeTime', dir: 'desc' });
      setActivitySort({ key: 'lastTradeTime', dir: 'desc' });
      setTopPage(0);
      setActivePage(0);
      setHistoryPage(0);
      setActivityPage(0);
      setTransfersPage(0);
      setState('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setState('error');
    }
  }, []);

  const analyze = useCallback(() => {
    analyzeWallet(input.trim());
  }, [input, analyzeWallet]);

  const reset = useCallback(() => {
    setState('idle');
    setInput('');
    setResult(null);
    setError('');
    setChartData([]);
    setChartLoading(false);
    // Clean URL param
    if (window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const copyWallet = useCallback(async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, []);

  const toggleSort = useCallback((
    current: SortState,
    setter: (s: SortState) => void,
    key: string,
  ) => {
    if (current.key === key) {
      setter({ key, dir: current.dir === 'desc' ? 'asc' : 'desc' });
    } else {
      setter({ key, dir: 'desc' });
    }
  }, []);

  // Filtered + sorted token lists per tab
  const topTokens = useMemo(() => {
    if (!result) return [];
    return sortTokens(result.tokens, topSort.key, topSort.dir);
  }, [result, topSort]);

  const activeTokens = useMemo(() => {
    if (!result) return [];
    const filtered = result.tokens.filter(t => t.holding);
    return sortTokens(filtered, activeSort.key, activeSort.dir);
  }, [result, activeSort]);

  const historyTokens = useMemo(() => {
    if (!result) return [];
    const filtered = result.tokens.filter(t => !t.holding);
    return sortTokens(filtered, historySort.key, historySort.dir);
  }, [result, historySort]);

  const activityTokens = useMemo(() => {
    if (!result) return [];
    return sortTokens(result.tokens, activitySort.key, activitySort.dir);
  }, [result, activitySort]);

  /* ──────────────────── IDLE STATE ──────────────────── */

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const result = savedWallets.importWallets(text);
      setImportMsg(`Added ${result.added}, skipped ${result.skipped}${result.errors > 0 ? `, ${result.errors} invalid` : ''}`);
      setTimeout(() => setImportMsg(null), 3000);
    };
    reader.readAsText(file);
    // Reset file input so same file can be re-imported
    e.target.value = '';
  }, [savedWallets]);

  const handleExport = useCallback(() => {
    const data = savedWallets.exportWallets();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xray-wallets-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [savedWallets]);

  const handleSaveWallet = useCallback(() => {
    const addr = input.trim();
    if (isValidBase58(addr) && !savedWallets.hasWallet(addr)) {
      savedWallets.addWallet(addr);
    }
  }, [input, savedWallets]);

  if (state === 'idle') {
    const hasSaved = savedWallets.wallets.length > 0;
    const validInput = isValidBase58(input.trim());
    const canSave = validInput && !savedWallets.hasWallet(input.trim());

    /* Hidden file input for import — shared by both modes */
    const fileInput = (
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.txt"
        onChange={handleImportFile}
        className="hidden"
      />
    );

    /* ── Search bar (reused in both modes) ── */
    const searchRow = (
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && isValidBase58(input.trim()) && analyze()}
          placeholder="Enter any wallet address..."
          className="flex-1 bg-[#111113] border border-[#1a1a1f] rounded-xl px-4 py-3.5 text-sm text-white font-mono placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50 focus:shadow-[0_0_20px_rgba(245,158,11,0.1)] transition-all"
          spellCheck={false}
        />
        <button
          onClick={analyze}
          disabled={!validInput}
          className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] active:scale-[0.98] transition-all"
        >
          Analyze
        </button>
        {canSave && (
          <button
            onClick={handleSaveWallet}
            className="px-3 py-3.5 rounded-xl border border-[#1a1a1f] text-gray-400 hover:text-amber-400 hover:border-amber-500/30 transition-all flex-shrink-0"
            title="Save wallet"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>
    );

    /* ── Action buttons (Import / Export / Clear) ── */
    const actionButtons = (
      <div className="flex items-center gap-1.5">
        {importMsg && (
          <span className="text-amber-400 text-[11px] mr-2">{importMsg}</span>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-2.5 py-1.5 rounded-lg border border-[#1a1a1f] text-gray-400 text-[11px] hover:text-amber-400 hover:border-amber-500/30 transition-all"
          title="Import wallets"
        >
          <span className="hidden sm:inline">Import</span>
          <svg className="w-3.5 h-3.5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </button>
        {hasSaved && (
          <>
            <button
              onClick={handleExport}
              className="px-2.5 py-1.5 rounded-lg border border-[#1a1a1f] text-gray-400 text-[11px] hover:text-amber-400 hover:border-amber-500/30 transition-all"
              title="Export wallets"
            >
              <span className="hidden sm:inline">Export</span>
              <svg className="w-3.5 h-3.5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              onClick={savedWallets.removeAll}
              className="px-2.5 py-1.5 rounded-lg border border-[#1a1a1f] text-gray-500 text-[11px] hover:text-red-400 hover:border-red-500/30 transition-all"
              title="Remove all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>
    );

    /* ═══════════════════════════════════════════════════════
       A. DASHBOARD MODE — has saved wallets → full-width
       ═══════════════════════════════════════════════════════ */
    if (hasSaved) {
      return (
        <div className="space-y-4 py-2">
          {fileInput}

          {/* Search card */}
          <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-2xl p-4 sm:p-5">
            {searchRow}
            <p className="text-gray-600 text-xs mt-2.5">
              No wallet connection needed
            </p>
          </div>

          {/* Tracked wallets card */}
          <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-2xl">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1f]">
              <h3 className="text-white text-sm font-semibold">
                Tracked Wallets ({savedWallets.wallets.length})
                {savedWallets.loading && (
                  <span className="ml-2 inline-block w-3 h-3 border border-amber-500/30 border-t-amber-400 rounded-full animate-spin align-middle" />
                )}
              </h3>
              {actionButtons}
            </div>

            {/* Column headers */}
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 border-b border-[#1a1a1f] text-[10px] uppercase tracking-wider text-gray-500 select-none">
              <div className="w-8" />
              <div className="w-20 sm:w-28">Wallet</div>
              <div className="flex-1 min-w-0">Address</div>
              <div className="text-right w-24 sm:w-28 flex-shrink-0">Balance</div>
              <div className="hidden sm:block text-right w-24 flex-shrink-0">Last Active</div>
              <div className="w-8" />
            </div>

            {/* Wallet rows */}
            <div className="divide-y divide-[#1a1a1f]/40">
              {savedWallets.wallets.map(w => (
                <SavedWalletRow
                  key={w.address}
                  wallet={w}
                  onAnalyze={analyzeWallet}
                  onRemove={savedWallets.removeWallet}
                  onUpdateName={savedWallets.updateName}
                  onUpdateEmoji={savedWallets.updateEmoji}
                />
              ))}
            </div>
          </div>
        </div>
      );
    }

    /* ═══════════════════════════════════════════════════════
       B. EMPTY MODE — no saved wallets → centered hero
       ═══════════════════════════════════════════════════════ */
    return (
      <div className="flex flex-col items-center py-10 sm:py-14">
        {fileInput}

        {/* Floating animated eye icon */}
        <div className="float mb-6 relative">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/20 relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-amber-400 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div className="absolute -inset-2 rounded-[28px] bg-gradient-to-br from-amber-500/10 to-orange-500/10 blur-xl -z-10 pulse-glow" style={{ boxShadow: '0 0 30px rgba(245,158,11,0.2)' }} />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 text-center">
          X-Ray Any Wallet
        </h2>
        <p className="text-gray-400 text-sm sm:text-base mb-8 text-center max-w-md leading-relaxed">
          Uncover any trader&apos;s full performance history, win rate, PnL breakdown, and trading grade.
        </p>

        {/* Search bar */}
        <div className="w-full max-w-xl">
          {searchRow}
          <p className="text-gray-600 text-xs text-center mt-3">
            No wallet connection needed
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl mt-8">
          {[
            {
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              ),
              title: 'Trader Grade',
              desc: 'A+ to F rating based on performance',
              color: 'text-amber-400',
              border: 'border-amber-500/10 hover:border-amber-500/30',
              bg: 'bg-amber-500/5',
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ),
              title: 'PnL Breakdown',
              desc: 'Realized vs unrealized profit/loss',
              color: 'text-green-400',
              border: 'border-green-500/10 hover:border-green-500/30',
              bg: 'bg-green-500/5',
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ),
              title: 'Token History',
              desc: 'Per-token performance & trade details',
              color: 'text-purple-400',
              border: 'border-purple-500/10 hover:border-purple-500/30',
              bg: 'bg-purple-500/5',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className={`card card-hover p-4 text-center ${feature.border} transition-all duration-300`}
            >
              <div className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center mx-auto mb-2.5 ${feature.color}`}>
                {feature.icon}
              </div>
              <h3 className="text-white text-sm font-semibold mb-1">{feature.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Import prompt card */}
        <div className="w-full max-w-xl mt-6">
          <div className="bg-[#0d0d0f]/50 border border-dashed border-[#1a1a1f] rounded-2xl p-6 text-center">
            <p className="text-gray-400 text-sm mb-3">
              Track wallets to monitor balances and quickly analyze them
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl border border-[#1a1a1f] text-gray-400 text-xs hover:text-amber-400 hover:border-amber-500/30 transition-all"
            >
              Import from file
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ──────────────────── LOADING STATE ──────────────────── */

  if (state === 'loading') {
    return (
      <div className="py-8 space-y-5">
        {/* Spinner hero */}
        <div className="flex flex-col items-center justify-center py-6">
          <div className="relative w-14 h-14 mb-5">
            <div className="absolute inset-0 rounded-full border-2 border-amber-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-orange-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <p className="text-white text-sm font-medium mb-1">Scanning on-chain transactions...</p>
          <p className="text-gray-600 text-xs font-mono">{truncateWallet(input.trim())}</p>
        </div>

        {/* Skeleton: Top bar */}
        <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="h-4 w-32 bg-[#1a1a1f] rounded shimmer" />
            <div className="h-10 w-16 bg-[#1a1a1f] rounded-xl shimmer" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div className="h-8 w-48 bg-[#1a1a1f] rounded shimmer" />
              <div className="h-3 w-full bg-[#1a1a1f] rounded shimmer" />
              <div className="h-5 w-32 bg-[#1a1a1f] rounded shimmer" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-[#111113] rounded-xl p-4">
                  <div className="h-2.5 w-16 bg-[#1a1a1f] rounded shimmer mb-3" />
                  <div className="h-5 w-20 bg-[#1a1a1f] rounded shimmer" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skeleton: Chart */}
        <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-2xl p-5 sm:p-6">
          <div className="h-[200px] bg-[#111113] rounded-xl shimmer" />
        </div>

        {/* Skeleton: Table */}
        <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a1a1f] flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-24 bg-[#1a1a1f] rounded-full shimmer" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-[#1a1a1f]/40">
              <div className="w-8 h-8 rounded-lg bg-[#1a1a1f] shimmer" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 bg-[#1a1a1f] rounded shimmer" />
                <div className="h-2 w-16 bg-[#1a1a1f] rounded shimmer" />
              </div>
              <div className="h-3 w-16 bg-[#1a1a1f] rounded shimmer" />
              <div className="h-3 w-14 bg-[#1a1a1f] rounded shimmer" />
              <div className="hidden lg:block h-3 w-12 bg-[#1a1a1f] rounded shimmer" />
              <div className="hidden lg:block h-3 w-14 bg-[#1a1a1f] rounded shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ──────────────────── ERROR STATE ──────────────────── */

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-2xl max-w-md w-full overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-500 to-red-600" />
          <div className="p-6 sm:p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-base mb-2">Analysis Failed</h3>
            <p className="text-red-400/90 text-sm mb-6 leading-relaxed">{error}</p>
            <button
              onClick={() => { setState('idle'); setError(''); }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 text-red-300 text-sm font-medium hover:border-red-500/50 hover:text-red-200 transition-all"
            >
              Try Again
            </button>
            <p className="text-gray-600 text-xs mt-4">
              Make sure the wallet address is valid and try again
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ──────────────────── RESULTS STATE ──────────────────── */

  if (!result) return null;

  const winRatePct = Math.min(100, Math.max(0, result.winRate));

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'top', label: 'Top Trades', count: result.tokens.length },
    { key: 'active', label: 'Active', count: result.tokens.filter(t => t.holding).length },
    { key: 'history', label: 'History', count: result.tokens.filter(t => !t.holding).length },
    { key: 'activity', label: 'Activity', count: result.tokens.length },
    { key: 'transfers', label: 'Transfers', count: (result.transfers || []).length },
  ];

  return (
    <div className="space-y-5 pb-6 stats-enter">

      {/* ── Top Bar ── */}
      <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-2xl px-5 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/5 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <p className="text-gray-500 text-[10px] uppercase tracking-wider">{savedWallets.wallets.find(w => w.address === result.wallet)?.name || 'Wallet'}</p>
            <div className="flex items-center gap-1.5">
              <p className="text-white text-sm font-mono">{truncateWallet(result.wallet)}</p>
              <button
                onClick={() => copyWallet(result.wallet)}
                className="text-gray-600 hover:text-amber-400 transition-colors"
              >
                {copied ? (
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Grade / Emoji badge */}
        {(() => {
          const saved = savedWallets.wallets.find(w => w.address === result.wallet);
          return (
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              {saved ? (
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${gradeGradient(result.grade)} flex items-center justify-center ${gradeGlow(result.grade)}`}>
                  <span className="text-2xl sm:text-3xl drop-shadow-lg">{saved.emoji}</span>
                </div>
              ) : (
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${gradeGradient(result.grade)} flex items-center justify-center ${gradeGlow(result.grade)}`}>
                  <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-lg">{result.grade}</span>
                </div>
              )}
              <span className="text-[9px] text-gray-500 font-medium">Grade {result.grade}</span>
            </div>
          );
        })()}
      </div>

      {/* ── Hero Section: PnL Summary + Stats Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: PnL Summary */}
        <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-2xl p-5 sm:p-6 flex flex-col justify-center">
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1.5">Total PnL</p>
          <p className={`text-3xl sm:text-4xl font-bold ${pnlColor(result.totalPnl)} mb-1`}>
            {result.totalPnl >= 0 ? '+' : ''}{formatSolWithUnit(result.totalPnl)}
          </p>
          {(result.totalPnlUsd != null) ? (
            <p className="text-gray-500 text-sm mb-5">
              {result.totalPnlUsd >= 0 ? '+' : ''}{formatUsdDirect(result.totalPnlUsd)}
            </p>
          ) : solPrice > 0 ? (
            <p className="text-gray-500 text-sm mb-5">
              ~{formatUsd(result.totalPnl, solPrice)}
            </p>
          ) : null}

          {/* Win Rate Bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Win Rate</p>
              <p className="text-white text-sm font-semibold">{winRatePct.toFixed(1)}%</p>
            </div>
            <div className="h-3 bg-red-500/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-700"
                style={{ width: `${winRatePct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-green-400/70 text-[10px]">{result.wins}W</span>
              <span className="text-red-400/70 text-[10px]">{result.losses}L</span>
            </div>
          </div>

          <div>
            <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-0.5">Total Invested</p>
            <p className="text-white text-lg font-semibold">
              {formatSolWithUnit(result.totalInvested)}
              {result.totalInvestedUsd != null ? (
                <span className="text-gray-600 text-sm font-normal ml-2">
                  {formatUsdDirect(result.totalInvestedUsd)}
                </span>
              ) : solPrice > 0 ? (
                <span className="text-gray-600 text-sm font-normal ml-2">
                  ~{formatUsd(result.totalInvested, solPrice)}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        {/* Right: Stats Grid 2x2 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-2xl p-5">
            <div className="flex items-center gap-1.5 mb-2.5">
              <div className="w-2 h-2 rounded-full bg-green-500/50" />
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Realized PnL</p>
            </div>
            <p className={`text-base sm:text-lg font-bold ${pnlColor(result.realizedPnl)}`}>
              {result.realizedPnl >= 0 ? '+' : ''}{formatSolWithUnit(result.realizedPnl)}
            </p>
            {result.realizedPnlUsd != null ? (
              <p className="text-gray-600 text-[10px] mt-1">{result.realizedPnlUsd >= 0 ? '+' : ''}{formatUsdDirect(result.realizedPnlUsd)}</p>
            ) : solPrice > 0 ? (
              <p className="text-gray-600 text-[10px] mt-1">{formatUsd(result.realizedPnl, solPrice)}</p>
            ) : null}
          </div>

          <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-2xl p-5">
            <div className="flex items-center gap-1.5 mb-2.5">
              <div className="w-2 h-2 rounded-full bg-blue-500/50" />
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Unrealized PnL</p>
            </div>
            <p className={`text-base sm:text-lg font-bold ${pnlColor(result.unrealizedPnl)}`}>
              {result.unrealizedPnl >= 0 ? '+' : ''}{formatSolWithUnit(result.unrealizedPnl)}
            </p>
            {solPrice > 0 && (
              <p className="text-gray-600 text-[10px] mt-1">{formatUsd(result.unrealizedPnl, solPrice)}</p>
            )}
          </div>

          <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-2xl p-5">
            <div className="flex items-center gap-1.5 mb-2.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Wins</p>
            </div>
            <p className="text-base sm:text-lg font-bold text-green-400">{result.wins}</p>
          </div>

          <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-2xl p-5">
            <div className="flex items-center gap-1.5 mb-2.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Losses</p>
            </div>
            <p className="text-base sm:text-lg font-bold text-red-400">{result.losses}</p>
          </div>
        </div>
      </div>

      {/* ── PnL Chart ── */}
      {(chartLoading || chartData.length > 0) && (
        <TradingChart
          type="area"
          data={showUsd && solPrice > 0 ? chartData.map(d => ({ time: d.time, value: d.value * solPrice })) : chartData}
          height={280}
          mobileHeight={200}
          color={result.totalPnl >= 0 ? 'green' : 'red'}
          loading={chartLoading}
          priceFormatter={showUsd ? undefined : (n: number) => {
            const abs = Math.abs(n);
            if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M SOL`;
            if (abs >= 1_000) return `${(n / 1_000).toFixed(2)}K SOL`;
            return `${n.toFixed(2)} SOL`;
          }}
          ranges={[
            { label: '7D', seconds: 604800 },
            { label: '30D', seconds: 2592000 },
            { label: 'Max', seconds: 0 },
          ]}
        />
      )}

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'bg-[#0d0d0f] border border-[#1a1a1f] text-gray-400 hover:text-white hover:border-[#333]'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        {solPrice > 0 && (
          <button
            onClick={() => setShowUsd(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#0d0d0f] border border-[#1a1a1f] text-xs font-medium text-gray-400 hover:text-white hover:border-[#333] transition-all flex-shrink-0"
            title={showUsd ? 'Switch to SOL' : 'Switch to USD'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="font-semibold">{showUsd ? 'USD' : 'SOL'}</span>
          </button>
        )}
      </div>

      {/* ── Tab Content ── */}
      <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-2xl overflow-hidden">
        {/* TOP TRADES TAB */}
        {activeTab === 'top' && (
          topTokens.length === 0 ? (
            <EmptyState message="No token trades found for this wallet" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1a1a1f]">
                      <SortableHeader label="Token" sortKey="symbol" currentSort={topSort} onSort={(k) => toggleSort(topSort, setTopSort, k)} align="left" />
                      <SortableHeader label="Invested" sortKey="invested" currentSort={topSort} onSort={(k) => toggleSort(topSort, setTopSort, k)} />
                      <SortableHeader label="PnL" sortKey="pnl" currentSort={topSort} onSort={(k) => toggleSort(topSort, setTopSort, k)} />
                      <SortableHeader label="ROI" sortKey="pnlPercent" currentSort={topSort} onSort={(k) => toggleSort(topSort, setTopSort, k)} />
                      <SortableHeader label="Buys/Sells" sortKey="trades" currentSort={topSort} onSort={(k) => toggleSort(topSort, setTopSort, k)} />
                      <th className="px-3 lg:px-4 py-3 text-right">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">Value</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTokens.slice(topPage * pageSize, (topPage + 1) * pageSize).map(token => (
                      <tr key={token.mint} className="border-b border-[#1a1a1f]/40 hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 lg:px-4 py-3">
                          <TokenCell token={token} />
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className="text-gray-300 text-xs">{formatValue(token.invested, token.investedUsd, solPrice, showUsd)}</span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className={`text-xs font-medium ${pnlColor(token.pnl)}`}>
                            {formatPnlValue(token.pnl, token.pnlUsd, solPrice, showUsd)}
                          </span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            token.pnlPercent > 0
                              ? 'bg-green-500/10 text-green-400'
                              : token.pnlPercent < 0
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-gray-500/10 text-gray-400'
                          }`}>
                            {formatPct(token.pnlPercent)}
                          </span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className="text-xs">
                            <span className="text-green-400/70">{token.buyTxns}</span>
                            <span className="text-gray-600 mx-0.5">/</span>
                            <span className="text-red-400/70">{token.sellTxns}</span>
                          </span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className="text-gray-400 text-xs">
                            {token.currentValue > 0 ? formatValue(token.currentValue, undefined, solPrice, showUsd) : '\u2014'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls page={topPage} setPage={setTopPage} pageSize={pageSize} setPageSize={setPageSize} totalItems={topTokens.length} />
            </>
          )
        )}

        {/* ACTIVE POSITIONS TAB */}
        {activeTab === 'active' && (
          activeTokens.length === 0 ? (
            <EmptyState message="No active positions found" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1a1a1f]">
                      <SortableHeader label="Token" sortKey="symbol" currentSort={activeSort} onSort={(k) => toggleSort(activeSort, setActiveSort, k)} align="left" />
                      <SortableHeader label="Invested" sortKey="invested" currentSort={activeSort} onSort={(k) => toggleSort(activeSort, setActiveSort, k)} />
                      <SortableHeader label="Value" sortKey="currentValue" currentSort={activeSort} onSort={(k) => toggleSort(activeSort, setActiveSort, k)} />
                      <SortableHeader label="Unrealized" sortKey="unrealized" currentSort={activeSort} onSort={(k) => toggleSort(activeSort, setActiveSort, k)} />
                      <SortableHeader label="ROI" sortKey="pnlPercent" currentSort={activeSort} onSort={(k) => toggleSort(activeSort, setActiveSort, k)} />
                      <th className="px-3 lg:px-4 py-3 text-right">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">Buys/Sells</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTokens.slice(activePage * pageSize, (activePage + 1) * pageSize).map(token => (
                      <tr key={token.mint} className="border-b border-[#1a1a1f]/40 hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 lg:px-4 py-3">
                          <TokenCell token={token} />
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className="text-gray-300 text-xs">{formatValue(token.invested, token.investedUsd, solPrice, showUsd)}</span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className="text-white text-xs font-medium">{formatValue(token.currentValue, undefined, solPrice, showUsd)}</span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className={`text-xs font-medium ${pnlColor(token.unrealized)}`}>
                            {formatPnlValue(token.unrealized, undefined, solPrice, showUsd)}
                          </span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            token.pnlPercent > 0
                              ? 'bg-green-500/10 text-green-400'
                              : token.pnlPercent < 0
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-gray-500/10 text-gray-400'
                          }`}>
                            {formatPct(token.pnlPercent)}
                          </span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className="text-xs">
                            <span className="text-green-400/70">{token.buyTxns}</span>
                            <span className="text-gray-600 mx-0.5">/</span>
                            <span className="text-red-400/70">{token.sellTxns}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls page={activePage} setPage={setActivePage} pageSize={pageSize} setPageSize={setPageSize} totalItems={activeTokens.length} />
            </>
          )
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          historyTokens.length === 0 ? (
            <EmptyState message="No completed trades found" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1a1a1f]">
                      <SortableHeader label="Token" sortKey="symbol" currentSort={historySort} onSort={(k) => toggleSort(historySort, setHistorySort, k)} align="left" />
                      <SortableHeader label="Bought" sortKey="invested" currentSort={historySort} onSort={(k) => toggleSort(historySort, setHistorySort, k)} />
                      <SortableHeader label="Sold" sortKey="totalSold" currentSort={historySort} onSort={(k) => toggleSort(historySort, setHistorySort, k)} />
                      <SortableHeader label="Profit" sortKey="realized" currentSort={historySort} onSort={(k) => toggleSort(historySort, setHistorySort, k)} />
                      <SortableHeader label="ROI" sortKey="pnlPercent" currentSort={historySort} onSort={(k) => toggleSort(historySort, setHistorySort, k)} />
                      <th className="px-3 lg:px-4 py-3 text-right">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">Buys/Sells</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyTokens.slice(historyPage * pageSize, (historyPage + 1) * pageSize).map(token => (
                      <tr key={token.mint} className="border-b border-[#1a1a1f]/40 hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 lg:px-4 py-3">
                          <TokenCell token={token} />
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className="text-gray-300 text-xs">{formatValue(token.invested, token.investedUsd, solPrice, showUsd)}</span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className="text-gray-300 text-xs">{formatValue(token.totalSold, undefined, solPrice, showUsd)}</span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className={`text-xs font-medium ${pnlColor(token.realized)}`}>
                            {formatPnlValue(token.realized, token.realizedUsd, solPrice, showUsd)}
                          </span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            token.pnlPercent > 0
                              ? 'bg-green-500/10 text-green-400'
                              : token.pnlPercent < 0
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-gray-500/10 text-gray-400'
                          }`}>
                            {formatPct(token.pnlPercent)}
                          </span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className="text-xs">
                            <span className="text-green-400/70">{token.buyTxns}</span>
                            <span className="text-gray-600 mx-0.5">/</span>
                            <span className="text-red-400/70">{token.sellTxns}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls page={historyPage} setPage={setHistoryPage} pageSize={pageSize} setPageSize={setPageSize} totalItems={historyTokens.length} />
            </>
          )
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          activityTokens.length === 0 ? (
            <EmptyState message="No trading activity found" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1a1a1f]">
                      <SortableHeader label="Token" sortKey="symbol" currentSort={activitySort} onSort={(k) => toggleSort(activitySort, setActivitySort, k)} align="left" />
                      <SortableHeader label="Last Trade" sortKey="lastTradeTime" currentSort={activitySort} onSort={(k) => toggleSort(activitySort, setActivitySort, k)} />
                      <th className="px-3 lg:px-4 py-3 text-right">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">Type</span>
                      </th>
                      <SortableHeader label="PnL" sortKey="pnl" currentSort={activitySort} onSort={(k) => toggleSort(activitySort, setActivitySort, k)} />
                      <SortableHeader label="ROI" sortKey="pnlPercent" currentSort={activitySort} onSort={(k) => toggleSort(activitySort, setActivitySort, k)} />
                    </tr>
                  </thead>
                  <tbody>
                    {activityTokens.slice(activityPage * pageSize, (activityPage + 1) * pageSize).map(token => (
                      <tr key={token.mint} className="border-b border-[#1a1a1f]/40 hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 lg:px-4 py-3">
                          <TokenCell token={token} />
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className="text-gray-400 text-xs">{relativeTime(token.lastTradeTime)}</span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className="text-xs">
                            <span className="text-green-400/70">{token.buyTxns}B</span>
                            <span className="text-gray-600 mx-0.5">/</span>
                            <span className="text-red-400/70">{token.sellTxns}S</span>
                          </span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className={`text-xs font-medium ${pnlColor(token.pnl)}`}>
                            {formatPnlValue(token.pnl, token.pnlUsd, solPrice, showUsd)}
                          </span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            token.pnlPercent > 0
                              ? 'bg-green-500/10 text-green-400'
                              : token.pnlPercent < 0
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-gray-500/10 text-gray-400'
                          }`}>
                            {formatPct(token.pnlPercent)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls page={activityPage} setPage={setActivityPage} pageSize={pageSize} setPageSize={setPageSize} totalItems={activityTokens.length} />
            </>
          )
        )}

        {/* TRANSFERS TAB */}
        {activeTab === 'transfers' && (
          (result.transfers || []).length === 0 ? (
            <EmptyState message="No SOL transfers found" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1a1a1f]">
                      <th className="px-3 lg:px-4 py-3 text-left">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">Type</span>
                      </th>
                      <th className="px-3 lg:px-4 py-3 text-right">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">Amount</span>
                      </th>
                      <th className="px-3 lg:px-4 py-3 text-left">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">Counterparty</span>
                      </th>
                      <th className="px-3 lg:px-4 py-3 text-right">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">Time</span>
                      </th>
                      <th className="px-3 lg:px-4 py-3 text-right">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">Tx</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result.transfers || []).slice(transfersPage * pageSize, (transfersPage + 1) * pageSize).map((t, i) => (
                      <tr key={`${t.signature}-${i}`} className="border-b border-[#1a1a1f]/40 hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 lg:px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            t.type === 'in'
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            {t.type === 'in' ? 'IN' : 'OUT'}
                          </span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className={`text-xs font-medium ${t.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                            {t.type === 'in' ? '+' : '-'}{showUsd && solPrice > 0 ? formatUsdDirect(t.amount * solPrice) : `${formatSol(t.amount)} SOL`}
                          </span>
                        </td>
                        <td className="px-3 lg:px-4 py-3">
                          <span className="text-gray-400 text-xs font-mono">{truncateWallet(t.counterparty)}</span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          <span className="text-gray-400 text-xs">{relativeTime(t.timestamp)}</span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-right">
                          {t.signature && (
                            <a
                              href={`https://solscan.io/tx/${t.signature}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-400/70 hover:text-amber-400 text-xs transition-colors"
                            >
                              View
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls page={transfersPage} setPage={setTransfersPage} pageSize={pageSize} setPageSize={setPageSize} totalItems={(result.transfers || []).length} />
            </>
          )
        )}
      </div>

      {/* ── Analyze Another ── */}
      <div className="text-center pt-2">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#1a1a1f] text-gray-400 text-sm hover:text-amber-400 hover:border-amber-500/30 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Analyze another wallet
        </button>
      </div>
    </div>
  );
}
