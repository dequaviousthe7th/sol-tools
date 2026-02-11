'use client';

import { FC, useState, useCallback, useRef, useEffect } from 'react';
import { validatePrefix, validateSuffix } from '@/lib/vanity/generator';
import { WorkerManager } from '@/lib/vanity/worker-manager';
import { VanityResult } from './VanityResult';

type Mode = 'prefix' | 'suffix' | 'both';
type Status = 'idle' | 'searching' | 'found' | 'stopped';

interface FoundResult {
  address: string;
  secretKey: Uint8Array;
  totalAttempts: number;
  elapsedMs: number;
}

export const VanityGenerator: FC = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [mode, setMode] = useState<Mode>('prefix');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FoundResult | null>(null);

  const [attempts, setAttempts] = useState(0);
  const [rate, setRate] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const managerRef = useRef<WorkerManager | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      managerRef.current?.stop();
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, []);

  const handleStart = useCallback(() => {
    setError(null);
    setResult(null);

    try {
      if (mode === 'prefix' || mode === 'both') {
        if (!prefix) { setError('Enter a prefix'); return; }
        if (prefix.length > 4) { setError('Max 4 characters for prefix'); return; }
        validatePrefix(prefix, caseSensitive);
      }
      if (mode === 'suffix' || mode === 'both') {
        if (!suffix) { setError('Enter a suffix'); return; }
        if (suffix.length > 4) { setError('Max 4 characters for suffix'); return; }
        validateSuffix(suffix, caseSensitive);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid pattern');
      return;
    }

    setStatus('searching');
    setAttempts(0);
    setRate(0);
    setElapsed(0);
    startTimeRef.current = Date.now();

    elapsedTimerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 100);

    const workerCount = Math.max(1, (navigator.hardwareConcurrency || 4) - 1);
    const manager = new WorkerManager({
      prefix: (mode === 'prefix' || mode === 'both') ? prefix : undefined,
      suffix: (mode === 'suffix' || mode === 'both') ? suffix : undefined,
      caseSensitive,
      workerCount,
      onProgress: (totalAttempts, currentRate) => {
        setAttempts(totalAttempts);
        setRate(currentRate);
      },
      onFound: (address, secretKey, totalAttempts) => {
        const elapsedMs = Date.now() - startTimeRef.current;
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
        setResult({ address, secretKey, totalAttempts, elapsedMs });
        setAttempts(totalAttempts);
        setElapsed(elapsedMs);
        setStatus('found');
      },
      onError: (err) => {
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
        setError(err);
        setStatus('idle');
      },
    });

    managerRef.current = manager;
    manager.start();
  }, [prefix, suffix, caseSensitive, mode]);

  const handleStop = useCallback(() => {
    managerRef.current?.stop();
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    setStatus('stopped');
  }, []);

  const handleReset = useCallback(() => {
    managerRef.current?.stop();
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    setStatus('idle');
    setResult(null);
    setAttempts(0);
    setRate(0);
    setElapsed(0);
    setError(null);
  }, []);

  // Difficulty estimate — accounts for combined prefix+suffix in "both" mode
  const getDifficultyEstimate = (prefixLen: number, suffixLen: number): string => {
    // Each char is ~58 possibilities (base58). Combined = multiplicative.
    const totalLen = prefixLen + suffixLen;
    if (totalLen === 0) return '';
    if (totalLen === 1) return 'Instant';
    if (totalLen === 2) return '< 1 second';
    if (totalLen === 3) return '~5-30 seconds';
    if (totalLen === 4) return '~1-5 minutes';
    if (totalLen === 5) return '~30 min - 2 hours';
    if (totalLen === 6) return '~1-8 hours';
    if (totalLen === 7) return '~days';
    if (totalLen === 8) return '~weeks+';
    return 'Extremely long';
  };

  const getDifficultyColor = (prefixLen: number, suffixLen: number): string => {
    const totalLen = prefixLen + suffixLen;
    if (totalLen <= 2) return 'text-solana-green';
    if (totalLen === 3) return 'text-yellow-400';
    if (totalLen === 4) return 'text-orange-400';
    return 'text-red-400';
  };

  const activePrefixLen = (mode === 'prefix' || mode === 'both') ? prefix.length : 0;
  const activeSuffixLen = (mode === 'suffix' || mode === 'both') ? suffix.length : 0;
  const totalActiveLen = activePrefixLen + activeSuffixLen;

  return (
    <div className="flex-1 flex flex-col justify-center py-6">
      {/* Main Card */}
      <div className="card p-6">
        {/* Input Section */}
        {(status === 'idle' || status === 'stopped') && (
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Generate Vanity Address</h2>
                <p className="text-sm text-gray-500">
                  Create a Solana address starting or ending with your chosen letters
                </p>
              </div>
              {/* Security badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-solana-green/10 border border-solana-green/20 flex-shrink-0 ml-4">
                <svg className="w-4 h-4 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-xs text-solana-green font-medium">Client-Side</span>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4">
              {(['prefix', 'suffix', 'both'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
                    mode === m
                      ? 'bg-solana-purple/20 text-solana-purple border border-solana-purple/30'
                      : 'bg-[#16161a] text-gray-400 border border-[#222228] hover:border-gray-600'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            {/* Input Fields — side by side in "both" mode */}
            {mode === 'both' ? (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">Prefix (1-4)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={prefix}
                    onChange={e => setPrefix(e.target.value)}
                    placeholder="e.g. SOL"
                    className="w-full bg-[#16161a] border border-[#222228] rounded-xl px-4 py-3 text-white
                               placeholder-gray-600 focus:border-solana-purple/50 focus:outline-none transition-colors
                               font-mono text-lg"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">Suffix (1-4)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={suffix}
                    onChange={e => setSuffix(e.target.value)}
                    placeholder="e.g. deq"
                    className="w-full bg-[#16161a] border border-[#222228] rounded-xl px-4 py-3 text-white
                               placeholder-gray-600 focus:border-solana-purple/50 focus:outline-none transition-colors
                               font-mono text-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">
                  {mode === 'prefix' ? 'Prefix' : 'Suffix'} (1-4 chars)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={mode === 'prefix' ? prefix : suffix}
                  onChange={e => mode === 'prefix' ? setPrefix(e.target.value) : setSuffix(e.target.value)}
                  placeholder={mode === 'prefix' ? 'e.g. SOL' : 'e.g. deq'}
                  className="w-full bg-[#16161a] border border-[#222228] rounded-xl px-4 py-3 text-white
                             placeholder-gray-600 focus:border-solana-purple/50 focus:outline-none transition-colors
                             font-mono text-lg"
                />
              </div>
            )}

            {/* Case Sensitive Toggle + Difficulty — same row */}
            <div className="flex items-center justify-between mb-5">
              <button
                type="button"
                onClick={() => setCaseSensitive(prev => !prev)}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <div className={`w-10 h-5 rounded-full transition-colors relative ${
                  caseSensitive ? 'bg-solana-purple' : 'bg-[#333]'
                }`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-[2px] transition-transform ${
                    caseSensitive ? 'translate-x-[22px]' : 'translate-x-[2px]'
                  }`} />
                </div>
                <span className="text-sm text-gray-400 group-hover:text-gray-300">Case sensitive</span>
              </button>

              {totalActiveLen > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-gray-500">Est:</span>
                  <span className={`font-medium ${getDifficultyColor(activePrefixLen, activeSuffixLen)}`}>
                    {getDifficultyEstimate(activePrefixLen, activeSuffixLen)}
                  </span>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Generate Button */}
            <button onClick={handleStart} className="w-full btn-primary py-3.5 text-base font-semibold">
              {status === 'stopped' ? 'Try Again' : 'Generate'}
            </button>

            {/* Base58 note */}
            <p className="text-xs text-gray-600 mt-3 text-center">
              Base58 only: A-Z, a-z, 1-9 (no 0, O, I, l)
            </p>
          </>
        )}

        {/* Searching State */}
        {status === 'searching' && (
          <div className="text-center py-8">
            {/* Spinner */}
            <div className="w-16 h-16 mx-auto mb-6 relative">
              <div className="absolute inset-0 rounded-full border-4 border-solana-purple/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-solana-purple animate-spin"></div>
            </div>

            <p className="text-gray-400 text-base mb-1">
              Searching for {(mode === 'prefix' || mode === 'both') && prefix && `prefix "${prefix}"`}
              {mode === 'both' && prefix && suffix && ' + '}
              {(mode === 'suffix' || mode === 'both') && suffix && `suffix "${suffix}"`}...
            </p>
            <p className="text-xs text-gray-600 mb-6">
              {Math.max(1, (navigator.hardwareConcurrency || 4) - 1)} threads &middot; Rust WASM &middot; fully offline
            </p>

            {/* Live Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="stat-card !p-4">
                <p className="text-xs text-gray-500 uppercase mb-1">Attempts</p>
                <p className="text-lg font-bold text-white font-mono">{attempts.toLocaleString()}</p>
              </div>
              <div className="stat-card !p-4">
                <p className="text-xs text-gray-500 uppercase mb-1">Rate</p>
                <p className="text-lg font-bold text-solana-green font-mono">{rate.toLocaleString()}/s</p>
              </div>
              <div className="stat-card !p-4">
                <p className="text-xs text-gray-500 uppercase mb-1">Elapsed</p>
                <p className="text-lg font-bold text-white font-mono">{(elapsed / 1000).toFixed(1)}s</p>
              </div>
            </div>

            {/* Stop Button */}
            <button
              onClick={handleStop}
              className="px-10 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
            >
              Stop
            </button>
          </div>
        )}

        {/* Found State */}
        {status === 'found' && result && (
          <VanityResult
            address={result.address}
            secretKey={result.secretKey}
            totalAttempts={result.totalAttempts}
            elapsedMs={result.elapsedMs}
            prefix={(mode === 'prefix' || mode === 'both') ? prefix : undefined}
            suffix={(mode === 'suffix' || mode === 'both') ? suffix : undefined}
            onReset={handleReset}
          />
        )}
      </div>

      {/* Trust + Info Section — below main card */}
      {(status === 'idle' || status === 'stopped') && (
        <>
          {/* Trust badges row */}
          <div className="flex flex-wrap justify-center gap-2.5 mt-5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111113] border border-[#222228] text-xs text-gray-400">
              <svg className="w-3.5 h-3.5 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              No server contact
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111113] border border-[#222228] text-xs text-gray-400">
              <svg className="w-3.5 h-3.5 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Keys never leave your device
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111113] border border-[#222228] text-xs text-gray-400">
              <svg className="w-3.5 h-3.5 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Open source
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111113] border border-[#222228] text-xs text-gray-400">
              <svg className="w-3.5 h-3.5 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414 1 1 0 01-1.414-1.414z" />
              </svg>
              Works offline
            </div>
          </div>

          {/* How it works cards */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="card card-hover p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center mx-auto mb-2.5 text-solana-purple">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm mb-0.5 text-white">Enter Pattern</h3>
              <p className="text-gray-500 text-xs">Choose 1-4 letters</p>
            </div>
            <div className="card card-hover p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center mx-auto mb-2.5 text-solana-purple">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm mb-0.5 text-white">Generate</h3>
              <p className="text-gray-500 text-xs">Parallel Rust WASM</p>
            </div>
            <div className="card card-hover p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center mx-auto mb-2.5 text-solana-purple">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm mb-0.5 text-white">Download</h3>
              <p className="text-gray-500 text-xs">Solana CLI format</p>
            </div>
          </div>

          {/* Safety explainer */}
          <div className="mt-4 px-1">
            <p className="text-xs text-gray-600 text-center leading-relaxed">
              All keypairs are generated in your browser using compiled Rust (WebAssembly). Zero network requests are made during generation &mdash;
              you can disconnect your WiFi after the page loads to verify. Source code is fully open source and auditable.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
