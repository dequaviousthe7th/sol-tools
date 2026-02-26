'use client';

import { FC, useState, useEffect, useCallback } from 'react';

interface FeatureRequestModalProps {
  open: boolean;
  onClose: () => void;
}

export const FeatureRequestModal: FC<FeatureRequestModalProps> = ({ open, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  const handleSubmit = async () => {
    if (title.length < 3 || description.length < 10) {
      setError('Title (3+ chars) and description (10+ chars) are required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
      if (!workerUrl) throw new Error('Service unavailable');

      const res = await fetch(`${workerUrl}/api/feature-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          contact: contact.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || 'Failed to submit');
      }

      setSuccess(true);
      setTitle('');
      setDescription('');
      setContact('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    }

    setSubmitting(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60 backdrop-blur-sm modal-enter"
      onClick={onClose}
    >
      <div
        className="card p-6 sm:p-8 max-w-lg w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto scroll-fade modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-solana-purple/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white">Request a Feature</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-solana-green/20 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-semibold mb-1">Request Submitted!</p>
            <p className="text-sm text-gray-400">Thanks for the feedback. We review every suggestion.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-400 mb-4">
              Have an idea for a new tool or feature? Let us know and we&apos;ll consider building it.
            </p>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Title *</label>
              <input
                type="text"
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Portfolio tracker, Airdrop checker..."
                className="w-full bg-[#0a0a0b] border border-[#222228] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-solana-purple/50 focus:outline-none transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Description *</label>
              <textarea
                maxLength={500}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the tool or feature you'd like to see..."
                className="w-full bg-[#0a0a0b] border border-[#222228] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-solana-purple/50 focus:outline-none transition-colors resize-none"
              />
              <p className="text-xs text-gray-600 mt-1">{description.length}/500</p>
            </div>

            {/* Contact */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Contact</label>
              <input
                type="text"
                maxLength={100}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Twitter handle, email, or Discord..."
                className="w-full bg-[#0a0a0b] border border-[#222228] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-solana-purple/50 focus:outline-none transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || title.length < 3 || description.length < 10}
              className="w-full bg-gradient-to-r from-solana-purple to-solana-green text-white font-semibold py-3 rounded-xl transition-all duration-200 hover:opacity-90 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
