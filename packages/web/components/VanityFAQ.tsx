'use client';

import { FC, useState, useRef, useCallback, useEffect } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What is a vanity address?',
    answer: 'A custom Solana wallet address that starts or ends with letters you choose — like "SOL..." or "...deq". It functions identically to any normal wallet and is fully compatible with all Solana apps.',
  },
  {
    question: 'Is my private key safe?',
    answer: 'Everything runs 100% in your browser. No keys, no data, nothing ever touches a server. You can turn off your WiFi after the page loads and it will still work — try it.',
  },
  {
    question: 'How do I import the wallet?',
    answer: 'Click "Download Keypair" to get the JSON file. In Phantom, go to Settings → Manage Accounts → Import Private Key and paste the Base58 key. Solflare and Backpack work the same way. You can also use it with Solana CLI.',
  },
  {
    question: 'Why does it get slower with more characters?',
    answer: 'Each character multiplies difficulty by ~58x. Two characters takes about a second, three takes under a minute, and four can take several minutes depending on your hardware.',
  },
  {
    question: 'What characters can I use?',
    answer: 'Solana addresses use Base58: A-Z, a-z, and 1-9. The characters 0 (zero), O (uppercase o), I (uppercase i), and l (lowercase L) are excluded to prevent confusion.',
  },
  {
    question: 'Can I use this address for trading?',
    answer: 'Yes. A vanity address works exactly like any other Solana wallet. You can trade on Jupiter, Raydium, Tensor, or any dApp. The only difference is the address looks the way you want it to.',
  },
];

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

export const VanityFAQ: FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
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
          ? `hidden 2xl:block fixed w-[320px] panel-wrapper group/panel${isUnlocked ? ' panel-unlocked' : ''}`
          : 'hidden 2xl:block fixed left-[calc(25vw-12rem-106px)] top-1/2 -translate-y-1/2 w-[320px] panel-wrapper group/panel'
      }
      style={
        hasCustomPosition
          ? { left: position.x, top: position.y, ...(isUnlocked ? { willChange: 'transform' } : {}) }
          : undefined
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

      <div className="card p-6 h-[420px] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center text-solana-purple">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">FAQ</h3>
            <p className="text-xs text-gray-500">Common questions</p>
          </div>
        </div>

        {/* FAQ Items */}
        <div className="space-y-0.5">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="border-b border-[#1a1a1f] last:border-0">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between py-3 text-left group"
              >
                <span className={`text-sm font-medium pr-3 transition-colors ${
                  openIndex === i ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                }`}>
                  {item.question}
                </span>
                <svg
                  className={`w-4 h-4 flex-shrink-0 text-gray-600 transition-transform duration-200 ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === i && (
                <div className="pb-3.5 pr-5">
                  <p className="text-xs text-gray-500 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
