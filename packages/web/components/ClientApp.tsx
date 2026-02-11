'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useProvidersLoaded } from './LazyProviders';
import { useSidebarOpen } from './ToolLayout';
import { WalletButton } from './WalletButton';
import { InfoModal } from './InfoModal';
import { GlobalStats } from './GlobalStats';
import { RecentActivity } from './RecentActivity';
import { MobileStats } from './MobileStats';
import { MobilePriceBar } from './PriceTicker';

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

interface DraggablePanelProps {
  children: React.ReactNode;
  side: 'left' | 'right';
  selfRef: React.RefObject<HTMLDivElement>;
  otherRef: React.RefObject<HTMLDivElement>;
}

const DraggablePanel = ({ children, side, selfRef, otherRef }: DraggablePanelProps) => {
  const sidebarOpen = useSidebarOpen();
  const sidebarOffset = sidebarOpen ? 36 : 0; // half of 72px sidebar
  const [locked, setLocked] = useState(true);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
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
    if (locked && selfRef.current) {
      const rect = selfRef.current.getBoundingClientRect();
      setPosition({ x: rect.left, y: rect.top });
    }
    setLocked((prev) => !prev);
  }, [locked, selfRef]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (locked || !position || !selfRef.current) return;
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
      selfRef.current.classList.add('panel-dragging');
    },
    [locked, position, selfRef]
  );

  useEffect(() => {
    if (locked) return;

    const handleMouseMove = (e: MouseEvent) => {
      const ds = dragState.current;
      if (!ds.isDragging || !selfRef.current) return;

      const el = selfRef.current;
      const pw = el.offsetWidth;
      const ph = el.offsetHeight;

      let nx = ds.baseX + (e.clientX - ds.startMouseX);
      let ny = ds.baseY + (e.clientY - ds.startMouseY);

      // Clamp to viewport
      nx = Math.max(0, Math.min(window.innerWidth - pw, nx));
      ny = Math.max(0, Math.min(window.innerHeight - ph, ny));

      // Collision detection with other panel
      if (otherRef.current) {
        const o = otherRef.current.getBoundingClientRect();
        const s = { left: nx, top: ny, right: nx + pw, bottom: ny + ph };

        if (!(s.right < o.left || s.left > o.right || s.bottom < o.top || s.top > o.bottom)) {
          const candidates = [
            { x: o.left - pw, y: ny, d: Math.abs(nx - (o.left - pw)) },
            { x: o.right, y: ny, d: Math.abs(nx - o.right) },
            { x: nx, y: o.top - ph, d: Math.abs(ny - (o.top - ph)) },
            { x: nx, y: o.bottom, d: Math.abs(ny - o.bottom) },
          ];
          const best = candidates.reduce((a, b) => (a.d < b.d ? a : b));
          nx = Math.max(0, Math.min(window.innerWidth - pw, best.x));
          ny = Math.max(0, Math.min(window.innerHeight - ph, best.y));
        }
      }

      // GPU-accelerated transform during drag
      el.style.transform = `translate3d(${nx - ds.baseX}px, ${ny - ds.baseY}px, 0)`;
      ds.lastX = nx;
      ds.lastY = ny;
    };

    const handleMouseUp = () => {
      const ds = dragState.current;
      if (!ds.isDragging || !selfRef.current) return;
      ds.isDragging = false;
      document.body.style.userSelect = '';
      selfRef.current.classList.remove('panel-dragging');
      selfRef.current.style.transform = '';
      setPosition({ x: ds.lastX, y: ds.lastY });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [locked, selfRef, otherRef]);

  const hasCustomPosition = position !== null;
  const isUnlocked = !locked;

  return (
    <div
      ref={selfRef}
      className={
        hasCustomPosition
          ? `hidden xl:block fixed w-64 panel-wrapper group/panel${isUnlocked ? ' panel-unlocked' : ''}`
          : `hidden xl:block fixed top-[calc(50%-4rem)] -translate-y-1/2 w-64 panel-wrapper group/panel`
      }
      style={
        hasCustomPosition
          ? { left: position.x, top: position.y, ...(isUnlocked ? { willChange: 'transform' } : {}) }
          : {
              [side === 'left' ? 'left' : 'right']: `calc(50% ${side === 'left' ? '+' : '-'} ${sidebarOffset}px - 38.5rem)`,
              transition: `${side === 'left' ? 'left' : 'right'} 350ms cubic-bezier(0.16, 1, 0.3, 1)`,
            }
      }
      onMouseDown={handleMouseDown}
    >
      <button
        className={`lock-btn absolute top-1.5 right-1.5 z-10 p-1 rounded-md ${
          locked
            ? 'text-gray-500 hover:text-white bg-black/20 hover:bg-black/40 opacity-0 group-hover/panel:opacity-100'
            : 'text-solana-purple hover:text-white bg-black/30 hover:bg-black/50 opacity-0 group-hover/panel:opacity-100'
        }`}
        onClick={handleToggleLock}
        title={locked ? 'Unlock to drag' : 'Lock position'}
      >
        <LockIcon locked={locked} />
      </button>
      {children}
    </div>
  );
};

const SidePanels = () => {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <DraggablePanel side="left" selfRef={leftRef} otherRef={rightRef}>
        <GlobalStats />
      </DraggablePanel>
      <DraggablePanel side="right" selfRef={rightRef} otherRef={leftRef}>
        <RecentActivity />
      </DraggablePanel>
    </>
  );
};

// Lazy load the RentReclaimer component
const RentReclaimer = dynamic(
  () => import('./RentReclaimer').then((mod) => mod.RentReclaimer),
  {
    loading: () => (
      <div className="card p-6">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-gray-800 rounded mb-4"></div>
          <div className="h-4 w-48 bg-gray-800 rounded"></div>
        </div>
      </div>
    ),
    ssr: false,
  }
);

// Hero section component
const HeroSection = ({ connected, onGetStarted, onOpenInfo }: { connected: boolean; onGetStarted?: () => void; onOpenInfo?: () => void }) => (
  <section className="text-center pt-8 pb-3 xl:py-2 flex-1 flex flex-col justify-center">
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#111113] border border-[#222228] text-solana-purple text-sm font-medium mb-3 xl:mb-5 self-center">
      <span className="w-2 h-2 rounded-full bg-solana-green animate-pulse"></span>
      100% Free - No Hidden Fees
    </div>

    <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-2 xl:mb-5 mt-4 xl:mt-0 order-first xl:order-none">
      <span className="text-white">Reclaim Your</span>
      <br />
      <span className="gradient-text">Locked SOL</span>
    </h2>

    <p className="text-base sm:text-lg text-gray-400 mb-4 max-w-xl mx-auto leading-relaxed">
      Empty token accounts are holding your SOL hostage. Close them instantly and get your rent deposits back.
    </p>

    {onOpenInfo && (
      <button
        onClick={onOpenInfo}
        className="text-sm text-gray-500 hover:text-solana-purple transition-colors mb-6 xl:mb-3 underline underline-offset-2"
      >
        How does this work?
      </button>
    )}

    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8 xl:mb-4">
      <div className="gradient-border">
        <div className="px-6 py-3">
          {connected ? (
            <button onClick={onGetStarted} className="btn-primary px-8 py-3">
              Get Started
            </button>
          ) : (
            <WalletButton />
          )}
        </div>
      </div>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-md mx-auto mb-8 xl:mb-4">
      <div className="text-center">
        <div className="text-2xl sm:text-3xl font-bold text-solana-green mb-1">0%</div>
        <div className="text-[10px] sm:text-sm text-gray-500">Fees</div>
      </div>
      <div className="text-center">
        <div className="text-2xl sm:text-3xl font-bold text-white mb-1">~0.002</div>
        <div className="text-[10px] sm:text-sm text-gray-500">SOL/Account</div>
      </div>
      <div className="text-center">
        <div className="text-2xl sm:text-3xl font-bold text-solana-purple mb-1">100%</div>
        <div className="text-[10px] sm:text-sm text-gray-500">Yours</div>
      </div>
    </div>

    {/* Mobile Stats — only visible below xl */}
    <div className="mb-6 xl:hidden">
      <MobileStats />
    </div>

    {/* How it works */}
    <div className="grid md:grid-cols-3 gap-3 sm:gap-4 mb-6">
      <FeatureCard
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        }
        step="1"
        title="Connect"
        description="Connect your Solana wallet"
      />
      <FeatureCard
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
        step="2"
        title="Scan"
        description="Find empty token accounts"
      />
      <FeatureCard
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        step="3"
        title="Reclaim"
        description="Get your SOL back instantly"
      />
    </div>

    {/* Trust Badges */}
    <div className="flex flex-wrap justify-center gap-3">
      <TrustBadge
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        }
        text="No Private Keys"
      />
      <TrustBadge
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        }
        text="Non-Custodial"
      />
      <TrustBadge
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        }
        text="Solana Mainnet"
      />
    </div>

    {/* Mobile Price Ticker — below trust badges */}
    <div className="mt-4">
      <MobilePriceBar />
    </div>
  </section>
);

function FeatureCard({ icon, step, title, description }: { icon: React.ReactNode; step: string; title: string; description: string }) {
  return (
    <div className="card card-hover p-4 sm:p-5 text-center">
      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center mx-auto mb-3 text-solana-purple">
        {icon}
      </div>
      <div className="text-xs text-solana-purple font-medium mb-1">Step {step}</div>
      <h3 className="font-semibold text-lg mb-1 text-white">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}

function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111113] border border-[#222228] text-xs text-gray-400">
      <span className="text-solana-green">{icon}</span>
      {text}
    </div>
  );
}

// Inner component that uses wallet hooks
const ClientAppInner = () => {
  const { connected } = useWallet();
  const [showReclaimer, setShowReclaimer] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  // When wallet disconnects, reset to hero
  if (!connected && showReclaimer) {
    setShowReclaimer(false);
  }

  if (!connected) {
    return (
      <>
        <HeroSection connected={false} onOpenInfo={() => setInfoModalOpen(true)} />
        <InfoModal open={infoModalOpen} onClose={() => setInfoModalOpen(false)} />
        <SidePanels />
      </>
    );
  }

  if (!showReclaimer) {
    return (
      <>
        <HeroSection connected={true} onGetStarted={() => setShowReclaimer(true)} onOpenInfo={() => setInfoModalOpen(true)} />
        <InfoModal open={infoModalOpen} onClose={() => setInfoModalOpen(false)} />
        <SidePanels />
      </>
    );
  }

  return (
    <div className="pt-6">
      <RentReclaimer onBack={() => setShowReclaimer(false)} />
    </div>
  );
};

export const ClientApp = () => {
  const providersLoaded = useProvidersLoaded();

  // Show hero section while providers are loading
  if (!providersLoaded) {
    return <HeroSection connected={false} />;
  }

  // Once providers are loaded, render the inner component that can use wallet hooks
  return <ClientAppInner />;
};
