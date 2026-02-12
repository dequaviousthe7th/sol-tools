'use client';

import { FC, useState, useRef, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useSidebarOpen } from './ToolLayout';

interface VanityTokenCardProps {
  refreshKey: number;
  onBuyTokens: () => void;
  mobile?: boolean;
}

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || '';

const LockIcon = ({ locked }: { locked: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {locked ? (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ) : (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
      </>
    )}
  </svg>
);

export const VanityTokenCard: FC<VanityTokenCardProps> = ({ refreshKey, onBuyTokens, mobile }) => {
  const sidebarOpen = useSidebarOpen();
  const sidebarOffset = sidebarOpen ? 36 : 0;
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(true);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    isDragging: false,
    startMouseX: 0,
    startMouseY: 0,
    baseX: 0,
    baseY: 0,
    lastX: 0,
    lastY: 0,
  });

  // Fetch balance
  useEffect(() => {
    if (!publicKey || !WORKER_URL) {
      setBalance(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`${WORKER_URL}/api/vanity/balance?wallet=${publicKey.toBase58()}`)
      .then(res => res.json())
      .then((data: { balance: number }) => {
        if (!cancelled) setBalance(data.balance);
      })
      .catch(() => {
        if (!cancelled) setBalance(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [publicKey, refreshKey]);

  const handleToggleLock = useCallback(() => {
    if (locked && panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setPosition({ x: rect.left, y: rect.top });
    }
    setLocked((prev) => !prev);
  }, [locked]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (locked || !position || !panelRef.current) return;
      if ((e.target as HTMLElement).closest('.lock-btn')) return;

      e.preventDefault();
      const ds = dragState.current;
      ds.isDragging = true;
      ds.startMouseX = e.clientX;
      ds.startMouseY = e.clientY;
      ds.baseX = position.x;
      ds.baseY = position.y;
      ds.lastX = position.x;
      ds.lastY = position.y;
      document.body.style.userSelect = 'none';
      panelRef.current.classList.add('panel-dragging');
    },
    [locked, position]
  );

  useEffect(() => {
    if (locked) return;

    const handleMouseMove = (e: MouseEvent) => {
      const ds = dragState.current;
      if (!ds.isDragging || !panelRef.current) return;

      const el = panelRef.current;
      const pw = el.offsetWidth;
      const ph = el.offsetHeight;

      let nx = ds.baseX + (e.clientX - ds.startMouseX);
      let ny = ds.baseY + (e.clientY - ds.startMouseY);

      nx = Math.max(0, Math.min(window.innerWidth - pw, nx));
      ny = Math.max(0, Math.min(window.innerHeight - ph, ny));

      el.style.transform = `translate3d(${nx - ds.baseX}px, ${ny - ds.baseY}px, 0)`;
      ds.lastX = nx;
      ds.lastY = ny;
    };

    const handleMouseUp = () => {
      const ds = dragState.current;
      if (!ds.isDragging || !panelRef.current) return;
      ds.isDragging = false;
      document.body.style.userSelect = '';
      panelRef.current.classList.remove('panel-dragging');
      panelRef.current.style.transform = '';
      setPosition({ x: ds.lastX, y: ds.lastY });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [locked]);

  const hasCustomPosition = position !== null;
  const isUnlocked = !locked;

  if (mobile) {
    return (
      <div className="card p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Vanity Tokens</h3>
            <p className="text-xs text-gray-500">1 token = 1 search</p>
          </div>
        </div>

        {publicKey ? (
          <>
            <div className="rounded-xl bg-gradient-to-br from-solana-purple/10 to-solana-green/10 border border-[#222228] p-4 mb-4 text-center">
              {loading ? (
                <div className="h-10 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full border-2 border-solana-purple/30 border-t-solana-purple animate-spin" />
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-solana-green">{balance ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">{balance === 1 ? 'token' : 'tokens'} remaining</p>
                </>
              )}
            </div>
            <button
              onClick={onBuyTokens}
              className="w-full btn-primary py-2.5 text-sm font-semibold"
            >
              Buy Tokens
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Connect your wallet to purchase tokens and start generating vanity addresses.
            </p>
            <button
              onClick={() => setVisible(true)}
              className="w-full btn-primary py-2.5 text-sm font-semibold"
            >
              Connect Wallet
            </button>
          </>
        )}

        {/* Divider */}
        <div className="border-t border-[#1a1a1f] my-4" />

        {/* How It Works */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xs font-bold text-white">How It Works</h3>
        </div>

        <div className="space-y-2 text-xs text-gray-400 leading-relaxed">
          <div className="flex gap-2">
            <span className="text-solana-green font-bold mt-px">1.</span>
            <p>Buy tokens with SOL. Tokens are tied to your wallet address.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-solana-green font-bold mt-px">2.</span>
            <p>Each search consumes 1 token. The token is used when you click Generate.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-solana-green font-bold mt-px">3.</span>
            <p>Larger bundles save more &mdash; up to 40% off at the 50-token tier.</p>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-3 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex gap-2">
            <svg className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-[11px] text-yellow-400/90 leading-relaxed">
              Don&apos;t refresh or close the page during a search &mdash; your token is consumed when the search starts and cannot be refunded.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className={
        hasCustomPosition
          ? `hidden 2xl:block fixed w-[280px] panel-wrapper group/panel${isUnlocked ? ' panel-unlocked' : ''}`
          : 'hidden 2xl:block fixed top-1/2 -translate-y-1/2 w-[280px] panel-wrapper group/panel'
      }
      style={
        hasCustomPosition
          ? { left: position.x, top: position.y, ...(isUnlocked ? { willChange: 'transform' } : {}) }
          : { right: `calc(25vw - ${sidebarOffset}px - 12rem - 100px)`, transition: 'right 350ms cubic-bezier(0.16, 1, 0.3, 1)' }
      }
      onMouseDown={handleMouseDown}
    >
      {/* Lock/Unlock button */}
      <button
        className={`lock-btn absolute top-2 right-2 z-10 p-1 rounded-md ${
          locked
            ? 'text-gray-500 hover:text-white bg-black/20 hover:bg-black/40 opacity-0 group-hover/panel:opacity-100'
            : 'text-solana-purple hover:text-white bg-black/30 hover:bg-black/50 opacity-0 group-hover/panel:opacity-100'
        }`}
        onClick={handleToggleLock}
        title={locked ? 'Unlock to drag' : 'Lock position'}
      >
        <LockIcon locked={locked} />
      </button>

      <div className="card p-5 overflow-y-auto scroll-fade" style={{ maxHeight: 'calc(100vh - 120px)' }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Vanity Tokens</h3>
            <p className="text-xs text-gray-500">1 token = 1 search</p>
          </div>
        </div>

        {publicKey ? (
          <>
            {/* Balance display */}
            <div className="rounded-xl bg-gradient-to-br from-solana-purple/10 to-solana-green/10 border border-[#222228] p-4 mb-4 text-center">
              {loading ? (
                <div className="h-10 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full border-2 border-solana-purple/30 border-t-solana-purple animate-spin" />
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-solana-green">{balance ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">{balance === 1 ? 'token' : 'tokens'} remaining</p>
                </>
              )}
            </div>

            {/* Buy button */}
            <button
              onClick={onBuyTokens}
              className="w-full btn-primary py-2.5 text-sm font-semibold"
            >
              Buy Tokens
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Connect your wallet to purchase tokens and start generating vanity addresses.
            </p>
            <button
              onClick={() => setVisible(true)}
              className="w-full btn-primary py-2.5 text-sm font-semibold"
            >
              Connect Wallet
            </button>
          </>
        )}

        {/* Divider */}
        <div className="border-t border-[#1a1a1f] my-4" />

        {/* How It Works */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xs font-bold text-white">How It Works</h3>
        </div>

        <div className="space-y-2 text-xs text-gray-400 leading-relaxed">
          <div className="flex gap-2">
            <span className="text-solana-green font-bold mt-px">1.</span>
            <p>Buy tokens with SOL. Tokens are tied to your wallet address.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-solana-green font-bold mt-px">2.</span>
            <p>Each search consumes 1 token. The token is used when you click Generate.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-solana-green font-bold mt-px">3.</span>
            <p>Larger bundles save more &mdash; up to 40% off at the 50-token tier.</p>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-3 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex gap-2">
            <svg className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-[11px] text-yellow-400/90 leading-relaxed">
              Don&apos;t refresh or close the page during a search &mdash; your token is consumed when the search starts and cannot be refunded.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
