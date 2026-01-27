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
  <img src="https://img.shields.io/badge/License-Proprietary-red.svg" alt="License: Proprietary"/>
  <img src="https://img.shields.io/badge/Fees-0%25-14F195.svg" alt="Zero Fees"/>
</p>

```
 ███████╗ ██████╗ ██╗     ██████╗ ███████╗ ██████╗██╗      █████╗ ██╗███╗   ███╗███████╗██████╗
 ██╔════╝██╔═══██╗██║     ██╔══██╗██╔════╝██╔════╝██║     ██╔══██╗██║████╗ ████║██╔════╝██╔══██╗
 ███████╗██║   ██║██║     ██████╔╝█████╗  ██║     ██║     ███████║██║██╔████╔██║█████╗  ██████╔╝
 ╚════██║██║   ██║██║     ██╔══██╗██╔══╝  ██║     ██║     ██╔══██║██║██║╚██╔╝██║██╔══╝  ██╔══██╗
 ███████║╚██████╔╝███████╗██║  ██║███████╗╚██████╗███████╗██║  ██║██║██║ ╚═╝ ██║███████╗██║  ██║
 ╚══════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚══════╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝
                              Reclaim Your Locked SOL
```

---

## Overview

Every token account on Solana holds ~0.00203 SOL in rent. When you swap, trade, or receive airdrops, these accounts accumulate. Even after transferring tokens out, the empty accounts remain, holding your SOL hostage.

**SolReclaimer** helps you close these empty accounts and get your SOL back - completely free.

### Key Features

| Feature | Description |
|---------|-------------|
| **Zero Fees** | Unlike other tools that take 5-10%, we take nothing |
| **Batch Processing** | Close up to 20 accounts per transaction |
| **Safe** | Only closes accounts with zero balance |
| **Non-Custodial** | Your keys never leave your wallet |
| **Secure** | Transactions are simulated before execution |

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

## Security

| Aspect | Implementation |
|--------|----------------|
| **No Private Keys on Server** | Web app uses wallet adapter (client-side signing) |
| **No Backend Required** | All operations use RPC directly |
| **Transaction Simulation** | All transactions simulated before execution |
| **Non-Custodial** | Your keys never leave your wallet |

---

## License

**Proprietary** - All rights reserved. See [LICENSE](LICENSE) for details.

This software is not open source. Copying, modification, or distribution is prohibited.

---

<p align="center">
  <b>Built by Dequavious</b>
</p>
