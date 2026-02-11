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

export const HackathonInfo: FC = () => {
  const sidebarOpen = useSidebarOpen();
  const sidebarWidth = sidebarOpen ? 72 : 0;
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
          ? `hidden min-[1760px]:block fixed w-[280px] panel-wrapper group/panel${isUnlocked ? ' panel-unlocked' : ''}`
          : 'hidden min-[1760px]:block fixed top-1/2 -translate-y-1/2 w-[280px] panel-wrapper group/panel'
      }
      style={
        hasCustomPosition
          ? { left: position.x, top: position.y, ...(isUnlocked ? { willChange: 'transform' } : {}) }
          : { right: `calc((100vw - ${sidebarWidth}px - 64rem) / 4 - 140px)`, transition: 'right 350ms cubic-bezier(0.16, 1, 0.3, 1)' }
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

      <div className="card overflow-hidden">
        {/* Twitter-style embed header */}
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2.5">
            <img
              src="https://pbs.twimg.com/profile_images/1886495917502230528/TX6kaGJM_200x200.jpg"
              alt="pump.fun"
              className="w-10 h-10 rounded-full flex-shrink-0"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = 'none';
                el.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="w-10 h-10 rounded-full flex-shrink-0 bg-[#82e24c] items-center justify-center text-black font-bold text-xs hidden">
              PF
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-white">pump.fun</span>
                <svg className="w-4 h-4 text-[#1d9bf0] flex-shrink-0" viewBox="0 0 22 22" fill="currentColor">
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.272.587.706 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.261.272 1.894.141.634-.131 1.22-.434 1.69-.88.445-.47.749-1.055.88-1.69.13-.635.083-1.293-.14-1.898.587-.273 1.084-.706 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                </svg>
              </div>
              <span className="text-xs text-gray-500">@pumpdotfun</span>
            </div>
            <a
              href="https://x.com/pumpdotfun"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <svg className="w-5 h-5 text-gray-500 hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Tweet text */}
        <div className="px-4 pb-3">
          <p className="text-[13px] text-gray-200 leading-[1.4]">
            Introducing the Build in Public Hackathon
          </p>
          <p className="text-[13px] text-gray-200 leading-[1.4] mt-1.5">
            a $3M fund backing 12 teams with $250K each at a $10M valuation
          </p>
          <p className="text-[13px] text-gray-400 leading-[1.4] mt-1.5">
            Launch a token on pump.fun, keep 10% supply, and build in public. Winners selected by market traction.
          </p>
        </div>

        {/* Video thumbnail */}
        <a
          href="https://x.com/pumpdotfun/status/2013386533626163589"
          target="_blank"
          rel="noopener noreferrer"
          className="block mx-4 mb-3 rounded-xl overflow-hidden border border-[#222228] hover:border-solana-purple/30 transition-colors relative group/video"
        >
          <div className="aspect-video bg-[#0a0a0b] flex items-center justify-center relative">
            <img
              src="https://pbs.twimg.com/ext_tw_video_thumb/2013386380911476736/pu/img/yQ0rdNnLq-uFbbBw.jpg"
              alt="Build in Public Hackathon video"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/video:bg-black/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-solana-purple/90 flex items-center justify-center group-hover/video:bg-solana-purple transition-colors shadow-lg">
                <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        </a>

        {/* Footer / timestamp */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">4:36 PM · Jan 19, 2026</span>
          <a
            href="https://x.com/pumpdotfun/status/2013386533626163589"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-solana-purple hover:text-solana-purple/80 transition-colors font-medium"
          >
            View on X
          </a>
        </div>

        {/* Engagement bar */}
        <div className="border-t border-[#222228] px-4 py-2.5 flex items-center gap-5 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            892
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            2.4K
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            8.7K
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            1.2M
          </span>
        </div>
      </div>
    </div>
  );
};
