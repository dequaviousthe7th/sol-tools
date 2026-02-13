'use client';

import Link from 'next/link';
import { TOOLS, ToolIcon } from './Sidebar';

interface BottomNavProps {
  activePath: string;
}

export const BottomNav = ({ activePath }: BottomNavProps) => {
  const isStatsActive = activePath === '/stats';

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0a0a0b]/95 backdrop-blur-md border-t border-[#222228] z-50 flex justify-around items-center pb-[env(safe-area-inset-bottom)]">
      {TOOLS.map(tool => {
        const isActive = activePath === tool.href;
        return (
          <Link
            key={tool.id}
            href={tool.href}
            className={`
              flex flex-col items-center justify-center gap-1 px-3 py-1 transition-colors relative
              ${isActive ? 'text-solana-purple' : 'text-gray-500'}
            `}
          >
            {isActive && (
              <div className="absolute top-0 w-8 h-0.5 bg-solana-purple rounded-b" />
            )}
            <ToolIcon id={tool.id} />
            <span className="text-[10px] font-medium">{tool.label}</span>
          </Link>
        );
      })}
      <Link
        href="/stats"
        className={`
          flex flex-col items-center justify-center gap-1 px-3 py-1 transition-colors relative
          ${isStatsActive ? 'text-solana-purple' : 'text-gray-600'}
        `}
      >
        {isStatsActive && (
          <div className="absolute top-0 w-8 h-0.5 bg-solana-purple rounded-b" />
        )}
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span className="text-[10px] font-medium">Stats</span>
      </Link>
    </nav>
  );
};
