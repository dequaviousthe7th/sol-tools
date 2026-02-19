import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'xray-saved-wallets';
const MAX_WALLETS = 50;
const REFRESH_INTERVAL = 60_000;
const DEBOUNCE_MS = 300;

const DEFAULT_EMOJIS = ['🤖', '💜', '🦊', '🐙', '💎', '🔥', '⚡', '🎯', '🐺', '🦈'];

export interface SavedWallet {
  address: string;
  name: string;
  emoji: string;
  addedAt: number;
}

export interface SavedWalletWithLive extends SavedWallet {
  balanceSol: number | null;
  lastActive: number | null;
}

export interface UseSavedWalletsReturn {
  wallets: SavedWalletWithLive[];
  loading: boolean;
  addWallet: (address: string, name?: string, emoji?: string) => boolean;
  removeWallet: (address: string) => void;
  removeAll: () => void;
  updateName: (address: string, name: string) => void;
  updateEmoji: (address: string, emoji: string) => void;
  hasWallet: (address: string) => boolean;
  refresh: () => void;
  importWallets: (data: string) => { added: number; skipped: number; errors: number };
  exportWallets: () => string;
}

const isValidBase58 = (str: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(str);

function readStorage(): SavedWallet[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeStorage(wallets: SavedWallet[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
}

export function useSavedWallets(): UseSavedWalletsReturn {
  const [stored, setStored] = useState<SavedWallet[]>([]);
  const [liveData, setLiveData] = useState<Record<string, { balanceSol: number; lastActiveTs: number | null }>>({});
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Load from localStorage on mount (SSR-safe)
  useEffect(() => {
    setStored(readStorage());
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Cross-tab sync
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setStored(readStorage());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Fetch live data from worker
  const fetchLiveData = useCallback(async (wallets: SavedWallet[]) => {
    if (wallets.length === 0) {
      setLiveData({});
      return;
    }

    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
    if (!workerUrl) return;

    setLoading(true);
    try {
      const addresses = wallets.map(w => w.address).join(',');
      const res = await fetch(`${workerUrl}/api/wallet-batch-info?wallets=${addresses}`);
      if (res.ok) {
        const data = await res.json() as Record<string, { balanceSol: number; lastActiveTs: number | null }>;
        if (mountedRef.current) setLiveData(data);
      }
    } catch {
      // Silently fail — live data is optional
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Debounced fetch on wallet list changes
  useEffect(() => {
    if (stored.length === 0) {
      setLiveData({});
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchLiveData(stored);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [stored, fetchLiveData]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (stored.length === 0) return;

    intervalRef.current = setInterval(() => {
      fetchLiveData(stored);
    }, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [stored, fetchLiveData]);

  // Merge stored + live data
  const wallets: SavedWalletWithLive[] = stored.map(w => ({
    ...w,
    balanceSol: liveData[w.address]?.balanceSol ?? null,
    lastActive: liveData[w.address]?.lastActiveTs ?? null,
  }));

  const addWallet = useCallback((address: string, name?: string, emoji?: string): boolean => {
    const current = readStorage();
    if (current.length >= MAX_WALLETS) return false;
    if (current.some(w => w.address === address)) return false;
    if (!isValidBase58(address)) return false;

    const defaultEmoji = DEFAULT_EMOJIS[current.length % DEFAULT_EMOJIS.length];
    const newWallet: SavedWallet = {
      address,
      name: name || `Wallet ${current.length + 1}`,
      emoji: emoji || defaultEmoji,
      addedAt: Date.now(),
    };

    const updated = [...current, newWallet];
    writeStorage(updated);
    setStored(updated);
    return true;
  }, []);

  const removeWallet = useCallback((address: string) => {
    const current = readStorage();
    const updated = current.filter(w => w.address !== address);
    writeStorage(updated);
    setStored(updated);
  }, []);

  const removeAll = useCallback(() => {
    writeStorage([]);
    setStored([]);
    setLiveData({});
  }, []);

  const updateName = useCallback((address: string, name: string) => {
    const current = readStorage();
    const updated = current.map(w => w.address === address ? { ...w, name } : w);
    writeStorage(updated);
    setStored(updated);
  }, []);

  const updateEmoji = useCallback((address: string, emoji: string) => {
    const current = readStorage();
    const updated = current.map(w => w.address === address ? { ...w, emoji } : w);
    writeStorage(updated);
    setStored(updated);
  }, []);

  const hasWallet = useCallback((address: string): boolean => {
    return readStorage().some(w => w.address === address);
  }, []);

  const refresh = useCallback(() => {
    fetchLiveData(readStorage());
  }, [fetchLiveData]);

  const importWallets = useCallback((data: string): { added: number; skipped: number; errors: number } => {
    const result = { added: 0, skipped: 0, errors: 0 };
    const current = readStorage();
    const existingAddresses = new Set(current.map(w => w.address));

    let entries: Array<{ address: string; name?: string; emoji?: string }> = [];

    try {
      const parsed = JSON.parse(data);

      if (parsed?.version === 1 && Array.isArray(parsed?.wallets)) {
        // SolTools native format
        entries = parsed.wallets.map((w: { address?: string; name?: string; emoji?: string }) => ({
          address: w.address || '',
          name: w.name,
          emoji: w.emoji,
        }));
      } else if (Array.isArray(parsed?.wallets)) {
        // Axiom-like format: { wallets: [{ address, label }] }
        entries = parsed.wallets.map((w: { address?: string; label?: string }) => ({
          address: w.address || '',
          name: w.label,
        }));
      } else if (Array.isArray(parsed)) {
        // Plain JSON array of addresses
        entries = parsed.map((item: string | { address?: string }) => ({
          address: typeof item === 'string' ? item : (item.address || ''),
        }));
      }
    } catch {
      // Not JSON — try newline-separated addresses
      entries = data.split(/[\n\r]+/).map(line => line.trim()).filter(Boolean).map(addr => ({ address: addr }));
    }

    const toAdd: SavedWallet[] = [];

    for (const entry of entries) {
      if (current.length + toAdd.length >= MAX_WALLETS) break;

      if (!isValidBase58(entry.address)) {
        result.errors++;
        continue;
      }

      if (existingAddresses.has(entry.address)) {
        result.skipped++;
        continue;
      }

      existingAddresses.add(entry.address);
      const idx = current.length + toAdd.length;
      toAdd.push({
        address: entry.address,
        name: entry.name || `Wallet ${idx + 1}`,
        emoji: entry.emoji || DEFAULT_EMOJIS[idx % DEFAULT_EMOJIS.length],
        addedAt: Date.now(),
      });
      result.added++;
    }

    if (toAdd.length > 0) {
      const updated = [...current, ...toAdd];
      writeStorage(updated);
      setStored(updated);
    }

    return result;
  }, []);

  const exportWallets = useCallback((): string => {
    const current = readStorage();
    return JSON.stringify({
      version: 1,
      source: 'soltools-xray',
      wallets: current.map(w => ({
        address: w.address,
        name: w.name,
        emoji: w.emoji,
      })),
    }, null, 2);
  }, []);

  return {
    wallets,
    loading,
    addWallet,
    removeWallet,
    removeAll,
    updateName,
    updateEmoji,
    hasWallet,
    refresh,
    importWallets,
    exportWallets,
  };
}
