'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MobileToolDropdown } from '@/components/MobileToolDropdown';

type Tab = 'privacy' | 'terms' | 'disclaimer';

const TABS: { id: Tab; label: string }[] = [
  { id: 'privacy', label: 'Privacy Policy' },
  { id: 'terms', label: 'Terms of Service' },
  { id: 'disclaimer', label: 'Disclaimer' },
];

const CONTACT = 'solreclaimer@gmail.com';
const EFFECTIVE_DATE = 'May 25, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-white font-semibold text-[13px] uppercase tracking-wider mb-3 pb-2 border-b border-[#1a1a1f]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-gray-400 leading-relaxed mb-3">{children}</p>;
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[13px] text-gray-500 leading-relaxed">
      <span className="text-solana-purple/50 mt-[3px] flex-shrink-0">▸</span>
      <span>{children}</span>
    </li>
  );
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-2 mb-3">{children}</ul>;
}

function ContactLink() {
  return (
    <a
      href={`mailto:${CONTACT}`}
      className="text-solana-purple hover:text-solana-purple/80 transition-colors"
    >
      {CONTACT}
    </a>
  );
}

function PrivacyPolicy() {
  return (
    <div>
      <Section title="What We Collect">
        <P>SolTools collects the minimum data necessary to operate the platform. Here is a precise inventory:</P>
        <Ul>
          <Li>
            <strong className="text-gray-300">Wallet addresses and transaction data</strong> — When you
            use SOL Reclaimer or purchase Vanity Generator tokens, your public Solana wallet address is
            stored alongside your transaction history (SOL amounts, account counts, timestamps,
            transaction signatures). This data maintains the reclaim ledger and verifies token ownership.
            Additionally, recent wallet addresses and reclaim amounts are displayed publicly on the
            SolTools homepage activity feed as part of the platform&apos;s transparency features. When
            any wallet address is queried through Wallet X-Ray, the resulting analysis (derived entirely
            from publicly available on-chain data) is cached in our systems for up to 20 minutes to
            improve performance, then automatically deleted.
          </Li>
          <Li>
            <strong className="text-gray-300">Anonymous session identifiers</strong> — A random UUID is
            generated in your browser and held in memory only (never in cookies or localStorage). It is
            sent to our servers solely to count active users in real time and expires automatically within
            2 minutes. It cannot be linked to your identity.
          </Li>
          <Li>
            <strong className="text-gray-300">Country code</strong> — Your country is inferred from your
            IP address by Cloudflare at the network edge. Only the two-letter country code (e.g. &ldquo;GB&rdquo;) is
            stored as an aggregate in our page-view analytics. Your IP address itself is not stored.
          </Li>
          <Li>
            <strong className="text-gray-300">Social interaction counts</strong> — Clicks on our GitHub,
            X (Twitter), and share buttons are counted in aggregate. No per-user data is recorded.
          </Li>
          <Li>
            <strong className="text-gray-300">Feature request submissions</strong> — If you submit a
            feature request, the title and description are stored. A contact field is optional; you may
            leave it blank or enter an email, X handle, or any other identifier you choose to share.
          </Li>
          <Li>
            <strong className="text-gray-300">IP addresses (security only)</strong> — Your IP is used
            in memory to enforce API rate limits for regular users and is never written to disk. If
            repeated failed admin authentication attempts are detected from an IP, that IP is recorded
            in our database for up to 1 hour as a security measure, then automatically deleted.
          </Li>
        </Ul>
      </Section>

      <Section title="What We Do Not Collect">
        <Ul>
          <Li>Cookies of any kind — we set none</Li>
          <Li>
            Personal data in browser storage — your browser&apos;s localStorage holds only UI preferences
            (sidebar open/closed state, dismissed notification banners). This data never leaves your
            device and is not transmitted to our servers.
          </Li>
          <Li>Email addresses (unless you voluntarily include one in a feature request)</Li>
          <Li>Private keys or seed phrases — SolTools is entirely non-custodial</Li>
          <Li>Precise geolocation or device fingerprints</Li>
          <Li>Names, usernames, or any other personal identifiers</Li>
          <Li>Payment information (SOL transactions are on-chain; we never see card details)</Li>
        </Ul>
      </Section>

      <Section title="How We Use Your Data">
        <Ul>
          <Li>
            <strong className="text-gray-300">Wallet data</strong> — To maintain the public reclaim
            ledger, enforce per-wallet daily caps, and verify vanity token ownership.
          </Li>
          <Li>
            <strong className="text-gray-300">Analytics</strong> — To understand aggregate usage
            patterns and improve the platform. No data is sold or shared for advertising.
          </Li>
          <Li>
            <strong className="text-gray-300">Feature requests</strong> — To prioritise development.
            Contact details, if provided, are used only to follow up on the specific request.
          </Li>
        </Ul>
      </Section>

      <Section title="Data Retention">
        <Ul>
          <Li>Anonymous session IDs: 2 minutes (automatic expiry)</Li>
          <Li>Rate-limit lockout records: 1 hour (automatic expiry)</Li>
          <Li>Reclaim history: rolling 200 most recent entries</Li>
          <Li>Per-wallet reclaim stats and vanity purchase logs: retained indefinitely (tied to on-chain activity)</Li>
          <Li>Feature requests: retained indefinitely unless deletion is requested</Li>
        </Ul>
      </Section>

      <Section title="Third-Party Services">
        <P>SolTools uses the following external services, each operating under their own privacy policies:</P>
        <Ul>
          <Li><strong className="text-gray-300">Cloudflare</strong> — Hosting, content delivery, KV storage, and IP-based country inference</Li>
          <Li><strong className="text-gray-300">Helius / Solana RPC</strong> — On-chain data queries</Li>
          <Li><strong className="text-gray-300">DexScreener</strong> — Token market data (prices, liquidity, volume)</Li>
          <Li><strong className="text-gray-300">Jupiter</strong> — Token pricing and swap data</Li>
          <Li><strong className="text-gray-300">GitHub</strong> — Open-source code repository (publicly visible)</Li>
        </Ul>
      </Section>

      <Section title="Your Rights (UK / EU GDPR)">
        <P>
          If you are located in the UK or EU, you have rights under the UK GDPR / GDPR including the
          right to access, correct, or request deletion of data we hold about you. Since most data is
          keyed by wallet address, please include your wallet address in any request so we can identify
          the relevant records.
        </P>
        <P>
          To exercise any right, email <ContactLink />.
        </P>
      </Section>

      <Section title="Contact">
        <P>Questions about this policy: <ContactLink /></P>
      </Section>
    </div>
  );
}

function TermsOfService() {
  return (
    <div>
      <Section title="Acceptance">
        <P>
          By accessing or using soltools.net (&ldquo;SolTools&rdquo;, &ldquo;the Service&rdquo;), you agree to be bound by
          these Terms of Service. If you do not agree, do not use the Service.
        </P>
      </Section>

      <Section title="Free Service — No Warranties">
        <P>
          SolTools is provided free of charge, as-is, with no warranties of any kind — express or
          implied. We do not guarantee uptime, data accuracy, completeness, or fitness for any
          particular purpose. The Service may be modified, suspended, or discontinued at any time
          without notice.
        </P>
      </Section>

      <Section title="Non-Custodial">
        <P>
          SolTools never holds, controls, or has access to your funds or private keys. All
          transactions are initiated and cryptographically signed by you using your own wallet. We
          have no ability to reverse, freeze, modify, or recover any transaction.
        </P>
      </Section>

      <Section title="On-Chain Transactions Are Irreversible">
        <P>
          Actions taken through SolTools — including closing token accounts (SOL Reclaimer), burning
          tokens, creating on-chain locks, and generating vanity addresses — result in signed Solana
          transactions that are permanent once confirmed on-chain. You are solely responsible for
          verifying all inputs, amounts, and wallet addresses before approving any transaction in
          your wallet.
        </P>
      </Section>

      <Section title="Not Financial Advice">
        <P>
          Nothing on SolTools — including token safety scores, risk assessments, holder analysis, or
          market data — constitutes financial, investment, trading, or legal advice. All information
          is provided for informational purposes only. Always conduct your own research before making
          any financial decision.
        </P>
      </Section>

      <Section title="Acceptable Use">
        <P>You agree not to:</P>
        <Ul>
          <Li>Use automated tools or scripts to abuse or overload the API</Li>
          <Li>Attempt to manipulate global statistics or inject false reclaim data</Li>
          <Li>Probe, scan, or attempt to access administrative interfaces</Li>
          <Li>Use the Service for any unlawful purpose or in violation of applicable law</Li>
          <Li>Attempt to reverse-engineer, copy, or redistribute the hosted service</Li>
        </Ul>
        <P>Violations may result in your IP being blocked from the Service.</P>
      </Section>

      <Section title="SOLT Token">
        <P>
          The $SOLT token is a community utility token on the Solana blockchain. It is not a
          security, does not represent equity, ownership, or a share of profits in any legal entity,
          and must not be treated as an investment. Purchasing or holding $SOLT carries the same
          risks as any speculative digital asset.
        </P>
      </Section>

      <Section title="Vanity Generator Tokens">
        <P>
          Vanity Generator access tokens are purchased via on-chain SOL transactions. All purchases
          are final and non-refundable, as the transaction is completed on-chain and tokens are
          credited immediately upon confirmation.
        </P>
      </Section>

      <Section title="Changes to These Terms">
        <P>
          We may update these Terms at any time. The effective date at the top of the Legal page
          will reflect the most recent revision. Continued use of the Service after any change
          constitutes your acceptance of the updated Terms.
        </P>
      </Section>

      <Section title="Contact">
        <P>Questions or concerns: <ContactLink /></P>
      </Section>
    </div>
  );
}

function Disclaimer() {
  return (
    <div>
      <Section title="Not Financial Advice">
        <P>
          SolTools is an informational utility platform. Nothing on this site — including token
          safety scores, risk assessments, wallet analysis, market data, or any other output —
          constitutes financial, investment, trading, or legal advice. Use all information as a
          starting point for your own research, not as a basis for financial decisions.
        </P>
      </Section>

      <Section title="Risk Scores Are Probabilistic">
        <P>
          Token safety scores, rug pull risk assessments, and related metrics are generated
          algorithmically from publicly available on-chain data. They are probabilistic indicators,
          not guarantees. A high safety score does not mean a token is safe. A low score does not
          mean a token will fail. These tools are designed to surface patterns, not to predict
          outcomes with certainty.
        </P>
      </Section>

      <Section title="On-Chain Operations Are Irreversible">
        <P>
          Burning tokens, creating on-chain vesting locks, and closing empty token accounts are
          permanent actions on the Solana blockchain. They cannot be undone, reversed, or recovered
          after confirmation. You must verify every detail — token, amount, duration, and
          destination — before signing any transaction in your wallet. SolTools accepts no liability
          for transactions signed in error.
        </P>
      </Section>

      <Section title="Cryptocurrency Risk">
        <P>
          Cryptocurrency and token markets are highly volatile. Token values can drop to zero
          rapidly and without warning. Past performance of any token is not indicative of future
          results. Trading and investing in digital assets carries a high risk of loss, including
          total loss of capital.
        </P>
      </Section>

      <Section title="Third-Party Data">
        <P>
          Price data, holder information, liquidity figures, and other market data are sourced from
          third-party APIs including DexScreener, Jupiter, and Helius. This data may be delayed,
          incomplete, or inaccurate. SolTools does not independently verify third-party data and
          accepts no responsibility for errors or omissions in that data.
        </P>
      </Section>

      <Section title="No Liability">
        <P>
          To the maximum extent permitted by applicable law, SolTools, its creator, and contributors
          accept no liability for any direct, indirect, incidental, special, or consequential
          damages, including but not limited to: financial losses from trading decisions informed by
          SolTools data, losses resulting from on-chain operations, or losses due to inaccurate
          third-party data.
        </P>
        <P>Use SolTools at your own risk.</P>
      </Section>
    </div>
  );
}

export default function LegalTabs() {
  const [active, setActive] = useState<Tab>('privacy');

  return (
    <div>
      {/* Mobile navigation header */}
      <div className="xl:hidden flex items-center justify-between px-5 pt-5 pb-0">
        <MobileToolDropdown />
        <Link
          href="/"
          className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          SolTools
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-20">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.25em] text-solana-purple/70 font-semibold mb-2">
            SolTools
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Legal & Privacy</h1>
          <p className="text-gray-500 text-[13px]">
            Effective {EFFECTIVE_DATE} ·{' '}
            <a
              href={`mailto:${CONTACT}`}
              className="hover:text-gray-300 transition-colors underline underline-offset-2 decoration-gray-700"
            >
              {CONTACT}
            </a>
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-medium border transition-all duration-200 ${
                active === tab.id
                  ? 'bg-solana-purple/10 text-solana-purple border-solana-purple/30'
                  : 'text-gray-500 border-[#222228] hover:text-gray-300 hover:border-[#333]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content card */}
        <div className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-2xl p-6 sm:p-8">
          {active === 'privacy' && <PrivacyPolicy />}
          {active === 'terms' && <TermsOfService />}
          {active === 'disclaimer' && <Disclaimer />}
        </div>
      </div>
    </div>
  );
}
