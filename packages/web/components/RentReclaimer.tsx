'use client';

import { FC, useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import {
  RentReclaimer as RentReclaimerCore,
  ScanResult,
  formatSol,
  CloseAccountsResult,
  ClosePhase,
} from '@solreclaimer/core';
import { AccountList } from './AccountList';
import { TransactionProgress } from './TransactionProgress';
import { trackSocialClick } from './Heartbeat';

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

type Status = 'idle' | 'scanning' | 'ready' | 'closing' | 'complete' | 'error';

interface RentReclaimerProps {
  onBack?: () => void;
}

export const RentReclaimer: FC<RentReclaimerProps> = ({ onBack }) => {
  const { connection } = useConnection();
  const { publicKey, signAllTransactions } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();

  const [status, setStatus] = useState<Status>('idle');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scannedAddress, setScannedAddress] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [closeResult, setCloseResult] = useState<CloseAccountsResult | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [phase, setPhase] = useState<ClosePhase | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValidAddress = BASE58_RE.test(manualAddress);

  const handleScan = useCallback(async () => {
    const scanTarget = publicKey ?? (manualAddress && isValidAddress ? new PublicKey(manualAddress) : null);
    if (!scanTarget) return;

    setStatus('scanning');
    setError(null);
    setScanResult(null);

    try {
      try {
        await connection.getBalance(scanTarget);
      } catch (connErr) {
        throw new Error(`RPC connection failed: ${connErr}`);
      }

      const reclaimer = new RentReclaimerCore({
        connection: connection,
      });

      const result = await reclaimer.scan(scanTarget);
      setScanResult(result);
      setScannedAddress(scanTarget.toBase58());

      const allSelected = new Set(
        result.closeableAccounts.map(acc => acc.pubkey.toBase58())
      );
      setSelectedAccounts(allSelected);

      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan wallet');
      setStatus('error');
    }
  }, [publicKey, manualAddress, isValidAddress, connection]);

  const handleClose = useCallback(async () => {
    if (!publicKey || !signAllTransactions || !scanResult) return;

    setStatus('closing');
    setError(null);
    setProgress({ current: 0, total: 0 });
    setPhase(null);

    try {
      const accountsToClose = scanResult.closeableAccounts.filter(
        acc => selectedAccounts.has(acc.pubkey.toBase58())
      );

      if (accountsToClose.length === 0) {
        setError('No accounts selected');
        setStatus('ready');
        return;
      }

      const reclaimer = new RentReclaimerCore({
        connection: connection,
      });

      const result = await reclaimer.closeWithWalletALT(
        publicKey,
        signAllTransactions,
        accountsToClose,
        {
          onPhase: (p) => setPhase(p),
          onProgress: (current, total) => {
            setProgress({ current, total });
          },
        }
      );

      setCloseResult(result);
      setStatus('complete');

      // Fire-and-forget stats POST
      const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
      if (workerUrl) {
        fetch(`${workerUrl}/api/stats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            solReclaimed: result.reclaimedLamports / 1e9,
            accountsClosed: result.closedCount,
            wallet: publicKey.toBase58(),
            signatures: result.signatures,
          }),
        }).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close accounts');
      setStatus('error');
    }
  }, [publicKey, signAllTransactions, scanResult, selectedAccounts, connection]);

  const handleReset = useCallback(() => {
    setStatus('idle');
    setScanResult(null);
    setScannedAddress(null);
    setManualAddress('');
    setSelectedAccounts(new Set());
    setCloseResult(null);
    setProgress({ current: 0, total: 0 });
    setPhase(null);
    setError(null);
  }, []);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    }
  }, [onBack]);

  const toggleAccount = useCallback((pubkey: string) => {
    setSelectedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(pubkey)) {
        next.delete(pubkey);
      } else {
        next.add(pubkey);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!scanResult) return;
    setSelectedAccounts(new Set(
      scanResult.closeableAccounts.map(acc => acc.pubkey.toBase58())
    ));
  }, [scanResult]);

  const deselectAll = useCallback(() => {
    setSelectedAccounts(new Set());
  }, []);

  const selectedReclaimable = scanResult?.closeableAccounts
    .filter(acc => selectedAccounts.has(acc.pubkey.toBase58()))
    .reduce((sum, acc) => sum + acc.rentLamports, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Main Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">
              {status === 'idle' && 'Ready to Scan'}
              {status === 'scanning' && 'Scanning Wallet...'}
              {status === 'ready' && 'Scan Complete'}
              {status === 'closing' && 'Closing Accounts...'}
              {status === 'complete' && 'Success!'}
              {status === 'error' && 'Error'}
            </h2>
            {status === 'idle' && (
              <p className="text-sm text-gray-400 mt-1">Find and close empty token accounts</p>
            )}
          </div>
          {(status === 'ready' || status === 'complete' || status === 'error') && (
            <button
              onClick={handleReset}
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Start Over
            </button>
          )}
        </div>

        {/* Idle State */}
        {status === 'idle' && (
          <div>
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>

            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {publicKey ? (
                <>
                  <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                    Scan your wallet to discover empty token accounts that can be closed to reclaim SOL.
                  </p>
                  <button onClick={handleScan} className="btn-primary px-8 py-3.5 sm:px-10 sm:py-4 text-base sm:text-lg">
                    Scan Wallet
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-400 mb-6 max-w-sm mx-auto">
                    Enter a Solana wallet address to scan for reclaimable accounts
                  </p>
                  <div className="max-w-md mx-auto mb-6">
                    <input
                      type="text"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value.trim())}
                      placeholder="Paste wallet address..."
                      className="rounded-xl bg-[#0d0d0f] border border-[#222228] px-4 py-3.5 text-sm text-white placeholder-gray-600 w-full font-mono focus:outline-none focus:border-solana-purple/50 transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleScan}
                    disabled={!isValidAddress}
                    className="btn-primary px-8 py-3.5 sm:px-10 sm:py-4 text-base sm:text-lg"
                  >
                    Scan
                  </button>
                  <div className="flex items-center gap-3 justify-center mt-6">
                    <div className="h-px w-12 bg-[#222228]"></div>
                    <span className="text-xs text-gray-600">or</span>
                    <div className="h-px w-12 bg-[#222228]"></div>
                  </div>
                  <button
                    onClick={() => openWalletModal(true)}
                    className="mt-4 text-sm text-gray-400 hover:text-solana-purple transition-colors"
                  >
                    Connect Wallet
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Scanning State */}
        {status === 'scanning' && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-6 relative">
              <div className="absolute inset-0 rounded-full border-4 border-solana-purple/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-solana-purple animate-spin"></div>
            </div>
            <p className="text-gray-400">Scanning token accounts...</p>
          </div>
        )}

        {/* Ready State */}
        {status === 'ready' && scanResult && (
          <div>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="stat-card">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-white">{scanResult.totalAccounts}</p>
              </div>
              <div className="stat-card highlight">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Empty</p>
                <p className="text-2xl font-bold text-solana-green">{scanResult.closeableAccounts.length}</p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Selected</p>
                <p className="text-2xl font-bold text-white">{selectedAccounts.size}</p>
              </div>
              <div className="stat-card highlight">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Reclaimable</p>
                <p className="text-2xl font-bold text-solana-green">{formatSol(selectedReclaimable)}</p>
              </div>
            </div>

            {scanResult.closeableAccounts.length > 0 ? (
              <>
                <AccountList
                  accounts={scanResult.closeableAccounts}
                  selectedAccounts={selectedAccounts}
                  onToggle={toggleAccount}
                  onSelectAll={selectAll}
                  onDeselectAll={deselectAll}
                />

                {publicKey && scannedAddress === publicKey.toBase58() ? (
                  <button
                    onClick={handleClose}
                    disabled={selectedAccounts.size === 0}
                    className="w-full mt-6 btn-primary py-3.5 sm:py-4 text-base sm:text-lg"
                  >
                    Close {selectedAccounts.size} Account{selectedAccounts.size !== 1 ? 's' : ''} & Reclaim {formatSol(selectedReclaimable)} SOL
                  </button>
                ) : (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => openWalletModal(true)}
                      className="w-full btn-primary py-3.5 sm:py-4 text-base sm:text-lg"
                    >
                      Connect Wallet to Reclaim
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      You need to connect the wallet you scanned to close accounts
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-solana-green/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xl font-semibold text-white mb-2">All Clean!</p>
                <p className="text-gray-400">No empty token accounts found. Nothing to reclaim.</p>
              </div>
            )}
          </div>
        )}

        {/* Closing State */}
        {status === 'closing' && (
          <div>
            {phase && phase !== 'confirming-close' && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-6 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-solana-purple/20"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-solana-purple animate-spin"></div>
                </div>
                <p className="text-gray-400">
                  {phase === 'building-alt' && 'Preparing address lookup table...'}
                  {phase === 'signing-alt' && 'Please approve the setup transaction in your wallet'}
                  {phase === 'confirming-alt' && 'Confirming setup transaction...'}
                  {phase === 'waiting-alt' && 'Activating lookup table...'}
                  {phase === 'building-close' && 'Building close transactions...'}
                  {phase === 'signing-close' && 'Please approve the close transactions in your wallet'}
                  {phase === 'fallback-legacy' && 'Using standard transactions...'}
                </p>
              </div>
            )}
            {(!phase || phase === 'confirming-close') && (
              <TransactionProgress current={progress.current} total={progress.total} />
            )}
          </div>
        )}

        {/* Complete State */}
        {status === 'complete' && closeResult && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-solana-green/20 flex items-center justify-center mx-auto mb-6 glow-green">
              <svg className="w-10 h-10 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-solana-green mb-2">
              +{formatSol(closeResult.reclaimedLamports)} SOL
            </h3>
            <p className="text-gray-400 mb-8">
              Successfully closed {closeResult.closedCount} account{closeResult.closedCount !== 1 ? 's' : ''}
            </p>

            {closeResult.signatures.length > 0 && (
              <div className="bg-[#0d0d0f] border border-[#222228] rounded-xl p-4 text-left max-h-48 overflow-y-auto scroll-fade">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Transactions</p>
                {closeResult.signatures.map((sig, i) => (
                  <a
                    key={i}
                    href={`https://solscan.io/tx/${sig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-solana-purple hover:text-solana-green transition-colors py-2 border-b border-[#1a1a1f] last:border-0"
                  >
                    <span className="truncate font-mono">{sig}</span>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            )}

            {/* Share on X */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just reclaimed ${formatSol(closeResult.reclaimedLamports)} SOL from ${closeResult.closedCount} empty token account${closeResult.closedCount !== 1 ? 's' : ''} with @SolanaReclaimer! #SolReclaimer\n\nReclaim yours for free: soltools.net/reclaim`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackSocialClick('share-x')}
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl border border-[#222228] bg-[#111113] text-sm text-gray-300 hover:text-white hover:border-gray-500 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share on X
            </a>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
