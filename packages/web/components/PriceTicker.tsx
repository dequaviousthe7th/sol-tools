'use client';

import { FC, useState, useEffect, useCallback, createContext, useContext } from 'react';

interface PriceData {
  usd: number;
  usd_24h_change: number;
}

interface Prices {
  solana: PriceData;
  bitcoin: PriceData;
}

const PriceContext = createContext<Prices | null>(null);

function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${(price / 1000).toFixed(1)}K`;
  }
  return `$${price.toFixed(2)}`;
}

function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

export const PriceProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prices, setPrices] = useState<Prices | null>(null);

  const fetchPrices = useCallback(() => {
    fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin&vs_currencies=usd&include_24hr_change=true'
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.solana && data?.bitcoin) {
          setPrices(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPrices();
    const id = setInterval(fetchPrices, 15_000);
    return () => clearInterval(id);
  }, [fetchPrices]);

  return (
    <PriceContext.Provider value={prices}>
      {children}
    </PriceContext.Provider>
  );
};

export const BtcPrice: FC = () => {
  const prices = useContext(PriceContext);
  if (!prices) return <span className="text-gray-600 text-xs">--</span>;

  const change = prices.bitcoin.usd_24h_change;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#F7931A" />
        <text x="10" y="14.5" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="sans-serif">B</text>
      </svg>
      <span className="text-white font-medium">{formatPrice(prices.bitcoin.usd)}</span>
      <span className={change >= 0 ? 'text-solana-green' : 'text-red-400'}>
        {formatChange(change)}
      </span>
    </div>
  );
};

export const SolPrice: FC = () => {
  const prices = useContext(PriceContext);
  if (!prices) return <span className="text-gray-600 text-xs">--</span>;

  const change = prices.solana.usd_24h_change;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#9945FF" />
        <text x="10" y="14.5" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">S</text>
      </svg>
      <span className="text-white font-medium">{formatPrice(prices.solana.usd)}</span>
      <span className={change >= 0 ? 'text-solana-green' : 'text-red-400'}>
        {formatChange(change)}
      </span>
    </div>
  );
};
