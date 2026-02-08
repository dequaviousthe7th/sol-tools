<p align="center">
  <img src="https://img.shields.io/badge/Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white" alt="Solana"/>
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
</p>

<h1 align="center">SolReclaimer</h1>

<p align="center">
  <b>Zero-fee Solana rent reclaimer - Close empty token accounts and get your SOL back</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.2.0-9945FF.svg" alt="Version 1.2.0"/>
  <img src="https://img.shields.io/badge/License-Proprietary-red.svg" alt="License: Proprietary"/>
  <img src="https://img.shields.io/badge/Fees-0%25-14F195.svg" alt="Zero Fees"/>
</p>

<!-- Preview screenshot — replace with actual screenshot -->
<p align="center">
  <img src="docs/preview.png" alt="SolReclaimer Preview" width="800"/>
</p>

---

## Overview

Every token account on Solana holds ~0.00203 SOL in rent. When you swap, trade, or receive airdrops, these accounts accumulate. Even after transferring tokens out, the empty accounts remain, holding your SOL hostage.

**SolReclaimer** helps you close these empty accounts and get your SOL back - completely free.

### Key Features

| Feature | Description |
|---------|-------------|
| **Zero Fees** | Unlike other tools that take 5-10%, we take nothing |
| **Batch Processing** | Close up to 15 accounts per transaction using Address Lookup Tables |
| **Safe** | Only closes accounts with zero balance |
| **Non-Custodial** | Your keys never leave your wallet |
| **Secure** | Transactions are simulated before execution |
| **Live Stats** | Real-time global stats and live activity feed |

---

## Quick Start

Visit **[solreclaimer.net](https://solreclaimer.net)** to use the app.

1. Connect your Solana wallet
2. Scan for empty token accounts
3. Select accounts to close
4. Reclaim your SOL

---

## How It Works

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  SCAN   │───►│ FILTER  │───►│  BUILD  │───►│ EXECUTE │───►│ RECLAIM │
│         │    │         │    │         │    │         │    │         │
│ Find    │    │ Zero    │    │ Batch   │    │ Sign &  │    │ SOL     │
│ Accounts│    │ Balance │    │ Txs     │    │ Send    │    │ Returns │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

1. **Scan** - Finds all token accounts in your wallet
2. **Filter** - Identifies accounts with zero balance (closeable)
3. **Build** - Creates batched transactions
4. **Execute** - Signs and sends transactions to close accounts
5. **Reclaim** - Rent SOL (~0.00203 per account) returns to your wallet

---

## Architecture

- **Web** — Next.js 14 static export, handles wallet connection and transaction building client-side
- **API Worker** — Edge-deployed worker with KV storage for stats, proxied RPC with method allowlist to keep API keys private
- **Core** — Shared TypeScript library for Solana account scanning and transaction building

---

## Security

| Aspect | Implementation |
|--------|----------------|
| **No Private Keys on Server** | Web app uses wallet adapter (client-side signing) |
| **RPC Proxy** | API worker proxies RPC calls with method allowlist — API key never exposed to client |
| **Transaction Simulation** | All transactions simulated before execution |
| **Non-Custodial** | Your keys never leave your wallet |
| **Rate Limiting** | 120 req/min per IP on the API worker |

---

## Changelog

### v1.2.0

**Mobile Support & Price Ticker**
- Full mobile-responsive redesign
- Mobile wallet picker with deep links
- Live BTC and SOL price ticker
- Address Lookup Tables for larger batch transactions
- Touch feedback and UI polish
- RPC reliability fixes

### v1.1.0

**Live Dashboard & Backend**
- Global Stats panel with live-updating SOL reclaimed, accounts closed, and wallets served (auto-refreshes every 30s)
- Live Activity feed showing recent reclaims across all users (auto-refreshes every 15s, auto-scrolls on new entries)
- Scrollbar in Live Activity only appears on hover to keep the UI clean
- Header logo and wallet button now align with side panels on wide screens
- Edge-deployed API worker with KV-backed stats tracking and RPC proxy with method allowlist
- Per-IP rate limiting (120 req/min)

### v1.0.0

**Initial Release**
- Zero-fee rent reclaiming with batch processing using Address Lookup Tables
- Solana wallet adapter integration with non-custodial client-side signing
- Transaction simulation before execution for safety
- Responsive single-page UI with gradient design system

---

## License

**Proprietary** - All rights reserved. See [LICENSE](LICENSE) for details.

This software is not open source. Copying, modification, or distribution is prohibited.

---

<p align="center">
  <b>Built by Dequavious</b>
</p>
