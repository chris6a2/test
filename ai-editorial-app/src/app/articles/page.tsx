'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Filter } from 'lucide-react';
import { Article } from '@/types';
import { ArticleCard } from '@/components/ArticleCard';
import { GenerateModal } from '@/components/GenerateModal';

type FilterStatus = 'all' | 'draft' | 'published' | 'archived';
type FilterType = 'all' | 'news' | 'evergreen';

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/articles');
      const data = await response.json();
      if (data.success) {
        setArticles(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  // Filter articles
  const filteredArticles = articles.filter((article) => {
    if (statusFilter !== 'all' && article.status !== statusFilter) {
      return false;
    }
    if (typeFilter !== 'all' && article.type !== typeFilter) {
      return false;
    }
    return true;
  });

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Articles</h1>
          <p className="text-slate-600 mt-1">
            Manage your AI-generated articles
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Articles
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="h-4 w-4" />
            Filters:
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as FilterType)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
            >
              <option value="all">All</option>
              <option value="news">News</option>
              <option value="evergreen">Evergreen</option>
            </select>
          </div>

          <div className="ml-auto text-sm text-slate-500">
            {filteredArticles.length} article
            {filteredArticles.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      {filteredArticles.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-600">
            {articles.length === 0
              ? 'No articles yet. Generate your first articles!'
              : 'No articles match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {/* Generate Modal */}
      <GenerateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchArticles}
      />
    </div>
  );
}
