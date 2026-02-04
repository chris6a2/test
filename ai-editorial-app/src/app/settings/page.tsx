'use client';

import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Smartphone } from 'lucide-react';
import { getSettings, updateSettings, isClientSide } from '@/lib/storage';

interface SettingsData {
  api_key: string;
  model: string;
  has_api_key: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('claude-sonnet-4-20250514');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    if (!isClientSide()) return;

    try {
      const data = await getSettings();
      const maskedKey = data.api_key
        ? `${'*'.repeat(Math.max(0, data.api_key.length - 4))}${data.api_key.slice(-4)}`
        : '';

      setSettings({
        api_key: maskedKey,
        model: data.model,
        has_api_key: !!data.api_key,
      });
      setModel(data.model);
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updates: { api_key?: string; model: string } = { model };

      // Only include API key if user entered a new one
      if (apiKey.trim()) {
        updates.api_key = apiKey.trim();
      }

      await updateSettings(updates);

      // Refresh settings display
      const data = await getSettings();
      const maskedKey = data.api_key
        ? `${'*'.repeat(Math.max(0, data.api_key.length - 4))}${data.api_key.slice(-4)}`
        : '';

      setSettings({
        api_key: maskedKey,
        model: data.model,
        has_api_key: !!data.api_key,
      });

      setApiKey(''); // Clear the input
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInstallPWA = () => {
    // Check if deferredPrompt is available (set by beforeinstallprompt event)
    const deferredPrompt = (window as unknown as { deferredPrompt?: { prompt: () => void } }).deferredPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
    } else {
      alert('To install: tap the Share button in your browser, then "Add to Home Screen"');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">
          Configure your AI Editorial Agent
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave}>
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">
            API Configuration
          </h2>

          {/* API Key */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Claude API Key
            </label>

            {settings?.has_api_key && (
              <div className="mb-2 text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                API key is configured ({settings.api_key})
              </div>
            )}

            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  settings?.has_api_key
                    ? 'Enter new key to replace existing'
                    : 'sk-ant-api...'
                }
                className="w-full px-4 py-2 pr-12 border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showApiKey ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Get your API key from{' '}
              <a
                href="https://console.anthropic.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                console.anthropic.com
              </a>
            </p>
          </div>

          {/* Model Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
            >
              <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (Recommended)</option>
              <option value="claude-opus-4-20250514">Claude Opus 4</option>
              <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
              <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Faster)</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Select the Claude model to use for article generation
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Install as App */}
      <div className="card p-6 mt-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Smartphone className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Install as App
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Add AI Editorial to your home screen for quick access. On iOS, tap
              the Share button and select &quot;Add to Home Screen&quot;.
            </p>
            <button
              onClick={handleInstallPWA}
              className="btn btn-secondary text-sm"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Install App
            </button>
          </div>
        </div>
      </div>

      {/* Data Storage Info */}
      <div className="card p-6 mt-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Data Storage
        </h2>
        <p className="text-sm text-slate-600 mb-3">
          All data is stored locally on this device using your browser&apos;s
          IndexedDB. Your data stays on your device and is never sent to any
          server (except your API key is sent to Claude when generating articles).
        </p>
        <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
          <li>Articles are stored locally</li>
          <li>Settings are stored locally</li>
          <li>Data persists between sessions</li>
          <li>Clearing browser data will delete your articles</li>
        </ul>
      </div>

      {/* About the Editorial Prompt */}
      <div className="card p-6 mt-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          About the Editorial Prompt
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          The AI uses a carefully crafted editorial prompt that instructs it to:
        </p>
        <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
          <li>Research topics thoroughly before writing</li>
          <li>Write in a professional journalistic style</li>
          <li>Fact-check all claims and statistics</li>
          <li>Edit for publication-quality content</li>
          <li>Generate both News and Evergreen articles</li>
        </ul>
      </div>
    </div>
  );
}
