'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ToolIcon } from './Sidebar';

const MOBILE_TOOLS = [
  { id: 'hub', label: 'Hub', href: '/', description: 'SolTools Home' },
  { id: 'reclaim', label: 'Reclaim', href: '/reclaim', description: 'Reclaim locked SOL' },
  { id: 'vanity', label: 'Vanity', href: '/vanity', description: 'Vanity address generator' },
  { id: 'hackathon', label: 'Hackathon', href: '/hackathon', description: 'Hackathon screener' },
  { id: 'scan', label: 'Scanner', href: '/scan', description: 'Token safety scanner' },
  { id: 'xray', label: 'X-Ray', href: '/xray', description: 'Wallet PnL analysis' },
  { id: 'burn', label: 'Burn or Lock', href: '/burn-lock', description: 'Burn or lock tokens' },
  { id: 'stats', label: 'My Stats', href: '/stats', description: 'Your activity & achievements' },
] as const;

export const MobileToolDropdown = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative xl:hidden">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-500 hover:text-solana-purple hover:bg-[#111113] transition-colors"
        aria-label="Switch tool"
      >
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <span className="text-[10px] font-medium">Tools</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 rounded-xl bg-[#111113] border border-[#222228] shadow-xl z-50 py-1 overflow-hidden">
          {MOBILE_TOOLS.map(tool => {
            const isActive = pathname === tool.href;
            return (
              <Link
                key={tool.id}
                href={tool.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                  isActive
                    ? 'text-solana-purple bg-solana-purple/10'
                    : 'text-gray-400 hover:text-white hover:bg-[#16161a]'
                }`}
              >
                {tool.id === 'hub' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                ) : tool.id === 'stats' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ) : (
                  <ToolIcon id={tool.id} />
                )}
                <div>
                  <div className="text-sm font-medium">{tool.label}</div>
                  <div className="text-[10px] text-gray-600">{tool.description}</div>
                </div>
              </Link>
            );
          })}
          {/* Separator */}
          <div className="mx-3 my-1 border-t border-[#222228]" />
          {/* Legal */}
          <Link
            href="/legal"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
              pathname === '/legal'
                ? 'text-solana-purple bg-solana-purple/10'
                : 'text-gray-400 hover:text-white hover:bg-[#16161a]'
            }`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <div>
              <div className="text-sm font-medium">Legal</div>
              <div className="text-[10px] text-gray-600">Privacy, Terms & Disclaimer</div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
};
