'use client';

import { FC } from 'react';
import { TokenAccountInfo, formatSol } from '@solreclaimer/core';

interface AccountListProps {
  accounts: TokenAccountInfo[];
  selectedAccounts: Set<string>;
  onToggle: (pubkey: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const AccountList: FC<AccountListProps> = ({
  accounts,
  selectedAccounts,
  onToggle,
  onSelectAll,
  onDeselectAll,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-gray-400">
          <span className="text-white font-medium">{selectedAccounts.size}</span> of {accounts.length} selected
        </span>
        <div className="flex gap-3">
          <button
            onClick={onSelectAll}
            className="text-sm text-solana-purple hover:text-solana-green transition-colors font-medium"
          >
            Select All
          </button>
          <button
            onClick={onDeselectAll}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="bg-[#0d0d0f] border border-[#222228] rounded-xl overflow-hidden">
        <div className="max-h-[280px] sm:max-h-[400px] overflow-y-auto">
          {accounts.map((account, index) => {
            const pubkey = account.pubkey.toBase58();
            const isSelected = selectedAccounts.has(pubkey);

            return (
              <div
                key={pubkey}
                onClick={() => onToggle(pubkey)}
                className={`flex items-center justify-between p-4 cursor-pointer transition-all duration-150 ${
                  index !== accounts.length - 1 ? 'border-b border-[#1a1a1f]' : ''
                } ${
                  isSelected
                    ? 'bg-solana-purple/10 hover:bg-solana-purple/15'
                    : 'hover:bg-[#111113]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
                      isSelected
                        ? 'bg-gradient-to-br from-solana-purple to-solana-green border-transparent'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-mono text-sm text-white">
                      {pubkey.slice(0, 6)}...{pubkey.slice(-6)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Mint: {account.mint.toBase58().slice(0, 8)}...
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${isSelected ? 'text-solana-green' : 'text-gray-300'}`}>
                    {formatSol(account.rentLamports)}
                  </p>
                  <p className="text-xs text-gray-500">SOL</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Click to select/deselect accounts
      </p>
    </div>
  );
};
