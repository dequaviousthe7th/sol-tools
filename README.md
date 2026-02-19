<p align="center">
  <img src="https://img.shields.io/badge/Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white" alt="Solana"/>
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Rust-DEA584?style=for-the-badge&logo=rust&logoColor=black" alt="Rust"/>
</p>

<h1 align="center">SolTools</h1>

<p align="center">
  <b>Free, open-source Solana tools. No fees, no tracking, no compromise.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.6.0-9945FF.svg" alt="Version 1.6.0"/>
  <img src="https://img.shields.io/badge/License-Proprietary-red.svg" alt="License: Proprietary"/>
  <img src="https://img.shields.io/badge/Fees-0%25-14F195.svg" alt="Zero Fees"/>
</p>

<!-- Main hub preview -->
<p align="center">
  <img src="docs/preview-hub.png" alt="SolTools Hub" width="800"/>
</p>

---

## Overview

**SolTools** is a collection of free Solana utilities at [soltools.net](https://soltools.net).

### Tools

| Tool | Route | Description |
|------|-------|-------------|
| **SOL Reclaimer** | `/reclaim` | Close empty token accounts and reclaim locked rent SOL |
| **Vanity Generator** | `/vanity` | Generate custom Solana wallet addresses with token-based access |
| **Token Scanner** | `/scan` | Instant safety reports — risk scores, holder concentration, LP status, market data |
| **Wallet X-Ray** | `/xray` | Full PnL breakdown, win rate, trader grade, and per-token analysis for any wallet |
| ~~Hackathon Screener~~ | `/hackathon` | *Ended* — PumpFun "Build in Public" hackathon tracker (disabled) |

More tools coming soon.

---

## Quick Start

Visit **[soltools.net](https://soltools.net)** to browse all tools.

### SOL Reclaimer

<p align="center">
  <img src="docs/preview-reclaim.png" alt="SOL Reclaimer" width="800"/>
</p>

1. Go to [soltools.net/reclaim](https://soltools.net/reclaim)
2. Connect your Solana wallet
3. Scan for empty token accounts
4. Select accounts to close
5. Reclaim your SOL

### Vanity Generator

<p align="center">
  <img src="docs/preview-vanity.png" alt="Vanity Generator" width="800"/>
</p>

1. Go to [soltools.net/vanity](https://soltools.net/vanity)
2. Connect your wallet and purchase tokens (1 token = 1 search)
3. Enter a prefix or suffix (1-4 characters)
4. Generate runs entirely in your browser via WASM
5. Download your keypair in Solana CLI format

### Token Scanner

<p align="center">
  <img src="docs/preview-scanner.png" alt="Token Scanner" width="800"/>
</p>

1. Go to [soltools.net/scan](https://soltools.net/scan)
2. Enter any Solana token address
3. Get an instant safety report with risk score, holder concentration, LP status, and market data
4. View live chart with market cap overlay

### Wallet X-Ray

<p align="center">
  <img src="docs/preview-xray.png" alt="Wallet X-Ray" width="800"/>
</p>

1. Go to [soltools.net/xray](https://soltools.net/xray)
2. Enter any wallet address (no connection needed)
3. View trader grade (A+ to F), PnL breakdown, win rate, and per-token trade history
4. Save wallets to track balances and quickly re-analyze them

<p align="center">
  <img src="docs/preview-xray-tracked.png" alt="Wallet X-Ray — Tracked Wallets" width="800"/>
</p>

---

## How the Reclaimer Works

Every token account on Solana holds ~0.00203 SOL in rent. When you swap, trade, or receive airdrops, these accounts accumulate. Even after transferring tokens out, the empty accounts remain, holding your SOL hostage.

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  SCAN   │───►│ FILTER  │───►│  BUILD  │───►│ EXECUTE │───►│ RECLAIM │
│         │    │         │    │         │    │         │    │         │
│ Find    │    │ Zero    │    │ Batch   │    │ Sign &  │    │ SOL     │
│ Accounts│    │ Balance │    │ Txs     │    │ Send    │    │ Returns │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### Key Features

| Feature | Description |
|---------|-------------|
| **Zero Fees** | Unlike other tools that take 5-10%, we take nothing |
| **Batch Processing** | Close up to 15 accounts per transaction |
| **Safe** | Only closes accounts with zero balance |
| **Non-Custodial** | Your keys never leave your wallet |
| **Secure** | Transactions are simulated before execution |
| **Live Stats** | Real-time stats and live activity feed |

---

## How the Vanity Generator Works

The vanity generator creates Solana keypairs with custom prefixes or suffixes. All generation runs client-side in your browser using compiled Rust (WebAssembly) — zero network requests, keys never leave your device.

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  INPUT  │───►│  SPAWN  │───►│ SEARCH  │───►│  MATCH  │───►│ EXPORT  │
│         │    │         │    │         │    │         │    │         │
│ Prefix  │    │ WASM    │    │ Generate│    │ Base58  │    │ Download│
│ Suffix  │    │ Workers │    │ Keypairs│    │ Check   │    │ Keypair │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### Key Features

| Feature | Description |
|---------|-------------|
| **Client-Side** | Runs entirely in your browser — works offline after page load |
| **Multi-Threaded** | Uses all available CPU cores for fast generation |
| **Secure** | Private keys are generated locally and never transmitted |
| **Flexible** | Choose prefix, suffix, or both (1-4 characters each) |
| **Token Access** | 1 token per search, purchased with SOL |

---

## Architecture

- **Web** — Next.js 14 static export with tools hub at `/`, individual tools at `/reclaim`, `/vanity`, `/scan`, `/xray`
- **API Worker** — Edge-deployed worker for proxied RPC and backend services
- **Core** — Shared TypeScript library for Solana account scanning and transaction building
- **WASM** — Rust-compiled vanity address generator running in Web Workers

---

## Security

| Aspect | Implementation |
|--------|----------------|
| **No Private Keys on Server** | Client-side signing via wallet adapter |
| **RPC Proxy** | API worker proxies RPC calls — keys never exposed |
| **Transaction Simulation** | All transactions simulated before execution |
| **Non-Custodial** | Your keys never leave your wallet |
| **Client-Side Keygen** | Vanity generator runs entirely in-browser |
| **Rate Limiting** | Per-IP rate limiting on the API worker |

---

## Changelog

### v1.6.0

**Token Scanner, Wallet X-Ray & UI Refresh**
- New tool: Token Scanner with safety reports, risk scores, and live charts
- New tool: Wallet X-Ray with PnL breakdown, trader grades, and per-token history
- Saved wallets with import/export and live balance tracking
- Redesigned X-Ray idle screen with dashboard and empty modes
- Compact home page layout with unified visual theme
- Hackathon screener disabled (code preserved for future events)
- Various UI and layout improvements

### v1.5.0

**Hackathon Screener & Mobile Polish**
- Hackathon screener with live market data, sorting, and search
- Full mobile-responsive pass across all pages
- UI polish and bug fixes

### v1.4.0

**Vanity Token System**
- Token-based access for vanity generator
- 6 bundle tiers with volume discounts
- Live price ticker (SOL & BTC)
- Improved mobile layout

### v1.3.0

**SolTools Rebrand & Tools Hub**
- Rebranded from SolReclaimer to SolTools
- New tools hub homepage with tool cards
- Vanity address generator
- Collapsible sidebar and bottom nav

### v1.2.0

**Mobile Support & Price Ticker**
- Full mobile-responsive redesign
- Batch transaction improvements

### v1.1.0

**Live Dashboard & Backend**
- Live activity feed
- Edge-deployed API worker

### v1.0.0

**Initial Release**
- Zero-fee rent reclaiming with batch processing
- Solana wallet adapter integration
- Transaction simulation

---

## License

**Proprietary** - All rights reserved. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>Built by Dequavious</b>
</p>
