'use client';

import { FC, useState, useRef, useCallback, useEffect } from 'react';
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

const INFO_ITEMS = [
  {
    icon: (
      <svg className="w-4 h-4 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: '$3M Fund',
    detail: '12 winners · $250k each @ $10M valuation',
  },
  {
    icon: (
      <svg className="w-4 h-4 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: 'Requirements',
    detail: 'Launch token on Pump.fun, hold 10% supply, build in public with updates & streams',
  },
  {
    icon: (
      <svg className="w-4 h-4 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Advisors',
    detail: 'Polymarket, Delphi Digital, Pantera Capital',
  },
  {
    icon: (
      <svg className="w-4 h-4 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    title: 'Selection',
    detail: 'Based on market traction & user engagement, not traditional judging',
  },
];

export const HackathonDetails: FC = () => {
  const sidebarOpen = useSidebarOpen();
  const sidebarOffset = sidebarOpen ? 36 : 0;
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

  const hasCustomPosition = position !== null;
  const isUnlocked = !locked;

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
          : { left: `calc((100vw - ${sidebarOffset}px - 56rem) / 4 - 140px + ${sidebarOffset}px)`, transition: 'left 350ms cubic-bezier(0.16, 1, 0.3, 1)' }
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

      <div className="card p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center">
            <svg className="w-4 h-2.5" viewBox="0 0 20 12" fill="none">
              <rect x="0.5" y="0.5" width="19" height="11" rx="5.5" fill="white" stroke="#222228" strokeWidth="1" />
              <path d="M10 0.5H14.5C17.2614 0.5 19.5 2.73858 19.5 5.5V6.5C19.5 9.26142 17.2614 11.5 14.5 11.5H10V0.5Z" fill="#82e24c" stroke="#222228" strokeWidth="1" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Hackathon Details</h3>
            <p className="text-[11px] text-gray-500">Build in Public</p>
          </div>
        </div>

        {/* Info items */}
        <div className="space-y-3">
          {INFO_ITEMS.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="mt-0.5 flex-shrink-0">{item.icon}</div>
              <div>
                <p className="text-xs font-medium text-white">{item.title}</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-[#1a1a1f] my-4" />

        {/* Links */}
        <div className="space-y-2">
          <a
            href="https://hackathon.pump.fun/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-solana-purple transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            hackathon.pump.fun
          </a>
          <a
            href="https://x.com/pumpdotfun"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-solana-purple transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            @pumpdotfun
          </a>
        </div>
      </div>
    </div>
  );
};
