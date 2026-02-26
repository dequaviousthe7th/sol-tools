'use client';

import { useState } from 'react';
import { FeatureRequestModal } from './FeatureRequestForm';

export const FeatureRequestTrigger = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="px-4 max-w-[51rem] mx-auto w-full mt-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Coming soon */}
          <div className="relative rounded-xl border border-dashed border-[#222228] px-3.5 py-[20px] flex items-center gap-3 overflow-hidden">
            <div className="shimmer absolute inset-0 pointer-events-none" />
            <div className="w-[38px] h-[38px] rounded-lg bg-[#111113] flex items-center justify-center border border-[#222228] text-gray-600 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-[11px] font-medium">More tools coming soon</p>
              <p className="text-gray-600 text-[10px] mt-0.5">Exit strategy calculator, dev toolkit, and more.</p>
            </div>
          </div>

          {/* Request a feature */}
          <button
            onClick={() => setOpen(true)}
            className="relative rounded-xl border border-dashed border-[#222228] hover:border-solana-purple/30 px-3.5 py-[20px] flex items-center gap-3 overflow-hidden transition-colors text-left group"
          >
            <div className="w-[38px] h-[38px] rounded-lg bg-solana-purple/10 flex items-center justify-center border border-[#222228] group-hover:border-solana-purple/30 text-solana-purple flex-shrink-0 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 group-hover:text-gray-400 text-[11px] font-medium transition-colors">Request a Feature</p>
              <p className="text-gray-600 text-[10px] mt-0.5">Have an idea? Let us know what to build next.</p>
            </div>
            <svg className="w-3.5 h-3.5 text-gray-600 group-hover:text-solana-purple ml-auto flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>

      <FeatureRequestModal open={open} onClose={() => setOpen(false)} />
    </>
  );
};
