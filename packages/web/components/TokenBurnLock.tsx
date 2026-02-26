'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import {
  createBurnInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import {
  SolanaStreamClient,
  getBN,
  getNumberFromBN,
  StreamDirection,
  StreamType,
} from '@streamflow/stream';
import type { ICluster, Stream } from '@streamflow/stream';
import BN from 'bn.js';
import { trackSocialClick } from './Heartbeat';

/* ── Types ─────────────────────────────────────── */

interface TokenAccount {
  mint: string;
  balance: number;
  decimals: number;
  ata: string;
  programId: PublicKey;
}

interface TokenMeta {
  name: string;
  symbol: string;
  image: string;
}

interface BurnRecord {
  txSig: string;
  mint: string;
  amount: number;
  symbol: string;
  tokenName: string;
  tokenImage: string;
  timestamp: number;
}

interface LockInfo {
  id: string;
  mint: string;
  amount: number;
  decimals: number;
  startTime: number;
  unlockTime: number;
  withdrawn: boolean;
  name: string;
  symbol: string;
  image: string;
}

type Mode = 'burn' | 'lock';
type BurnTab = 'burn' | 'history';
type LockTab = 'new' | 'active';
type AppState = 'idle' | 'loading' | 'ready' | 'executing' | 'confirming' | 'success' | 'error';

/* ── Duration presets ──────────────────────────── */

const DURATION_PRESETS = [
  { label: '1 Day', seconds: 86_400 },
  { label: '7 Days', seconds: 604_800 },
  { label: '30 Days', seconds: 2_592_000 },
  { label: '90 Days', seconds: 7_776_000 },
  { label: '1 Year', seconds: 31_536_000 },
];

/* ── Helpers ───────────────────────────────────── */

function friendlyError(msg: string): string {
  if (msg.includes('insufficient funds')) return 'Insufficient SOL for transaction fees.';
  if (msg.includes('User rejected')) return '';
  if (msg.includes('blockhash') || msg.includes('expired')) return 'Transaction expired. Please try again.';
  return msg;
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Unlockable';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (parts.length === 0 || (d === 0 && h === 0)) parts.push(`${s}s`);
  return parts.join(' ');
}

function formatDuration(seconds: number): string {
  if (seconds <= 86400) return '1 Day';
  if (seconds <= 604800) return `${Math.round(seconds / 86400)} Days`;
  if (seconds <= 2592000) return `${Math.round(seconds / 86400)} Days`;
  if (seconds <= 7776000) return `${Math.round(seconds / 86400)} Days`;
  if (seconds <= 31536000) return `${Math.round(seconds / 2592000)} Months`;
  return `${(seconds / 31536000).toFixed(1)} Years`;
}

function getBurnHistoryKey(wallet: string): string {
  return `soltools-burn-history-${wallet}`;
}

function loadBurnHistory(wallet: string): BurnRecord[] {
  try {
    return JSON.parse(localStorage.getItem(getBurnHistoryKey(wallet)) || '[]');
  } catch { return []; }
}

function saveBurnRecord(wallet: string, record: BurnRecord) {
  const history = loadBurnHistory(wallet);
  history.unshift(record);
  if (history.length > 50) history.length = 50;
  localStorage.setItem(getBurnHistoryKey(wallet), JSON.stringify(history));
}

/* ── Share Image Generation ────────────────────── */

async function generateShareImage(params: {
  mode: 'burn' | 'lock';
  tokenName: string;
  tokenSymbol: string;
  tokenImage: string;
  amount: string;
  duration?: string;
  unlockDate?: string;
}): Promise<Blob | null> {
  const W = 1200, H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const isBurn = params.mode === 'burn';

  // ── Visible gradient background (matches SolTools branding) ──
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0c0015');
  bgGrad.addColorStop(0.35, '#130a22');
  bgGrad.addColorStop(0.65, '#0a1a12');
  bgGrad.addColorStop(1, '#0c0015');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Strong purple glow (top-left) ──
  const glow1 = ctx.createRadialGradient(150, 100, 0, 150, 100, 500);
  glow1.addColorStop(0, 'rgba(153,69,255,0.25)');
  glow1.addColorStop(0.4, 'rgba(153,69,255,0.08)');
  glow1.addColorStop(1, 'rgba(153,69,255,0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  // ── Green glow (bottom-right) ──
  const glow2 = ctx.createRadialGradient(1050, 530, 0, 1050, 530, 500);
  glow2.addColorStop(0, 'rgba(20,241,149,0.18)');
  glow2.addColorStop(0.4, 'rgba(20,241,149,0.05)');
  glow2.addColorStop(1, 'rgba(20,241,149,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // ── Center glow (action color) ──
  const centerColor = isBurn ? 'rgba(249,115,22,' : 'rgba(59,130,246,';
  const glow3 = ctx.createRadialGradient(600, 280, 0, 600, 280, 350);
  glow3.addColorStop(0, `${centerColor}0.12)`);
  glow3.addColorStop(0.5, `${centerColor}0.03)`);
  glow3.addColorStop(1, `${centerColor}0)`);
  ctx.fillStyle = glow3;
  ctx.fillRect(0, 0, W, H);

  // ── Top gradient accent bar ──
  const topBar = ctx.createLinearGradient(0, 0, W, 0);
  topBar.addColorStop(0, '#9945FF');
  topBar.addColorStop(0.5, '#14F195');
  topBar.addColorStop(1, '#9945FF');
  ctx.fillStyle = topBar;
  ctx.fillRect(0, 0, W, 4);

  // ── Token image (centered) ──
  let imgLoaded = false;
  const imgSize = 96;
  const imgX = 600 - imgSize / 2;
  const imgY = 50;

  if (params.tokenImage) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => { imgLoaded = true; resolve(); };
        img.onerror = () => reject();
        img.src = params.tokenImage;
      });

      // Soft glow ring
      const ringGlow = ctx.createRadialGradient(600, imgY + imgSize / 2, imgSize / 2 - 5, 600, imgY + imgSize / 2, imgSize + 10);
      ringGlow.addColorStop(0, 'rgba(153,69,255,0.2)');
      ringGlow.addColorStop(0.6, 'rgba(20,241,149,0.08)');
      ringGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ringGlow;
      ctx.beginPath();
      ctx.arc(600, imgY + imgSize / 2, imgSize + 10, 0, Math.PI * 2);
      ctx.fill();

      // Draw rounded image
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(imgX, imgY, imgSize, imgSize, 18);
      ctx.clip();
      ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
      ctx.restore();

      // Gradient border
      ctx.lineWidth = 2.5;
      const borderGrad = ctx.createLinearGradient(imgX, imgY, imgX + imgSize, imgY + imgSize);
      borderGrad.addColorStop(0, '#9945FF');
      borderGrad.addColorStop(1, '#14F195');
      ctx.strokeStyle = borderGrad;
      ctx.beginPath();
      ctx.roundRect(imgX, imgY, imgSize, imgSize, 18);
      ctx.stroke();
    } catch { /* image optional */ }
  }

  // ── Layout with generous spacing ──
  const startY = imgLoaded ? 190 : 140;

  // ── Title badge ──
  const title = isBurn ? 'BURNED' : 'LOCKED';
  ctx.textAlign = 'center';
  ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const titleMetrics = ctx.measureText(title);
  const pillW = titleMetrics.width + 70;
  const pillH = 48;
  const pillX = 600 - pillW / 2;
  const pillY = startY - 32;

  const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
  if (isBurn) {
    pillGrad.addColorStop(0, 'rgba(249,115,22,0.18)');
    pillGrad.addColorStop(1, 'rgba(239,68,68,0.12)');
  } else {
    pillGrad.addColorStop(0, 'rgba(59,130,246,0.18)');
    pillGrad.addColorStop(1, 'rgba(6,182,212,0.12)');
  }
  ctx.fillStyle = pillGrad;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 24);
  ctx.fill();

  ctx.strokeStyle = isBurn ? 'rgba(249,115,22,0.35)' : 'rgba(59,130,246,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 24);
  ctx.stroke();

  ctx.fillStyle = isBurn ? '#f97316' : '#3b82f6';
  ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(isBurn ? '\uD83D\uDD25 ' + title : '\uD83D\uDD12 ' + title, 600, startY);

  // ── Token name (generous gap) ──
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const nameText = params.tokenSymbol ? `${params.tokenName} ($${params.tokenSymbol})` : params.tokenName;
  ctx.fillText(nameText || 'Unknown Token', 600, startY + 60);

  // ── Amount (big, clean white) ──
  ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const amountText = `${Number(params.amount).toLocaleString()}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(amountText, 600, startY + 155);

  // "tokens" label
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('tokens', 600, startY + 192);

  // ── Action description (generous gap) ──
  const descY = startY + 252;
  if (isBurn) {
    const descGrad = ctx.createLinearGradient(400, descY, 800, descY);
    descGrad.addColorStop(0, '#f97316');
    descGrad.addColorStop(1, '#ef4444');
    ctx.fillStyle = descGrad;
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('burned forever', 600, descY);
  } else {
    const descGrad = ctx.createLinearGradient(400, descY, 800, descY);
    descGrad.addColorStop(0, '#3b82f6');
    descGrad.addColorStop(1, '#06b6d4');
    ctx.fillStyle = descGrad;
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(`locked for ${params.duration || ''}`, 600, descY);
    if (params.unlockDate) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(`Unlocks: ${params.unlockDate}`, 600, descY + 38);
    }
  }

  // ── Footer band ──
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, H - 64, W, 64);

  // Separator line (gradient)
  const sepGrad = ctx.createLinearGradient(100, 0, W - 100, 0);
  sepGrad.addColorStop(0, 'rgba(153,69,255,0)');
  sepGrad.addColorStop(0.15, 'rgba(153,69,255,0.5)');
  sepGrad.addColorStop(0.5, 'rgba(20,241,149,0.5)');
  sepGrad.addColorStop(0.85, 'rgba(153,69,255,0.5)');
  sepGrad.addColorStop(1, 'rgba(153,69,255,0)');
  ctx.fillStyle = sepGrad;
  ctx.fillRect(0, H - 64, W, 2);

  // Footer text
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  const footLeftGrad = ctx.createLinearGradient(60, 0, 240, 0);
  footLeftGrad.addColorStop(0, '#9945FF');
  footLeftGrad.addColorStop(1, '#14F195');
  ctx.fillStyle = footLeftGrad;
  ctx.fillText('SolTools.net', 60, H - 26);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('@SolToolsApp', W - 60, H - 26);

  // ── Bottom gradient accent bar ──
  ctx.fillStyle = topBar;
  ctx.fillRect(0, H - 4, W, 4);

  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'));
}

/* ── Icons ─────────────────────────────────────── */

const FireIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
  </svg>
);

const LockIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const UnlockIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
  </svg>
);

const DownloadIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ShareIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

/* ── Main Component ────────────────────────────── */

export const TokenBurnLock = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction, connected, wallet } = useWallet();

  // Core state
  const [mode, setMode] = useState<Mode>('burn');
  const [state, setState] = useState<AppState>('idle');
  const [tokens, setTokens] = useState<TokenAccount[]>([]);
  const [selected, setSelected] = useState<TokenAccount | null>(null);
  const [amount, setAmount] = useState('');
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [txSig, setTxSig] = useState('');
  const [search, setSearch] = useState('');
  const [meta, setMeta] = useState<Record<string, TokenMeta>>({});

  // Sub-tabs
  const [burnTab, setBurnTab] = useState<BurnTab>('burn');
  const [lockTab, setLockTab] = useState<LockTab>('new');

  // Lock-specific state
  const [lockDuration, setLockDuration] = useState<number>(0);
  const [lockPreset, setLockPreset] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState('');
  const [locks, setLocks] = useState<LockInfo[]>([]);
  const [locksLoading, setLocksLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Burn history
  const [burnHistory, setBurnHistory] = useState<BurnRecord[]>([]);

  // Share image
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [shareImageBlob, setShareImageBlob] = useState<Blob | null>(null);

  // Lock result info (for success screen)
  const lockResultRef = useRef<{ duration: string; unlockDate: string } | null>(null);

  /* ── Streamflow Client ─────────────────────────── */
  const streamClient = useMemo(() => {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    if (!rpcUrl) return null;
    try {
      return new SolanaStreamClient(rpcUrl, 'mainnet' as ICluster);
    } catch { return null; }
  }, []);

  /* ── Metadata fetch ────────────────────────────── */
  const fetchMetadata = useCallback(async (mints: string[]) => {
    if (mints.length === 0) return;
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    if (!rpcUrl) return;
    try {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'meta',
          method: 'getAssetBatch',
          params: { ids: mints },
        }),
      });
      const data = await res.json();
      if (data.result && Array.isArray(data.result)) {
        const m: Record<string, TokenMeta> = {};
        for (const asset of data.result) {
          if (asset && asset.id) {
            m[asset.id] = {
              name: asset.content?.metadata?.name || '',
              symbol: asset.content?.metadata?.symbol || '',
              image: asset.content?.links?.image || asset.content?.files?.[0]?.uri || '',
            };
          }
        }
        setMeta(prev => ({ ...prev, ...m }));
      }
    } catch { /* metadata is optional */ }
  }, []);

  /* ── Token fetch ───────────────────────────────── */
  const fetchTokens = useCallback(async () => {
    if (!publicKey || !connection) return;
    setState('loading');
    setError('');
    try {
      const [resp, resp2022] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID }),
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_2022_PROGRAM_ID }),
      ]);
      const parse = (accounts: typeof resp.value, progId: PublicKey): TokenAccount[] =>
        accounts.map(acc => {
          const info = acc.account.data.parsed.info;
          return {
            mint: info.mint,
            balance: Number(info.tokenAmount.uiAmount),
            decimals: info.tokenAmount.decimals,
            ata: acc.pubkey.toBase58(),
            programId: progId,
          };
        });
      const list = [...parse(resp.value, TOKEN_PROGRAM_ID), ...parse(resp2022.value, TOKEN_2022_PROGRAM_ID)]
        .filter(t => t.balance > 0)
        .sort((a, b) => b.balance - a.balance);
      setTokens(list);
      fetchMetadata(list.map(t => t.mint));
      setState('ready');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch tokens');
      setState('error');
    }
  }, [publicKey, connection, fetchMetadata]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchTokens();
      setBurnHistory(loadBurnHistory(publicKey.toBase58()));
    } else {
      setState('idle');
      setTokens([]);
      setSelected(null);
    }
  }, [connected, publicKey, fetchTokens]);

  /* ── Fetch Streamflow locks ────────────────────── */
  const fetchLocks = useCallback(async () => {
    if (!publicKey || !streamClient) return;
    setLocksLoading(true);
    try {
      const streams = await streamClient.get({
        address: publicKey.toBase58(),
        type: StreamType.All,
        direction: StreamDirection.All,
      });

      const lockList: LockInfo[] = [];
      const mintSet = new Set<string>();

      for (const [id, stream] of streams) {
        // Only show streams created by this wallet (locks to self)
        if (stream.sender !== publicKey.toBase58()) continue;
        // Skip cancelled streams
        if (stream.canceledAt > 0) continue;

        const decimals = 9; // we'll refine from token list
        const tokenMatch = tokens.find(t => t.mint === stream.mint);
        const dec = tokenMatch?.decimals ?? decimals;

        const depositedAmount = getNumberFromBN(stream.depositedAmount, dec);
        const withdrawnAmount = getNumberFromBN(stream.withdrawnAmount, dec);
        const isWithdrawn = withdrawnAmount >= depositedAmount * 0.99; // ~fully withdrawn

        mintSet.add(stream.mint);

        lockList.push({
          id,
          mint: stream.mint,
          amount: depositedAmount,
          decimals: dec,
          startTime: stream.start,
          unlockTime: stream.cliff > 0 ? stream.cliff : stream.end,
          withdrawn: isWithdrawn || stream.closed,
          name: meta[stream.mint]?.name || '',
          symbol: meta[stream.mint]?.symbol || '',
          image: meta[stream.mint]?.image || '',
        });
      }

      // Fetch metadata for mints we don't have yet
      const unknownMints = [...mintSet].filter(m => !meta[m]);
      if (unknownMints.length > 0) {
        await fetchMetadata(unknownMints);
      }

      // Sort: active first, then by unlock time
      lockList.sort((a, b) => {
        if (a.withdrawn !== b.withdrawn) return a.withdrawn ? 1 : -1;
        return a.unlockTime - b.unlockTime;
      });

      setLocks(lockList);
    } catch (e) {
      console.error('Failed to fetch locks:', e);
    } finally {
      setLocksLoading(false);
    }
  }, [publicKey, streamClient, tokens, meta, fetchMetadata]);

  // Fetch locks when switching to active tab or on connect
  useEffect(() => {
    if (mode === 'lock' && lockTab === 'active' && publicKey && streamClient) {
      fetchLocks();
    }
  }, [mode, lockTab, publicKey, streamClient, fetchLocks]);

  /* ── Countdown timer ───────────────────────────── */
  useEffect(() => {
    if (mode !== 'lock' || lockTab !== 'active' || locks.length === 0) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [mode, lockTab, locks.length]);

  /* ── Update lock metadata once meta loads ──────── */
  useEffect(() => {
    if (locks.length === 0) return;
    setLocks(prev => prev.map(lock => ({
      ...lock,
      name: meta[lock.mint]?.name || lock.name,
      symbol: meta[lock.mint]?.symbol || lock.symbol,
      image: meta[lock.mint]?.image || lock.image,
    })));
  // Only trigger when meta changes, not locks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta]);

  /* ── Handle custom date ────────────────────────── */
  useEffect(() => {
    if (!customDate) return;
    const target = new Date(customDate).getTime();
    const diff = Math.floor((target - Date.now()) / 1000);
    if (diff >= 3600) {
      setLockDuration(diff);
      setLockPreset(null);
    }
  }, [customDate]);

  /* ── Execute burn ──────────────────────────────── */
  const executeBurn = async () => {
    if (!publicKey || !selected || !connection || !signTransaction) return;

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0 || val > selected.balance) {
      setError('Enter a valid amount');
      return;
    }

    setState('executing');
    setError('');

    try {
      const mintPubkey = new PublicKey(selected.mint);
      const progId = selected.programId;
      const rawAmount = BigInt(Math.floor(val * Math.pow(10, selected.decimals)));
      const ata = await getAssociatedTokenAddress(mintPubkey, publicKey, false, progId);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [
          createBurnInstruction(ata, mintPubkey, publicKey, rawAmount, [], progId),
        ],
      }).compileToV0Message();

      const vtx = new VersionedTransaction(messageV0);
      const signed = await signTransaction(vtx);
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: true,
        maxRetries: 3,
      });
      setState('confirming');
      setTxSig(signature);

      const start = Date.now();
      let ok = false;
      while (Date.now() - start < 60_000) {
        const statuses = await connection.getSignatureStatuses([signature]);
        const v = statuses?.value?.[0];
        if (v?.confirmationStatus === 'confirmed' || v?.confirmationStatus === 'finalized') { ok = true; break; }
        await new Promise(r => setTimeout(r, 2000));
      }

      if (ok) {
        // Save burn history
        const m = meta[selected.mint];
        saveBurnRecord(publicKey.toBase58(), {
          txSig: signature,
          mint: selected.mint,
          amount: val,
          symbol: m?.symbol || '',
          tokenName: m?.name || '',
          tokenImage: m?.image || '',
          timestamp: Date.now(),
        });
        setBurnHistory(loadBurnHistory(publicKey.toBase58()));

        // Generate share image
        try {
          const blob = await generateShareImage({
            mode: 'burn',
            tokenName: m?.name || 'Unknown',
            tokenSymbol: m?.symbol || '',
            tokenImage: m?.image || '',
            amount: amount,
          });
          if (blob) {
            setShareImageBlob(blob);
            setShareImageUrl(URL.createObjectURL(blob));
          }
        } catch { /* share image is optional */ }

        setState('success');
      } else {
        setError('Transaction sent but confirmation timed out. Check Solscan.');
        setState('error');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? friendlyError(e.message) : 'Burn failed';
      if (msg) { setError(msg); setState('error'); }
      else { setState('ready'); }
    }
  };

  /* ── Execute lock (Streamflow) ─────────────────── */
  const executeLock = async () => {
    if (!publicKey || !selected || !streamClient || !wallet?.adapter) return;
    if (lockDuration <= 0) {
      setError('Select a lock duration');
      return;
    }

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0 || val > selected.balance) {
      setError('Enter a valid amount');
      return;
    }

    setState('executing');
    setError('');

    try {
      const nowSec = Math.floor(Date.now() / 1000);
      const cliffTime = nowSec + lockDuration;
      const amountBN = getBN(val, selected.decimals);

      const createParams = {
        recipient: publicKey.toBase58(),
        tokenId: selected.mint,
        start: nowSec,
        amount: amountBN,
        period: 1,
        cliff: cliffTime,
        cliffAmount: amountBN,
        amountPerPeriod: new BN(1),
        name: 'SolTools Lock',
        cancelableBySender: false,
        cancelableByRecipient: false,
        transferableBySender: false,
        transferableByRecipient: false,
        canTopup: false,
        automaticWithdrawal: false,
      };

      const solanaParams = {
        sender: wallet.adapter as any,
        isNative: false,
      };

      setState('confirming');
      const { txId, metadataId } = await streamClient.create(createParams, solanaParams);
      setTxSig(txId);

      // Store lock result info for success screen
      const unlockDate = new Date(cliffTime * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      lockResultRef.current = {
        duration: formatDuration(lockDuration),
        unlockDate,
      };

      // Generate share image
      const m = meta[selected.mint];
      try {
        const blob = await generateShareImage({
          mode: 'lock',
          tokenName: m?.name || 'Unknown',
          tokenSymbol: m?.symbol || '',
          tokenImage: m?.image || '',
          amount: amount,
          duration: formatDuration(lockDuration),
          unlockDate,
        });
        if (blob) {
          setShareImageBlob(blob);
          setShareImageUrl(URL.createObjectURL(blob));
        }
      } catch { /* share image is optional */ }

      setState('success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? friendlyError(e.message) : 'Lock failed';
      if (msg) { setError(msg); setState('error'); }
      else { setState('ready'); }
    }
  };

  /* ── Unlock (withdraw from Streamflow) ─────────── */
  const unlockStream = async (lockId: string) => {
    if (!publicKey || !streamClient || !wallet?.adapter) return;
    setError('');
    try {
      await streamClient.withdraw(
        { id: lockId },
        { invoker: wallet.adapter as any },
      );
      // Refresh locks
      await fetchLocks();
    } catch (e: unknown) {
      const msg = e instanceof Error ? friendlyError(e.message) : 'Unlock failed';
      if (msg) setError(msg);
    }
  };

  /* ── Percentage handler ────────────────────────── */
  const handlePct = (p: number) => {
    if (!selected) return;
    setPct(p);
    setAmount((selected.balance * p / 100).toString());
  };

  /* ── Reset ─────────────────────────────────────── */
  const reset = () => {
    setSelected(null);
    setAmount('');
    setPct(null);
    setError('');
    setTxSig('');
    setLockDuration(0);
    setLockPreset(null);
    setCustomDate('');
    lockResultRef.current = null;
    if (shareImageUrl) URL.revokeObjectURL(shareImageUrl);
    setShareImageUrl(null);
    setShareImageBlob(null);
    setState('ready');
  };

  /* ── Mode switch ───────────────────────────────── */
  const switchMode = (m: Mode) => {
    setMode(m);
    setAmount('');
    setPct(null);
    setError('');
    setLockDuration(0);
    setLockPreset(null);
    setCustomDate('');
  };

  const isBurn = mode === 'burn';

  /* ── Share handlers ────────────────────────────── */
  const downloadShareImage = () => {
    if (!shareImageBlob || !selected) return;
    const m = meta[selected.mint];
    const sym = m?.symbol || selected.mint.slice(0, 6);
    const prefix = isBurn ? 'burn' : 'lock';
    const url = URL.createObjectURL(shareImageBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soltools-${prefix}-${sym}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareOnX = () => {
    const m = meta[selected?.mint || ''];
    const sym = m?.symbol ? `$${m.symbol}` : '';
    let text: string;
    if (isBurn) {
      text = `I just burned ${Number(amount).toLocaleString()} ${sym} using @SolToolsApp \uD83D\uDD25\n\nsoltools.net/burn-lock\n\n#Solana #TokenBurn #SolTools${m?.symbol ? ` #${m.symbol}` : ''}`;
    } else {
      const dur = lockResultRef.current?.duration || formatDuration(lockDuration);
      text = `I just locked ${Number(amount).toLocaleString()} ${sym} for ${dur} using @SolToolsApp \uD83D\uDD12\n\nsoltools.net/burn-lock\n\n#Solana #TokenLock #SolTools${m?.symbol ? ` #${m.symbol}` : ''}`;
    }

    // Download image first so user can attach it to the tweet
    if (shareImageBlob) {
      downloadShareImage();
    }

    // Track the share click
    trackSocialClick('share-burn');

    // Open X/Twitter compose directly
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  // ──────────── NOT CONNECTED ────────────
  if (!connected) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 flex items-center justify-center border border-orange-500/20">
              <FireIcon className="w-7 h-7 text-orange-500" />
            </div>
            <div className="w-[1px] h-10 bg-[#222228]" />
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center border border-blue-500/20">
              <LockIcon className="w-7 h-7 text-blue-500" />
            </div>
          </div>
          <h2 className="text-white font-bold text-xl mb-2">Burn or Lock</h2>
          <p className="text-gray-400 text-sm mb-2 max-w-md mx-auto leading-relaxed">
            Permanently remove tokens from circulation or lock them with time-based enforcement via Streamflow.
          </p>
          <p className="text-gray-600 text-xs">Connect your wallet above to get started.</p>
        </div>
      </div>
    );
  }

  // ──────────── LOADING ────────────
  if (state === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-solana-purple/30 border-t-solana-purple rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your tokens...</p>
        </div>
      </div>
    );
  }

  // ──────────── SUCCESS ────────────
  if (state === 'success') {
    const m = meta[selected?.mint || ''];
    return (
      <div className="flex-1 overflow-y-auto scroll-fade">
        <div className="max-w-md mx-auto px-5 py-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-solana-green/10 flex items-center justify-center border border-solana-green/30">
              <svg className="w-8 h-8 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-white font-bold text-xl mb-2">
              {isBurn ? 'Tokens Burned' : 'Tokens Locked'}
            </h2>
            <p className="text-gray-400 text-sm mb-1">
              {Number(amount).toLocaleString()} {m?.symbol ? `$${m.symbol}` : 'tokens'} {isBurn ? 'permanently removed from circulation' : `locked for ${lockResultRef.current?.duration || ''}`}.
            </p>
            {!isBurn && lockResultRef.current && (
              <p className="text-gray-500 text-[11px] mb-3">
                Unlocks: {lockResultRef.current.unlockDate}
              </p>
            )}
            {txSig && (
              <a
                href={`https://solscan.io/tx/${txSig}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-solana-purple text-xs hover:underline inline-flex items-center gap-1 mb-5"
              >
                View on Solscan
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}

            {/* Share Image Preview */}
            {shareImageUrl && (
              <div className="mt-4 mb-4">
                <img
                  src={shareImageUrl}
                  alt="Share card"
                  className="w-full max-w-[400px] mx-auto rounded-xl border border-[#222228]"
                />
              </div>
            )}

            {/* Share Actions */}
            {shareImageBlob && (
              <div className="flex items-center justify-center gap-3 mb-2">
                <button
                  onClick={downloadShareImage}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111113] border border-[#222228] text-white text-xs font-medium hover:border-[#333] transition-all"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  Download Image
                </button>
                <button
                  onClick={shareOnX}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111113] border border-[#222228] text-white text-xs font-medium hover:border-[#333] transition-all"
                >
                  <ShareIcon className="w-3.5 h-3.5" />
                  Share on X
                </button>
              </div>
            )}
            {shareImageBlob && (
              <p className="text-gray-600 text-[9px] mb-4">
                Tip: Download image and attach it to your tweet for max visibility
              </p>
            )}

            <button onClick={reset} className="px-6 py-2.5 rounded-xl bg-[#111113] border border-[#222228] text-white text-sm font-medium hover:border-[#333] transition-all">
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────── MAIN LAYOUT ────────────
  const filtered = tokens.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    const m = meta[t.mint];
    return t.mint.toLowerCase().includes(q) || m?.name?.toLowerCase().includes(q) || m?.symbol?.toLowerCase().includes(q);
  });

  const activeLocks = locks.filter(l => !l.withdrawn);
  const pastLocks = locks.filter(l => l.withdrawn);

  return (
    <div className="flex-1 overflow-y-auto scroll-fade">
      <div className="max-w-xl mx-auto px-5 py-4">

        {/* Token selector */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-semibold text-sm">Your Tokens</h2>
              <span className="text-gray-600 text-[11px]">{tokens.length} with balance</span>
            </div>
            <button
              onClick={fetchTokens}
              className="text-gray-500 hover:text-white text-[11px] flex items-center gap-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
          {tokens.length > 5 && (
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or mint..."
              className="w-full bg-[#0d0d0f] border border-[#1a1a1f] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-solana-purple/40 focus:outline-none transition-colors mb-2"
            />
          )}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {filtered.map(token => {
              const isActive = selected?.ata === token.ata;
              const m = meta[token.mint];
              return (
                <button
                  key={token.ata}
                  onClick={() => { setSelected(token); setError(''); setAmount(''); setPct(null); }}
                  className={`flex-shrink-0 rounded-xl px-3 py-2.5 flex items-center gap-2.5 transition-all text-left ${
                    isActive
                      ? 'bg-solana-purple/[0.08] border border-solana-purple/30'
                      : 'bg-[#0d0d0f] border border-[#1a1a1f] hover:border-[#333]'
                  }`}
                >
                  {m?.image ? (
                    <img src={m.image} alt="" className="w-7 h-7 rounded-md flex-shrink-0 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-solana-purple/15 text-solana-purple' : 'bg-[#111113] text-gray-600'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className={`text-[11px] font-semibold truncate max-w-[120px] ${isActive ? 'text-white' : 'text-gray-300'}`}>
                      {m?.symbol ? `$${m.symbol}` : `${token.mint.slice(0, 6)}...`}
                    </p>
                    <p className="text-gray-500 text-[9px]">{token.balance.toLocaleString()}</p>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && tokens.length > 0 && (
              <p className="text-gray-600 text-xs py-2">No tokens match your search.</p>
            )}
            {tokens.length === 0 && state === 'ready' && (
              <div className="flex items-center gap-2 py-3 px-3 rounded-xl bg-[#111113] border border-[#1a1a1f]">
                <div className="w-7 h-7 rounded-md bg-solana-purple/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-gray-500 text-xs">No tokens with balance found in this wallet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Action panel — always visible */}
        <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-2xl p-5">
            {/* Mode toggle */}
            <div className="flex p-1 rounded-xl bg-[#111113] border border-[#1a1a1f] mb-4">
              <button
                onClick={() => switchMode('burn')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
                  isBurn
                    ? 'bg-gradient-to-r from-orange-500/15 to-red-500/10 text-orange-400 border border-orange-500/20'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <FireIcon className="w-3.5 h-3.5" />
                Burn
              </button>
              <button
                onClick={() => switchMode('lock')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
                  !isBurn
                    ? 'bg-gradient-to-r from-blue-500/15 to-cyan-500/10 text-blue-400 border border-blue-500/20'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <LockIcon className="w-3.5 h-3.5" />
                Lock
              </button>
            </div>

            {/* Sub-tabs */}
            {isBurn ? (
              <div className="flex gap-1 mb-4">
                <button
                  onClick={() => setBurnTab('burn')}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    burnTab === 'burn'
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      : 'text-gray-500 hover:text-gray-300 border border-transparent'
                  }`}
                >
                  Burn
                </button>
                <button
                  onClick={() => setBurnTab('history')}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    burnTab === 'history'
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      : 'text-gray-500 hover:text-gray-300 border border-transparent'
                  }`}
                >
                  History{burnHistory.length > 0 ? ` (${burnHistory.length})` : ''}
                </button>
              </div>
            ) : (
              <div className="flex gap-1 mb-4">
                <button
                  onClick={() => setLockTab('new')}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    lockTab === 'new'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'text-gray-500 hover:text-gray-300 border border-transparent'
                  }`}
                >
                  New Lock
                </button>
                <button
                  onClick={() => setLockTab('active')}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    lockTab === 'active'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'text-gray-500 hover:text-gray-300 border border-transparent'
                  }`}
                >
                  My Locks{activeLocks.length > 0 ? ` (${activeLocks.length})` : ''}
                </button>
              </div>
            )}

            {/* ═══ BURN TAB ═══ */}
            {isBurn && burnTab === 'burn' && !selected && (
              <div className="text-center py-8">
                <FireIcon className="w-10 h-10 text-orange-500/30 mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-medium mb-1">Select a token to burn</p>
                <p className="text-gray-600 text-xs">Choose from your tokens above to get started.</p>
              </div>
            )}
            {isBurn && burnTab === 'burn' && selected && (
              <>
                {/* Token info */}
                <TokenInfoHeader selected={selected} meta={meta} />

                {/* Amount input */}
                <AmountInput
                  amount={amount}
                  setAmount={(v) => { setAmount(v); setPct(null); }}
                  accent="orange"
                />

                {/* Percent buttons */}
                <div className="grid grid-cols-4 gap-1.5 mb-4">
                  {[25, 50, 75, 100].map(p => (
                    <button
                      key={p}
                      onClick={() => handlePct(p)}
                      className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-150 ${
                        pct === p
                          ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                          : 'bg-[#111113] border-[#1a1a1f] text-gray-500 hover:text-white hover:border-[#333]'
                      }`}
                    >
                      {p === 100 ? 'MAX' : `${p}%`}
                    </button>
                  ))}
                </div>

                {/* Burn info */}
                <div className="mb-4 px-3 py-2.5 rounded-lg bg-orange-500/[0.05] border border-orange-500/15">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <FireIcon className="w-3 h-3 text-orange-400" />
                    <span className="text-orange-400 text-[10px] font-semibold">Permanent Burn</span>
                  </div>
                  <p className="text-gray-500 text-[10px] leading-relaxed">
                    Tokens are <span className="text-gray-300 font-medium">destroyed forever</span>. Removed from supply and can never be recovered.
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px]">
                    {error}
                  </div>
                )}

                {/* Execute button */}
                <button
                  onClick={executeBurn}
                  disabled={
                    state === 'executing' || state === 'confirming' ||
                    !amount || parseFloat(amount) <= 0 || parseFloat(amount) > selected.balance
                  }
                  className="w-full py-2.5 rounded-xl text-white font-semibold text-[13px] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] disabled:hover:shadow-none"
                >
                  {state === 'executing' || state === 'confirming' ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {state === 'executing' ? 'Signing...' : 'Confirming...'}
                    </>
                  ) : (
                    <>
                      <FireIcon className="w-4 h-4" />
                      Burn {amount ? `${Number(amount).toLocaleString()} Tokens` : 'Tokens'}
                    </>
                  )}
                </button>
                <p className="text-gray-600 text-[9px] text-center mt-2">
                  Permanent and irreversible. Tokens destroyed via burn instruction.
                </p>
              </>
            )}

            {/* ═══ BURN HISTORY TAB ═══ */}
            {isBurn && burnTab === 'history' && (
              <div className="space-y-2.5">
                {burnHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <FireIcon className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No burn history yet</p>
                    <p className="text-gray-600 text-xs">Burn some tokens to see them here.</p>
                  </div>
                ) : (
                  burnHistory.map((record, i) => (
                    <div key={`${record.txSig}-${i}`} className="rounded-xl bg-[#111113] border border-[#1a1a1f] p-3 hover:border-orange-500/20 transition-all">
                      <div className="flex items-center gap-2.5">
                        {record.tokenImage ? (
                          <img src={record.tokenImage} alt="" className="w-8 h-8 rounded-lg flex-shrink-0 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                            <FireIcon className="w-4 h-4 text-orange-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-[12px] font-semibold truncate">
                            {record.tokenName || record.mint.slice(0, 8) + '...'}
                            {record.symbol && <span className="text-gray-500 font-normal ml-1">${record.symbol}</span>}
                          </p>
                          <p className="text-orange-400 text-[11px] font-mono">
                            {record.amount.toLocaleString()} burned
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-gray-500 text-[10px]">
                            {new Date(record.timestamp).toLocaleDateString()}
                          </p>
                          <a
                            href={`https://solscan.io/tx/${record.txSig}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-solana-purple text-[9px] hover:underline"
                          >
                            Solscan
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ═══ NEW LOCK TAB ═══ */}
            {!isBurn && lockTab === 'new' && !selected && (
              <div className="text-center py-8">
                <LockIcon className="w-10 h-10 text-blue-500/30 mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-medium mb-1">Select a token to lock</p>
                <p className="text-gray-600 text-xs">Choose from your tokens above to get started.</p>
              </div>
            )}
            {!isBurn && lockTab === 'new' && selected && (
              <>
                {/* Token info */}
                <TokenInfoHeader selected={selected} meta={meta} />

                {/* Amount input */}
                <AmountInput
                  amount={amount}
                  setAmount={(v) => { setAmount(v); setPct(null); }}
                  accent="blue"
                />

                {/* Percent buttons */}
                <div className="grid grid-cols-4 gap-1.5 mb-4">
                  {[25, 50, 75, 100].map(p => (
                    <button
                      key={p}
                      onClick={() => handlePct(p)}
                      className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-150 ${
                        pct === p
                          ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                          : 'bg-[#111113] border-[#1a1a1f] text-gray-500 hover:text-white hover:border-[#333]'
                      }`}
                    >
                      {p === 100 ? 'MAX' : `${p}%`}
                    </button>
                  ))}
                </div>

                {/* Duration presets */}
                <div className="mb-3">
                  <p className="text-gray-400 text-[11px] font-semibold mb-2">Lock Duration</p>
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    {DURATION_PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setLockDuration(preset.seconds);
                          setLockPreset(preset.label);
                          setCustomDate('');
                        }}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-150 ${
                          lockPreset === preset.label
                            ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                            : 'bg-[#111113] border-[#1a1a1f] text-gray-500 hover:text-white hover:border-[#333]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setLockPreset('custom');
                        // Default custom to empty so user picks
                        if (!customDate) {
                          const minDate = new Date(Date.now() + 3600_000);
                          setCustomDate(minDate.toISOString().slice(0, 16));
                          setLockDuration(3600);
                        }
                      }}
                      className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-150 ${
                        lockPreset === 'custom'
                          ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                          : 'bg-[#111113] border-[#1a1a1f] text-gray-500 hover:text-white hover:border-[#333]'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {/* Custom date picker */}
                  {lockPreset === 'custom' && (
                    <input
                      type="datetime-local"
                      value={customDate}
                      min={new Date(Date.now() + 3600_000).toISOString().slice(0, 16)}
                      onChange={e => setCustomDate(e.target.value)}
                      className="w-full bg-[#111113] border border-[#1a1a1f] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/40 focus:outline-none transition-colors mb-2"
                    />
                  )}
                </div>

                {/* Lock summary */}
                {lockDuration > 0 && (
                  <div className="mb-4 px-3 py-2.5 rounded-lg bg-blue-500/[0.05] border border-blue-500/15">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <LockIcon className="w-3 h-3 text-blue-400" />
                      <span className="text-blue-400 text-[10px] font-semibold">Lock Summary</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-[10px]">Unlocks</span>
                        <span className="text-gray-300 text-[10px] font-medium">
                          {new Date(Date.now() + lockDuration * 1000).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })} ({formatDuration(lockDuration)})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-[10px]">Protocol</span>
                        <span className="text-gray-300 text-[10px] font-medium">Streamflow (audited)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-[10px]">Rent</span>
                        <span className="text-gray-300 text-[10px] font-medium">~0.117 SOL (refunded on unlock)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px]">
                    {error}
                  </div>
                )}

                {/* Execute button */}
                <button
                  onClick={executeLock}
                  disabled={
                    state === 'executing' || state === 'confirming' ||
                    !amount || parseFloat(amount) <= 0 || parseFloat(amount) > selected.balance ||
                    lockDuration <= 0
                  }
                  className="w-full py-2.5 rounded-xl text-white font-semibold text-[13px] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] disabled:hover:shadow-none"
                >
                  {state === 'executing' || state === 'confirming' ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {state === 'executing' ? 'Signing...' : 'Creating Lock...'}
                    </>
                  ) : (
                    <>
                      <LockIcon className="w-4 h-4" />
                      {lockDuration > 0
                        ? `Lock for ${formatDuration(lockDuration)}`
                        : `Lock ${amount ? `${Number(amount).toLocaleString()} Tokens` : 'Tokens'}`}
                    </>
                  )}
                </button>
                <p className="text-gray-600 text-[9px] text-center mt-2">
                  On-chain lock via Streamflow. Non-cancellable and non-transferable.
                </p>
              </>
            )}

            {/* ═══ MY LOCKS TAB ═══ */}
            {!isBurn && lockTab === 'active' && (
              <div className="space-y-2.5">
                {locksLoading ? (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-gray-500 text-xs">Loading your locks...</p>
                  </div>
                ) : locks.length === 0 ? (
                  <div className="text-center py-8">
                    <LockIcon className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No locks found</p>
                    <p className="text-gray-600 text-xs">Create a lock to see it here.</p>
                  </div>
                ) : (
                  <>
                    {/* Error */}
                    {error && (
                      <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px]">
                        {error}
                      </div>
                    )}

                    {/* Active locks */}
                    {activeLocks.map(lock => {
                      const nowSec = Math.floor(now / 1000);
                      const isExpired = nowSec >= lock.unlockTime;
                      const totalDuration = lock.unlockTime - lock.startTime;
                      const elapsed = Math.min(nowSec - lock.startTime, totalDuration);
                      const progress = totalDuration > 0 ? Math.min(elapsed / totalDuration, 1) : 1;
                      const remaining = Math.max(lock.unlockTime - nowSec, 0);

                      return (
                        <div key={lock.id} className={`rounded-xl bg-[#111113] border p-3.5 transition-all ${
                          isExpired ? 'border-green-500/30 hover:border-green-500/50' : 'border-[#1a1a1f] hover:border-blue-500/20'
                        }`}>
                          <div className="flex items-center gap-2.5 mb-2.5">
                            {lock.image ? (
                              <img src={lock.image} alt="" className="w-8 h-8 rounded-lg flex-shrink-0 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <LockIcon className="w-4 h-4 text-blue-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-[12px] font-semibold truncate">
                                {lock.name || lock.mint.slice(0, 8) + '...'}
                                {lock.symbol && <span className="text-gray-500 font-normal ml-1">${lock.symbol}</span>}
                              </p>
                              <p className="text-blue-400 text-[11px] font-mono">
                                {lock.amount.toLocaleString()} locked
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              isExpired
                                ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                                : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            }`}>
                              {isExpired ? 'Unlockable' : 'Locked'}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="mb-2">
                            <div className="h-1.5 rounded-full bg-[#0d0d0f] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isExpired ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${progress * 100}%` }}
                              />
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-gray-600 text-[9px]">
                                {new Date(lock.startTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              <span className={`text-[9px] font-medium ${isExpired ? 'text-green-400' : 'text-gray-400'}`}>
                                {isExpired ? 'Unlockable' : formatCountdown(remaining)}
                              </span>
                              <span className="text-gray-600 text-[9px]">
                                {new Date(lock.unlockTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>

                          {/* Unlock button */}
                          {isExpired && (
                            <button
                              onClick={() => unlockStream(lock.id)}
                              className="w-full py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[11px] font-semibold hover:shadow-[0_0_15px_rgba(34,197,94,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                            >
                              <UnlockIcon className="w-3.5 h-3.5" />
                              Unlock Tokens
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Past locks (withdrawn) */}
                    {pastLocks.length > 0 && (
                      <>
                        <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-wider mt-4 mb-1">Past Locks</p>
                        {pastLocks.map(lock => (
                          <div key={lock.id} className="rounded-xl bg-[#111113] border border-[#1a1a1f] p-3 opacity-60">
                            <div className="flex items-center gap-2.5">
                              {lock.image ? (
                                <img src={lock.image} alt="" className="w-7 h-7 rounded-lg flex-shrink-0 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-[#1a1a1f] flex items-center justify-center flex-shrink-0">
                                  <UnlockIcon className="w-3.5 h-3.5 text-gray-600" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-gray-400 text-[11px] font-semibold truncate">
                                  {lock.name || lock.mint.slice(0, 8) + '...'}
                                  {lock.symbol && <span className="text-gray-600 font-normal ml-1">${lock.symbol}</span>}
                                </p>
                                <p className="text-gray-600 text-[10px] font-mono">
                                  {lock.amount.toLocaleString()} unlocked
                                </p>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-[#1a1a1f] text-gray-600 border border-[#222228]">
                                Unlocked
                              </span>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Refresh button */}
                    <button
                      onClick={fetchLocks}
                      className="w-full py-2 rounded-lg bg-[#111113] border border-[#1a1a1f] text-gray-500 text-[11px] font-medium hover:text-white hover:border-[#333] transition-all flex items-center justify-center gap-1.5 mt-2"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh Locks
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
      </div>
    </div>
  );
};

/* ── Shared sub-components ─────────────────────── */

function TokenInfoHeader({ selected, meta }: { selected: TokenAccount; meta: Record<string, TokenMeta> }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {meta[selected.mint]?.image ? (
        <img src={meta[selected.mint].image} alt="" className="w-9 h-9 rounded-lg flex-shrink-0 object-cover" />
      ) : (
        <div className="w-9 h-9 rounded-lg bg-[#111113] border border-[#222228] flex items-center justify-center flex-shrink-0 text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        {meta[selected.mint]?.name ? (
          <p className="text-white text-[13px] font-semibold truncate">
            {meta[selected.mint].name}
            {meta[selected.mint].symbol && <span className="text-gray-500 font-normal ml-1.5 text-[11px]">${meta[selected.mint].symbol}</span>}
          </p>
        ) : null}
        <p className="text-gray-500 text-[10px] font-mono truncate">{selected.mint.slice(0, 12)}...{selected.mint.slice(-4)}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-white text-[13px] font-mono font-semibold">{selected.balance.toLocaleString()}</p>
        <p className="text-gray-500 text-[10px]">balance</p>
      </div>
    </div>
  );
}

function AmountInput({ amount, setAmount, accent }: { amount: string; setAmount: (v: string) => void; accent: 'orange' | 'blue' }) {
  return (
    <div className="mb-3">
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          className={`w-full bg-[#111113] border rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none transition-all ${
            accent === 'orange'
              ? 'border-[#1a1a1f] focus:border-orange-500/40'
              : 'border-[#1a1a1f] focus:border-blue-500/40'
          }`}
        />
        {amount && (
          <button
            onClick={() => setAmount('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
