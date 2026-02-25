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
  {
    id: 'burn',
    label: 'Burn',
    href: '/burn',
    description: 'Burn or lock tokens',
  },
  {
    id: 'scan',
    label: 'Scanner',
    href: '/scan',
    description: 'Scan any Solana token for risks',
  },
  {
    id: 'xray',
    label: 'X-Ray',
    href: '/xray',
    description: 'Wallet PnL and trading analysis',
  },
  {
    id: 'hackathon',
    label: 'Hackathon',
    href: '/hackathon',
    description: 'PumpFun Build in Public hackathon screener',
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2L21 7V17L12 22L3 17V7Z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 8L10.5 12.5H13.5L11 17" />
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
              onClick={(e) => {
                if (isActive) {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent('tool-reset'));
                }
              }}
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

      {/* Stats link */}
      <Link
        href="/stats"
        className={`
          relative flex flex-col items-center justify-center py-2.5 px-1 border-t border-[#222228] transition-colors
          ${activePath === '/stats'
            ? 'text-solana-purple bg-solana-purple/10'
            : 'text-gray-600 hover:text-gray-400 hover:bg-[#111113]'
          }
        `}
        title="Your activity stats"
      >
        {activePath === '/stats' && (
          <div className="absolute right-0 top-2 bottom-2 w-0.5 bg-solana-purple rounded-l" />
        )}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span className="text-[9px] mt-0.5 font-medium">Stats</span>
      </Link>

      {/* Discord bot link */}
      <Link
        href="/stb"
        className={`
          relative flex flex-col items-center justify-center py-2.5 px-1 border-t border-[#222228] transition-colors
          ${activePath === '/stb'
            ? 'text-[#5865F2] bg-[#5865F2]/10'
            : 'text-gray-600 hover:text-[#5865F2] hover:bg-[#5865F2]/5'
          }
        `}
        title="SolToolsBot — Discord Integration"
      >
        {activePath === '/stb' && (
          <div className="absolute right-0 top-2 bottom-2 w-0.5 bg-[#5865F2] rounded-l" />
        )}
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
        <span className="text-[9px] mt-0.5 font-medium">STB</span>
      </Link>

      {/* Collapse button */}
      <button
        onClick={onToggle}
        className="group flex items-center justify-center py-3 border-t border-[#222228] text-gray-500 hover:text-solana-purple hover:bg-solana-purple/5 transition-all duration-200"
        title="Collapse sidebar"
      >
        <svg className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>
    </aside>
  );
};

export function ToolIcon({ id }: { id: string }) {
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
    case 'hackathon':
      return (
        <svg className="w-5 h-3" viewBox="0 0 20 12" fill="none">
          <rect x="0.5" y="0.5" width="19" height="11" rx="5.5" fill="white" stroke="currentColor" strokeWidth="1" />
          <path d="M10 0.5H14.5C17.2614 0.5 19.5 2.73858 19.5 5.5V6.5C19.5 9.26142 17.2614 11.5 14.5 11.5H10V0.5Z" fill="#82e24c" stroke="currentColor" strokeWidth="1" />
        </svg>
      );
    case 'scan':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case 'xray':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      );
    case 'burn':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
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
