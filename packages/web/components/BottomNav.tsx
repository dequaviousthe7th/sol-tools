'use client';

import Link from 'next/link';
import { TOOLS } from './Sidebar';

interface BottomNavProps {
  activePath: string;
}

export const BottomNav = ({ activePath }: BottomNavProps) => {
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
    </nav>
  );
};

function ToolIcon({ id }: { id: string }) {
  switch (id) {
    case 'reclaim':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'vanity':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
  }
}
