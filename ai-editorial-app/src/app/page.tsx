'use client';

import { useState, useEffect } from 'react';
import { Sparkles, FileText, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Article } from '@/types';
import { ArticleCard } from '@/components/ArticleCard';
import { GenerateModal } from '@/components/GenerateModal';
import { getArticles, getSettings, isClientSide } from '@/lib/storage';

export default function DashboardPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  const fetchData = async () => {
    if (!isClientSide()) return;

    try {
      const [articlesData, settingsData] = await Promise.all([
        getArticles(),
        getSettings(),
      ]);

      setArticles(articlesData);
      setHasApiKey(!!settingsData.api_key);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateSuccess = () => {
    fetchData();
  };

  // Calculate stats
  const stats = {
    total: articles.length,
    drafts: articles.filter((a) => a.status === 'draft').length,
    news: articles.filter((a) => a.type === 'news').length,
    evergreen: articles.filter((a) => a.type === 'evergreen').length,
  };

  const recentArticles = articles.slice(0, 6);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Generate and manage your AI-written articles
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={!hasApiKey}
          className="btn btn-primary"
          title={!hasApiKey ? 'Configure API key in Settings first' : ''}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Articles
        </button>
      </div>

      {/* API Key Warning */}
      {!hasApiKey && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              API Key Required
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Please configure your Claude API key in{' '}
              <a href="/settings" className="underline font-medium">
                Settings
              </a>{' '}
              to start generating articles.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-sm text-slate-500">Total Articles</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.drafts}</p>
              <p className="text-sm text-slate-500">Drafts</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.news}</p>
              <p className="text-sm text-slate-500">News Articles</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {stats.evergreen}
              </p>
              <p className="text-sm text-slate-500">Evergreen Articles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Articles */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Articles
          </h2>
          {articles.length > 6 && (
            <a
              href="/articles"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all
            </a>
          )}
        </div>

        {recentArticles.length === 0 ? (
          <div className="card p-12 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No articles yet
            </h3>
            <p className="text-slate-600 mb-4">
              Generate your first articles using AI
            </p>
            {hasApiKey && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Articles
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>

      {/* Generate Modal */}
      <GenerateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleGenerateSuccess}
      />
    </div>
  );
}
