'use client';

import Link from 'next/link';

export const TOOLS = [
  {
    id: 'reclaim',
    label: 'Reclaim',
    href: '/reclaim',
    description: 'Reclaim locked SOL from empty token accounts',
  },
  {
    id: 'vanity',
    label: 'Vanity',
    href: '/vanity',
    description: 'Generate vanity Solana wallet addresses',
  },
] as const;

interface SidebarProps {
  activePath: string;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ activePath, isOpen, onToggle }: SidebarProps) => {
  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 w-[72px] bg-[#0a0a0b] border-r border-[#222228] z-50 flex flex-col ${isOpen ? 'translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,0.4)]' : '-translate-x-full shadow-none'}`}
      style={{ transition: 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 350ms cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center justify-center h-16 border-b border-[#222228] hover:opacity-90 transition-opacity">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </Link>

      {/* Tool buttons */}
      <nav className="flex-1 flex flex-col items-center pt-4 gap-1">
        {TOOLS.map(tool => {
          const isActive = activePath === tool.href;
          return (
            <Link
              key={tool.id}
              href={tool.href}
              className={`
                w-full flex flex-col items-center justify-center py-3 px-1 transition-colors relative
                ${isActive
                  ? 'text-solana-purple bg-solana-purple/10'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#111113]'
                }
              `}
              title={tool.description}
            >
              {isActive && (
                <div className="absolute right-0 top-2 bottom-2 w-0.5 bg-solana-purple rounded-l" />
              )}
              <ToolIcon id={tool.id} />
              <span className="text-[10px] mt-1 font-medium">{tool.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Collapse button */}
      <button
        onClick={onToggle}
        className="group flex items-center justify-center h-12 border-t border-[#222228] text-gray-500 hover:text-solana-purple hover:bg-solana-purple/5 transition-all duration-200"
        title="Collapse sidebar"
      >
        <svg className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>
    </aside>
  );
};

function ToolIcon({ id }: { id: string }) {
  switch (id) {
    case 'reclaim':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'vanity':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
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
