'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const Sidebar = dynamic(() => import('./Sidebar').then(m => ({ default: m.Sidebar })), { ssr: false });
const BottomNav = dynamic(() => import('./BottomNav').then(m => ({ default: m.BottomNav })), { ssr: false });

export const ToolLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  // Don't offset the reclaimer page — it uses viewport-relative centering (calc(50vw-...))
  const isReclaimer = pathname === '/reclaim';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Desktop sidebar — hidden below xl */}
      <div className="hidden xl:block">
        <Sidebar activePath={pathname} />
      </div>

      {/* Main content area — offset by sidebar width on desktop (except reclaimer which self-centers) */}
      <div className={`flex-1 flex flex-col pb-20 xl:pb-0 ${isReclaimer ? '' : 'xl:ml-[72px]'}`}>
        {children}
      </div>

      {/* Mobile bottom nav — hidden at xl+ */}
      <div className="xl:hidden">
        <BottomNav activePath={pathname} />
      </div>
    </div>
  );
};
