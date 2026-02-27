'use client';

import { FC, useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useSidebarOpen } from './ToolLayout';

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

function useDraggablePanel() {
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

  return { locked, position, panelRef, handleToggleLock, handleMouseDown };
}

const STBPanel: FC<{ mobile?: boolean }> = ({ mobile }) => {
  const sidebarOpen = useSidebarOpen();
  const sidebarWidth = sidebarOpen ? 72 : 0;
  const { locked, position, panelRef, handleToggleLock, handleMouseDown } = useDraggablePanel();

  const hasCustomPosition = position !== null;
  const isUnlocked = !locked;

  if (mobile) {
    return (
      <Link href="/stb" className="block">
        <div className="card p-4 hover:border-[#5865F2]/30 transition-colors group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#5865F2]/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">SolToolsBot</h3>
              <p className="text-[11px] text-gray-500">Discord Integration</p>
            </div>
          </div>
          <div className="space-y-2 mb-3">
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-[#5865F2] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-white">Token Scanning</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">Scan any token for risks right in Discord</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-[#5865F2] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-white">Authority Checker</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">Check pump.fun fee, authority & lock status</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-[#5865F2] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-white">Trend Tracking</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">Spot trends and track locks in your server</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-[#5865F2] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <div>
                <p className="text-xs font-medium text-white">Fee Claim Alerts</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">Get notified when PumpFun fees are claimed</p>
              </div>
            </div>
          </div>
          <div className="border-t border-[#1a1a1f] pt-3">
            <span className="text-[#5865F2] text-xs font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
              Learn more
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div
      ref={panelRef}
      className={
        hasCustomPosition
          ? `hidden 2xl:block fixed w-[260px] panel-wrapper group/panel${isUnlocked ? ' panel-unlocked' : ''}`
          : 'hidden 2xl:block fixed top-1/2 -translate-y-1/2 w-[260px] panel-wrapper group/panel'
      }
      style={
        hasCustomPosition
          ? { left: position.x, top: position.y, ...(isUnlocked ? { willChange: 'transform' } : {}) }
          : { left: `calc(${sidebarWidth}px + (100vw - ${sidebarWidth}px - 51rem) / 4 - 90px)`, transition: 'left 350ms cubic-bezier(0.16, 1, 0.3, 1)' }
      }
      onMouseDown={handleMouseDown}
    >
      <button
        className={`lock-btn absolute top-2 right-2 z-10 p-1 rounded-md ${
          locked
            ? 'text-gray-500 hover:text-white bg-black/20 hover:bg-black/40 opacity-0 group-hover/panel:opacity-100'
            : 'text-[#5865F2] hover:text-white bg-black/30 hover:bg-black/50 opacity-0 group-hover/panel:opacity-100'
        }`}
        onClick={handleToggleLock}
        title={locked ? 'Unlock to drag' : 'Lock position'}
      >
        <LockIcon locked={locked} />
      </button>

      <Link href="/stb" className="block">
        <div className="card p-5 hover:border-[#5865F2]/30 transition-colors group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#5865F2]/15 flex items-center justify-center flex-shrink-0 group-hover:bg-[#5865F2]/25 transition-colors">
              <svg className="w-5 h-5 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">SolToolsBot</h3>
              <p className="text-[11px] text-gray-500">Discord Integration</p>
            </div>
          </div>

          <div className="space-y-2.5 mb-4">
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-[#5865F2] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-white">Token Scanning</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">Scan any token for risks right in Discord</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-[#5865F2] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-white">Authority Checker</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">Check pump.fun fee, authority & lock status</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-[#5865F2] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-white">Trend Tracking</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">Spot trends and track locks in your server</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-[#5865F2] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <div>
                <p className="text-xs font-medium text-white">Fee Claim Alerts</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">Get notified when PumpFun fees are claimed</p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#1a1a1f] pt-3">
            <span className="text-[#5865F2] text-xs font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
              Learn more
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
};

const SoltPanel: FC<{ mobile?: boolean }> = ({ mobile }) => {
  const sidebarOpen = useSidebarOpen();
  const sidebarWidth = sidebarOpen ? 72 : 0;
  const { locked, position, panelRef, handleToggleLock, handleMouseDown } = useDraggablePanel();

  const hasCustomPosition = position !== null;
  const isUnlocked = !locked;

  if (mobile) {
    return (
      <Link href="/pumptoken" className="block">
        <div className="card p-4 hover:border-solana-purple/30 transition-colors group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-solana-purple/15 to-solana-green/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                <defs>
                  <linearGradient id="solt-mob" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9945FF" />
                    <stop offset="100%" stopColor="#14F195" />
                  </linearGradient>
                </defs>
                <polygon points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5" fill="url(#solt-mob)" />
                <polygon points="55,18 38,52 50,52 45,82 62,48 50,48" fill="white" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">$SOLT Token</h3>
              <span className="inline-flex px-1.5 py-0.5 text-[8px] font-semibold rounded-full bg-solana-purple/15 text-solana-purple border border-solana-purple/25">PUMP.FUN</span>
            </div>
          </div>
          <div className="space-y-2 mb-3">
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-solana-green mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-white">Revenue Share</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">Holders share platform revenue</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-solana-purple mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-white">Early Access</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">Try new tools before public launch</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-solana-green mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <div>
                <p className="text-xs font-medium text-white">Governance</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">Vote on which tools get built next</p>
              </div>
            </div>
          </div>
          <div className="border-t border-[#1a1a1f] pt-3 flex items-center justify-between">
            <span className="text-solana-purple text-xs font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
              Learn more
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
            <span className="text-[10px] text-gray-600">Launched on pump.fun</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div
      ref={panelRef}
      className={
        hasCustomPosition
          ? `hidden 2xl:block fixed w-[260px] panel-wrapper group/panel${isUnlocked ? ' panel-unlocked' : ''}`
          : 'hidden 2xl:block fixed top-1/2 -translate-y-1/2 w-[260px] panel-wrapper group/panel'
      }
      style={
        hasCustomPosition
          ? { left: position.x, top: position.y, ...(isUnlocked ? { willChange: 'transform' } : {}) }
          : { right: `calc((100vw - ${sidebarWidth}px - 51rem) / 4 - 90px)`, transition: 'right 350ms cubic-bezier(0.16, 1, 0.3, 1)' }
      }
      onMouseDown={handleMouseDown}
    >
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

      <Link href="/pumptoken" className="block">
        <div className="card p-5 hover:border-solana-purple/30 transition-colors group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-solana-purple/15 to-solana-green/15 flex items-center justify-center flex-shrink-0 overflow-hidden group-hover:from-solana-purple/25 group-hover:to-solana-green/25 transition-colors">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                <defs>
                  <linearGradient id="solt-side" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9945FF" />
                    <stop offset="100%" stopColor="#14F195" />
                  </linearGradient>
                </defs>
                <polygon points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5" fill="url(#solt-side)" />
                <polygon points="55,18 38,52 50,52 45,82 62,48 50,48" fill="white" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">$SOLT Token</h3>
              <span className="inline-flex px-1.5 py-0.5 text-[8px] font-semibold rounded-full bg-solana-purple/15 text-solana-purple border border-solana-purple/25">PUMP.FUN</span>
            </div>
          </div>

          <p className="text-[12px] text-gray-400 leading-relaxed mb-3">
            The community token powering SolTools — launched on <span className="text-solana-purple font-medium">pump.fun</span>.
          </p>

          <div className="space-y-2.5 mb-4">
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-solana-green mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-white">Revenue Share</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">Holders receive a share of platform revenue</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-solana-purple mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-white">Early Access</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">First to try new tools before public launch</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-solana-green mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <div>
                <p className="text-xs font-medium text-white">Governance</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">Vote on which tools get built next</p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#1a1a1f] pt-3">
            <span className="text-solana-purple text-xs font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
              Learn more
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
};

export const HomePromoPanel = () => {
  return (
    <>
      {/* Desktop floating panels */}
      <STBPanel />
      <SoltPanel />

      {/* Mobile/tablet inline cards */}
      <div className="2xl:hidden px-4 max-w-[51rem] mx-auto w-full mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <STBPanel mobile />
        <SoltPanel mobile />
      </div>
    </>
  );
};
