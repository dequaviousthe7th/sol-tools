'use client';

import { FC, useState, useEffect, useCallback, createContext, useContext } from 'react';

interface PriceData {
  usd: number;
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

export const PriceProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prices, setPrices] = useState<Prices | null>(null);

  const fetchPrices = useCallback(() => {
    fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin&vs_currencies=usd'
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

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill="#F7931A" />
        <path d="M22.5 14.2c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.7 2.7c-.4-.1-.9-.2-1.3-.3l.7-2.7-1.7-.4-.6 2.7c-.3-.1-.7-.2-1-.2l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .2.1h-.2l-1.1 4.5c-.1.2-.3.5-.7.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.7 1.7.4.7-2.7c.4.1.9.2 1.3.3l-.7 2.7 1.7.4.7-2.7c2.8.5 4.8.3 5.7-2.2.7-2-.1-3.2-1.5-3.9 1.1-.3 1.9-1 2.1-2.5zm-3.7 5.2c-.5 2-3.9.9-5 .7l.9-3.6c1.1.3 4.7.8 4.1 2.9zm.5-5.3c-.5 1.8-3.3.9-4.2.7l.8-3.2c.9.2 3.9.7 3.4 2.5z" fill="white" />
      </svg>
      <span className="text-white font-medium">{formatPrice(prices.bitcoin.usd)}</span>
    </div>
  );
};

export const SolPrice: FC = () => {
  const prices = useContext(PriceContext);
  if (!prices) return <span className="text-gray-600 text-xs">--</span>;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill="#9945FF" />
        <path d="M9.5 20.2c.1-.1.3-.2.5-.2h12.8c.3 0 .4.3.2.5l-2.2 2.2c-.1.1-.3.2-.5.2H7.5c-.3 0-.4-.3-.2-.5l2.2-2.2zm0-8.4c.1-.1.3-.2.5-.2h12.8c.3 0 .4.3.2.5l-2.2 2.2c-.1.1-.3.2-.5.2H7.5c-.3 0-.4-.3-.2-.5l2.2-2.2zm13.3 4c-.1-.1-.3-.2-.5-.2H9.5c-.3 0-.4.3-.2.5l2.2 2.2c.1.1.3.2.5.2h12.8c.3 0 .4-.3.2-.5l-2.2-2.2z" fill="white" />
      </svg>
      <span className="text-white font-medium">{formatPrice(prices.solana.usd)}</span>
    </div>
  );
};

export const MobilePriceBar: FC = () => {
  const prices = useContext(PriceContext);
  if (!prices) return null;

  return (
    <div className="xl:hidden flex items-center justify-center gap-5 text-xs">
      <BtcPrice />
      <SolPrice />
    </div>
  );
};
