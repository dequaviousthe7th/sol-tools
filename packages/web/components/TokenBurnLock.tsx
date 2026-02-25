'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  createBurnInstruction,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

interface TokenAccount {
  mint: string;
  balance: number;
  decimals: number;
  ata: string;
}

type Mode = 'burn' | 'lock';
type AppState = 'idle' | 'loading' | 'ready' | 'executing' | 'confirming' | 'success' | 'error';

const LOCK_VAULT = new PublicKey('11111111111111111111111111111112');

function friendlyError(msg: string): string {
  if (msg.includes('insufficient funds')) return 'Insufficient SOL for transaction fees.';
  if (msg.includes('User rejected')) return '';
  if (msg.includes('blockhash') || msg.includes('expired')) return 'Transaction expired. Please try again.';
  return msg;
}

const FireIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
  </svg>
);

const LockIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

export const TokenBurnLock = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [mode, setMode] = useState<Mode>('burn');
  const [state, setState] = useState<AppState>('idle');
  const [tokens, setTokens] = useState<TokenAccount[]>([]);
  const [selected, setSelected] = useState<TokenAccount | null>(null);
  const [amount, setAmount] = useState('');
  const [pct, setPct] = useState<number | null>(null);
  const [lockConfirmed, setLockConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [txSig, setTxSig] = useState('');
  const [search, setSearch] = useState('');

  const fetchTokens = useCallback(async () => {
    if (!publicKey || !connection) return;
    setState('loading');
    setError('');
    try {
      const resp = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID });
      const list: TokenAccount[] = resp.value
        .map(acc => {
          const info = acc.account.data.parsed.info;
          return {
            mint: info.mint,
            balance: Number(info.tokenAmount.uiAmount),
            decimals: info.tokenAmount.decimals,
            ata: acc.pubkey.toBase58(),
          };
        })
        .filter(t => t.balance > 0)
        .sort((a, b) => b.balance - a.balance);
      setTokens(list);
      setState('ready');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch tokens');
      setState('error');
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchTokens();
    } else {
      setState('idle');
      setTokens([]);
      setSelected(null);
    }
  }, [connected, publicKey, fetchTokens]);

  const execute = async () => {
    if (!publicKey || !selected || !connection) return;
    if (mode === 'lock' && !lockConfirmed) return;

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0 || val > selected.balance) {
      setError('Enter a valid amount');
      return;
    }

    setState('executing');
    setError('');

    try {
      const mintPubkey = new PublicKey(selected.mint);
      const rawAmount = BigInt(Math.floor(val * Math.pow(10, selected.decimals)));
      const tx = new Transaction();

      if (mode === 'burn') {
        const ata = await getAssociatedTokenAddress(mintPubkey, publicKey);
        tx.add(createBurnInstruction(ata, mintPubkey, publicKey, rawAmount));
      } else {
        const sourceAta = await getAssociatedTokenAddress(mintPubkey, publicKey);
        const vaultAta = await getAssociatedTokenAddress(mintPubkey, LOCK_VAULT, true);
        try {
          await getAccount(connection, vaultAta);
        } catch {
          tx.add(createAssociatedTokenAccountInstruction(publicKey, vaultAta, LOCK_VAULT, mintPubkey));
        }
        tx.add(createTransferInstruction(sourceAta, vaultAta, publicKey, rawAmount));
      }

      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection);
      setState('confirming');
      setTxSig(signature);

      const start = Date.now();
      let ok = false;
      while (Date.now() - start < 60_000) {
        const statuses = await connection.getSignatureStatuses([signature]);
        const v = statuses?.value?.[0];
        if (v?.confirmationStatus === 'confirmed' || v?.confirmationStatus === 'finalized') { ok = true; break; }
        await new Promise(r => setTimeout(r, 2000));
      }

      if (ok) {
        setState('success');
      } else {
        setError('Transaction sent but confirmation timed out. Check Solscan.');
        setState('error');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? friendlyError(e.message) : `${mode === 'burn' ? 'Burn' : 'Lock'} failed`;
      if (msg) { setError(msg); setState('error'); }
      else { setState('ready'); setLockConfirmed(false); }
    }
  };

  const handlePct = (p: number) => {
    if (!selected) return;
    setPct(p);
    setAmount((selected.balance * p / 100).toString());
  };

  const reset = () => {
    setSelected(null);
    setAmount('');
    setPct(null);
    setLockConfirmed(false);
    setError('');
    setTxSig('');
    setState('ready');
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setAmount('');
    setPct(null);
    setLockConfirmed(false);
    setError('');
  };

  const isBurn = mode === 'burn';
  const accent = isBurn ? 'orange' : 'blue';

  // ──────────── NOT CONNECTED ────────────
  if (!connected) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 flex items-center justify-center border border-orange-500/20">
              <FireIcon className="w-7 h-7 text-orange-500" />
            </div>
            <div className="w-[1px] h-10 bg-[#222228]" />
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center border border-blue-500/20">
              <LockIcon className="w-7 h-7 text-blue-500" />
            </div>
          </div>
          <h2 className="text-white font-bold text-xl mb-2">Burn or Lock</h2>
          <p className="text-gray-400 text-sm mb-2 max-w-md mx-auto leading-relaxed">
            Permanently remove tokens from circulation or lock them in an unrecoverable vault.
            Build trust with your community — verifiable on-chain.
          </p>
          <p className="text-gray-600 text-xs">Connect your wallet above to get started.</p>
        </div>
      </div>
    );
  }

  // ──────────── LOADING ────────────
  if (state === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-solana-purple/30 border-t-solana-purple rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your tokens...</p>
        </div>
      </div>
    );
  }

  // ──────────── SUCCESS ────────────
  if (state === 'success') {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-solana-green/10 flex items-center justify-center border border-solana-green/30">
            <svg className="w-8 h-8 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-white font-bold text-xl mb-2">
            {isBurn ? 'Tokens Burned' : 'Tokens Locked'}
          </h2>
          <p className="text-gray-400 text-sm mb-1">
            {amount} tokens {isBurn ? 'permanently removed from circulation' : 'permanently locked in vault'}.
          </p>
          {!isBurn && (
            <p className="text-gray-600 text-[11px] font-mono mb-3">
              Vault: {LOCK_VAULT.toBase58().slice(0, 12)}...{LOCK_VAULT.toBase58().slice(-4)}
            </p>
          )}
          {txSig && (
            <a
              href={`https://solscan.io/tx/${txSig}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-solana-purple text-xs hover:underline inline-flex items-center gap-1 mb-6"
            >
              View on Solscan
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          <div>
            <button onClick={reset} className="px-6 py-2.5 rounded-xl bg-[#111113] border border-[#222228] text-white text-sm font-medium hover:border-[#333] transition-all">
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────── MAIN LAYOUT (two-column on desktop) ────────────
  const filtered = tokens.filter(t => search ? t.mint.toLowerCase().includes(search.toLowerCase()) : true);

  return (
    <div className="flex-1 flex flex-col xl:flex-row xl:min-h-0 overflow-hidden">

      {/* ───── LEFT: Token List ───── */}
      <div className="xl:w-[380px] xl:flex-shrink-0 xl:border-r xl:border-[#1a1a1f] flex flex-col overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-white font-semibold text-sm">Your Tokens</h2>
              <p className="text-gray-600 text-[11px] mt-0.5">{tokens.length} with balance</p>
            </div>
            <button
              onClick={fetchTokens}
              className="text-gray-500 hover:text-white text-[11px] flex items-center gap-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
          {tokens.length > 5 && (
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by mint address..."
              className="w-full bg-[#0d0d0f] border border-[#1a1a1f] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-solana-purple/40 focus:outline-none transition-colors"
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto scroll-fade px-5 pb-5 space-y-1.5">
          {filtered.map(token => {
            const isActive = selected?.ata === token.ata;
            return (
              <button
                key={token.ata}
                onClick={() => { setSelected(token); setError(''); setAmount(''); setPct(null); setLockConfirmed(false); }}
                className={`w-full rounded-xl px-3.5 py-3 flex items-center gap-3 transition-all text-left group ${
                  isActive
                    ? 'bg-solana-purple/[0.08] border border-solana-purple/30'
                    : 'bg-[#0d0d0f] border border-[#1a1a1f] hover:border-[#333] hover:bg-[#111113]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                  isActive
                    ? 'bg-solana-purple/15 text-solana-purple'
                    : 'bg-[#111113] border border-[#222228] text-gray-600 group-hover:text-gray-400'
                }`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11.5px] font-mono truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>{token.mint}</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">{token.balance.toLocaleString()} tokens</p>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-solana-purple animate-pulse flex-shrink-0" />}
              </button>
            );
          })}

          {filtered.length === 0 && tokens.length > 0 && (
            <div className="text-center py-8 text-gray-600 text-sm">No tokens match your search.</div>
          )}
          {tokens.length === 0 && state === 'ready' && (
            <div className="text-center py-8 text-gray-600 text-sm">No tokens with balance found.</div>
          )}
        </div>
      </div>

      {/* ───── RIGHT: Action Panel ───── */}
      <div className="flex-1 flex flex-col items-center overflow-y-auto scroll-fade">
        {!selected ? (
          /* No token selected */
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center max-w-sm">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#111113] border border-[#222228] flex items-center justify-center text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">Select a token from the list to burn or lock it.</p>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-lg px-6 py-8">
            {/* Mode toggle */}
            <div className="flex p-1 rounded-xl bg-[#0d0d0f] border border-[#1a1a1f] mb-6">
              <button
                onClick={() => switchMode('burn')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
                  isBurn
                    ? 'bg-gradient-to-r from-orange-500/15 to-red-500/10 text-orange-400 shadow-sm border border-orange-500/20'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <FireIcon className="w-4 h-4" />
                Burn
              </button>
              <button
                onClick={() => switchMode('lock')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
                  !isBurn
                    ? 'bg-gradient-to-r from-blue-500/15 to-cyan-500/10 text-blue-400 shadow-sm border border-blue-500/20'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <LockIcon className="w-4 h-4" />
                Lock
              </button>
            </div>

            {/* Token info bar */}
            <div className="flex items-center justify-between bg-[#0d0d0f] border border-[#1a1a1f] rounded-xl px-4 py-3 mb-5">
              <div className="min-w-0 flex-1">
                <p className="text-gray-500 text-[10px] uppercase tracking-wider font-medium">Selected Token</p>
                <p className="text-white text-[12px] font-mono truncate mt-0.5">{selected.mint}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-gray-500 text-[10px] uppercase tracking-wider font-medium">Balance</p>
                <p className="text-white text-sm font-mono font-semibold mt-0.5">{selected.balance.toLocaleString()}</p>
              </div>
            </div>

            {/* Amount input */}
            <div className="mb-4">
              <label className="text-gray-400 text-[11px] font-medium mb-2 block">
                Amount to {isBurn ? 'burn' : 'lock'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setPct(null); }}
                  placeholder="0.00"
                  className={`w-full bg-[#0d0d0f] border rounded-xl px-4 py-3.5 text-white text-base font-mono focus:outline-none transition-all ${
                    isBurn
                      ? 'border-[#1a1a1f] focus:border-orange-500/40 focus:shadow-[0_0_0_3px_rgba(249,115,22,0.08)]'
                      : 'border-[#1a1a1f] focus:border-blue-500/40 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.08)]'
                  }`}
                />
                {amount && (
                  <button
                    onClick={() => { setAmount(''); setPct(null); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Percent buttons */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              {[25, 50, 75, 100].map(p => (
                <button
                  key={p}
                  onClick={() => handlePct(p)}
                  className={`py-2 rounded-lg text-[12px] font-semibold border transition-all duration-150 ${
                    pct === p
                      ? isBurn
                        ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                        : 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                      : 'bg-[#0d0d0f] border-[#1a1a1f] text-gray-500 hover:text-white hover:border-[#333]'
                  }`}
                >
                  {p === 100 ? 'MAX' : `${p}%`}
                </button>
              ))}
            </div>

            {/* Mode-specific info */}
            {isBurn ? (
              <div className="mb-5 px-4 py-3 rounded-xl bg-orange-500/[0.05] border border-orange-500/15">
                <div className="flex items-center gap-2 mb-1">
                  <FireIcon className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-orange-400 text-[11px] font-semibold">Permanent Burn</span>
                </div>
                <p className="text-gray-500 text-[10.5px] leading-relaxed">
                  Burned tokens are <span className="text-gray-300 font-medium">destroyed forever</span> via the SPL Token burn instruction. They are removed from total supply and can never be recovered.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 px-4 py-3 rounded-xl bg-blue-500/[0.05] border border-blue-500/15">
                  <div className="flex items-center gap-2 mb-1">
                    <LockIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-blue-400 text-[11px] font-semibold">Permanent Lock</span>
                  </div>
                  <p className="text-gray-500 text-[10.5px] leading-relaxed">
                    Tokens are transferred to an <span className="text-gray-300 font-medium">unrecoverable vault</span>. Nobody has the private key — they remain on-chain but are permanently inaccessible.
                  </p>
                  <p className="text-gray-600 text-[9px] font-mono mt-1.5">Vault: {LOCK_VAULT.toBase58()}</p>
                </div>
                <label className="flex items-start gap-2.5 mb-5 cursor-pointer group select-none">
                  <div className="mt-0.5 flex-shrink-0">
                    <input type="checkbox" checked={lockConfirmed} onChange={e => setLockConfirmed(e.target.checked)} className="sr-only" />
                    <div className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all duration-150 ${
                      lockConfirmed ? 'bg-blue-500 border-blue-500' : 'border-[#333] group-hover:border-[#555]'
                    }`}>
                      {lockConfirmed && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-400 text-[11.5px] leading-relaxed">
                    I understand this lock is <span className="text-white font-medium">permanent and irreversible</span>. The tokens can never be retrieved.
                  </span>
                </label>
              </>
            )}

            {/* Error */}
            {error && (
              <div className="mb-5 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11.5px]">
                {error}
              </div>
            )}

            {/* Execute button */}
            <button
              onClick={execute}
              disabled={
                state === 'executing' || state === 'confirming' ||
                !amount || parseFloat(amount) <= 0 || parseFloat(amount) > selected.balance ||
                (!isBurn && !lockConfirmed)
              }
              className={`w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2.5 ${
                isBurn
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:shadow-[0_0_25px_rgba(249,115,22,0.2)] disabled:hover:shadow-none'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-[0_0_25px_rgba(59,130,246,0.2)] disabled:hover:shadow-none'
              }`}
            >
              {state === 'executing' || state === 'confirming' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {state === 'executing' ? 'Signing...' : 'Confirming...'}
                </>
              ) : isBurn ? (
                <>
                  <FireIcon className="w-4.5 h-4.5" />
                  Burn {amount ? `${Number(amount).toLocaleString()} Tokens` : 'Tokens'}
                </>
              ) : (
                <>
                  <LockIcon className="w-4.5 h-4.5" />
                  Lock {amount ? `${Number(amount).toLocaleString()} Tokens` : 'Tokens'}
                </>
              )}
            </button>

            <p className="text-gray-600 text-[10px] text-center mt-3">
              This action is permanent and irreversible. {isBurn ? 'Tokens are destroyed via burn instruction.' : 'Tokens are sent to a dead address.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
