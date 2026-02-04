'use client';

import { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function GenerateModal({ isOpen, onClose, onSuccess }: GenerateModalProps) {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() || undefined }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate articles');
      }

      setTopic('');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setTopic('');
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-slate-900">
            Generate Articles
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4">
            <p className="text-sm text-slate-600 mb-4">
              The AI will generate two articles: one News article and one
              Evergreen article. They will be saved as drafts for your review.
            </p>

            <label className="block text-sm font-medium text-slate-700 mb-2">
              Topic Focus (optional)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isLoading}
              placeholder="e.g., artificial intelligence, climate change..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100"
            />
            <p className="mt-2 text-xs text-slate-500">
              Leave blank to let the AI choose relevant topics.
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50 rounded-b-xl">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
