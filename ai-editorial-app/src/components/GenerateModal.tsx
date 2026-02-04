'use client';

import { useState } from 'react';
import { X, Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getSettings, createArticle } from '@/lib/storage';
import { generateArticles } from '@/lib/ai-client';

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function GenerateModal({ isOpen, onClose, onSuccess }: GenerateModalProps) {
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    setProgress('Loading settings...');

    try {
      // Get settings
      const settings = await getSettings();

      if (!settings.api_key) {
        throw new Error('API key is not configured. Please add it in Settings.');
      }

      setProgress('Generating articles with AI... This may take a minute.');

      // Generate articles
      const articles = await generateArticles(
        settings.api_key,
        settings.model,
        topic || undefined
      );

      setProgress('Saving articles...');

      // Save each article
      const createdArticles = [];
      for (const article of articles) {
        const created = await createArticle(article);
        createdArticles.push(created);
      }

      setSuccess(`Successfully created ${createdArticles.length} articles!`);
      setTopic('');

      // Notify parent after short delay
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(null);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate articles');
    } finally {
      setIsGenerating(false);
      setProgress('');
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setError(null);
      setSuccess(null);
      setTopic('');
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
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-slate-900">
            Generate Articles
          </h2>
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-600 mb-4">
            The AI will generate two articles:
          </p>

          <ul className="mb-6 space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full" />
              <strong>News Article</strong> - Timely, current events focused
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <strong>Evergreen Article</strong> - Timeless, always-relevant content
            </li>
          </ul>

          {/* Topic Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Topic Focus (optional)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., artificial intelligence, climate change..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isGenerating}
            />
            <p className="mt-2 text-xs text-slate-500">
              Leave blank to let the AI choose relevant topics
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Progress */}
          {isGenerating && progress && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">{progress}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-slate-50 rounded-b-xl">
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn btn-primary"
          >
            {isGenerating ? (
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
      </div>
    </div>
  );
}
