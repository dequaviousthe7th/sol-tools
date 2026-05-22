import type { Metadata, Viewport } from 'next';
import { Space_Grotesk } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { LazyProviders } from '@/components/LazyProviders';
import { ToolLayout } from '@/components/ToolLayout';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

export const viewport: Viewport = {
  themeColor: '#9945FF',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://soltools.net'),
  title: {
    default: 'SolTools — Free Solana Tools',
    template: '%s | SolTools',
  },
  description: 'Free Solana tools: reclaim locked SOL, burn & lock tokens, scan token safety, X-Ray wallets, generate vanity addresses. No fees, no tracking.',
  keywords: [
    'Solana', 'SOL', 'reclaim SOL', 'token accounts', 'close token accounts',
    'burn token', 'lock token', 'token scanner', 'token safety', 'Solana wallet',
    'wallet X-Ray', 'PnL tracker', 'vanity wallet', 'Solana tools', 'SolTools',
    'free Solana', 'no fees', 'on-chain', 'Pump.fun',
  ],
  authors: [{ name: 'SolTools' }],
  creator: 'SolTools',
  publisher: 'SolTools',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: 'https://soltools.net',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'SolTools — Free Solana Tools',
    description: 'Reclaim SOL, burn & lock tokens, scan tokens, X-Ray wallets, generate vanity addresses. 100% free, no tracking.',
    type: 'website',
    url: 'https://soltools.net',
    siteName: 'SolTools',
    locale: 'en_US',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SolTools — Free Solana Tools' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@SolToolsNet',
    creator: '@SolToolsNet',
    title: 'SolTools — Free Solana Tools',
    description: 'Reclaim SOL, scan tokens, X-Ray wallets. Free, no tracking, verifiable on-chain.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/icon-32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.mainnet-beta.solana.com" />
      </head>
      <body className={spaceGrotesk.className}>
        <Script id="schema-org" type="application/ld+json" strategy="beforeInteractive">{`{"@context":"https://schema.org","@type":"WebSite","name":"SolTools","url":"https://soltools.net","description":"Free Solana tools: reclaim SOL, burn & lock tokens, scan token safety, X-Ray wallets, generate vanity addresses.","potentialAction":{"@type":"SearchAction","target":{"@type":"EntryPoint","urlTemplate":"https://soltools.net/scan?token={search_term_string}"},"query-input":"required name=search_term_string"}}`}</Script>
        <LazyProviders>
          <ToolLayout>
            {children}
          </ToolLayout>
        </LazyProviders>
      </body>
    </html>
  );
}
