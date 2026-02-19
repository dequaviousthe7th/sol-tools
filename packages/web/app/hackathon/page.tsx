import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hackathon Screener - SolTools',
  description: 'The PumpFun Build in Public hackathon has ended.',
};

export default function HackathonPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-[#111113] border border-[#222228] flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-4" viewBox="0 0 20 12" fill="none">
            <rect x="0.5" y="0.5" width="19" height="11" rx="5.5" fill="#1a1a1f" stroke="#222228" strokeWidth="1" />
            <path d="M10 0.5H14.5C17.2614 0.5 19.5 2.73858 19.5 5.5V6.5C19.5 9.26142 17.2614 11.5 14.5 11.5H10V0.5Z" fill="#333" stroke="#222228" strokeWidth="1" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Hackathon Ended</h1>
        <p className="text-gray-400 text-sm mb-6">
          The PumpFun &ldquo;Build in Public&rdquo; hackathon has concluded. This tool is no longer active.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111113] border border-[#222228] text-sm text-gray-400 hover:text-solana-purple hover:border-solana-purple/30 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to SolTools
        </Link>
      </div>
    </main>
  );
}
