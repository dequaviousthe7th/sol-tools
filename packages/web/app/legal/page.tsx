import type { Metadata } from 'next';
import LegalTabs from './LegalTabs';

export const metadata: Metadata = {
  title: 'Legal & Privacy',
  description:
    'SolTools privacy policy, terms of service, and disclaimer. Minimal data collection — no cookies, no tracking, fully non-custodial.',
  alternates: { canonical: 'https://soltools.net/legal' },
  openGraph: {
    title: 'Legal & Privacy — SolTools',
    description: 'Privacy policy, terms of service, and disclaimer for SolTools.',
    url: 'https://soltools.net/legal',
    siteName: 'SolTools',
    type: 'website',
  },
};

export default function LegalPage() {
  return (
    <main className="flex-1 flex flex-col xl:overflow-hidden relative">
      <div className="flex-1 overflow-y-auto scroll-fade">
        <LegalTabs />
      </div>
    </main>
  );
}
