'use client';

import { ReactNode, useState, useEffect, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PriceProvider, BtcPrice, SolPrice } from '@/components/PriceTicker';
import { FooterSocialLinks } from '@/components/Heartbeat';

const Sidebar = dynamic(() => import('./Sidebar').then(m => ({ default: m.Sidebar })), { ssr: false });

const SIDEBAR_KEY = 'sidebar-open';

const SidebarContext = createContext(true);
export const useSidebarOpen = () => useContext(SidebarContext);

export const ToolLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const isAdmin = pathname === '/d/sr-ctrl';

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(SIDEBAR_KEY);
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen));
  }, [sidebarOpen]);

  const toggle = () => setSidebarOpen(prev => !prev);

  // Admin page gets no sidebar/footer/bottom-nav
  if (isAdmin) {
    return (
      <SidebarContext.Provider value={false}>
        {children}
      </SidebarContext.Provider>
    );
  }

  return (
    <PriceProvider>
    <SidebarContext.Provider value={sidebarOpen}>
    <div className="min-h-screen xl:h-screen flex flex-col xl:overflow-hidden">
      {/* Desktop sidebar — hidden below xl */}
      <div className="hidden xl:block">
        <Sidebar activePath={pathname} isOpen={sidebarOpen} onToggle={toggle} />
      </div>

      {/* Floating expand button — visible when sidebar is collapsed */}
      <button
        onClick={toggle}
        className={`group fixed top-4 left-4 z-50 hidden xl:flex items-center justify-center w-9 h-9 rounded-lg bg-[#111113]/80 backdrop-blur-sm border border-[#222228] text-gray-500 hover:text-solana-purple hover:border-solana-purple/30 hover:shadow-[0_0_12px_rgba(153,69,255,0.15)] ${
          sidebarOpen ? 'opacity-0 scale-75 -translate-x-3 pointer-events-none' : 'opacity-100 scale-100 translate-x-0'
        }`}
        style={{ transition: 'opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), transform 300ms cubic-bezier(0.16, 1, 0.3, 1), border-color 200ms, box-shadow 200ms, color 200ms', transitionDelay: sidebarOpen ? '0ms' : '150ms' }}
        title="Expand sidebar"
      >
        <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>

      {/* Main content area — offset by sidebar width on desktop */}
      <div
        className={`flex-1 flex flex-col xl:min-h-0 ${
          sidebarOpen ? 'xl:ml-[72px]' : 'xl:ml-0'
        }`}
        style={{ transition: 'margin-left 350ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {children}

        {/* Footer */}
        <footer className="mt-auto sticky bottom-0 bg-[#0a0a0b] z-40 pt-3 pb-3 border-t border-[#222228]">
          <div className="px-6 lg:px-10 flex items-center justify-between text-[11px] text-gray-500">
            <BtcPrice />
            <FooterSocialLinks />
            <SolPrice />
          </div>
        </footer>
      </div>

    </div>
    </SidebarContext.Provider>
    </PriceProvider>
  );
};
