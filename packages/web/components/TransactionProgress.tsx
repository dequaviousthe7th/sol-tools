'use client';

import { FC } from 'react';

interface TransactionProgressProps {
  current: number;
  total: number;
}

export const TransactionProgress: FC<TransactionProgressProps> = ({ current, total }) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="text-center py-12">
      {/* Circular Progress */}
      <div className="w-28 h-28 relative mx-auto mb-8">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="#1a1a1f"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 2.64} 264`}
            className="transition-all duration-500 ease-out"
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9945FF" />
              <stop offset="100%" stopColor="#14F195" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-white">{percentage}%</span>
        </div>
      </div>

      {/* Status text */}
      <p className="text-lg font-medium text-white mb-2">
        Processing Transaction {current} of {total}
      </p>
      <p className="text-gray-400 text-sm mb-8">
        Please approve the transaction in your wallet
      </p>

      {/* Batch indicators */}
      {total <= 12 ? (
        <div className="flex justify-center gap-2 flex-wrap max-w-[280px] sm:max-w-xs mx-auto">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                i < current
                  ? 'bg-solana-green'
                  : i === current
                  ? 'bg-solana-purple animate-pulse scale-125'
                  : 'bg-[#222228]'
              }`}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Batch {current} of {total}
        </p>
      )}
    </div>
  );
};
