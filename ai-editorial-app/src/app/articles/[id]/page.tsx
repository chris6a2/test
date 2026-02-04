'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Trash2,
  Download,
  ExternalLink,
  Clock,
  Tag,
  Newspaper,
  BookOpen,
  Loader2,
} from 'lucide-react';
import { Article, ArticleUpdate } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ArticleDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Editable fields
  const [title, setTitle] = useState('');
  const [subheading, setSubheading] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');

  useEffect(() => {
    fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    try {
      const response = await fetch(`/api/articles/${id}`);
      const data = await response.json();

      if (data.success) {
        setArticle(data.data);
        setTitle(data.data.title);
        setSubheading(data.data.subheading || '');
        setContent(data.data.content);
        setStatus(data.data.status);
      } else {
        setError(data.error || 'Article not found');
      }
    } catch (err) {
      setError('Failed to load article');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updates: ArticleUpdate = {
        title,
        subheading: subheading || undefined,
        content,
        status,
      };

      const response = await fetch(`/api/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (data.success) {
        setArticle(data.data);
        setSuccessMessage('Article saved successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save article');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this article? This cannot be undone.')) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        router.push('/articles');
      } else {
        throw new Error(data.error || 'Failed to delete');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete article');
      setIsDeleting(false);
    }
  };

  const handleExport = async (format: 'markdown' | 'html' | 'json') => {
    if (!article) return;

    let content = '';
    let filename = '';
    let mimeType = '';

    const slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);

    switch (format) {
      case 'markdown':
        content = formatAsMarkdown(article);
        filename = `${slug}.md`;
        mimeType = 'text/markdown';
        break;
      case 'html':
        content = formatAsHtml(article);
        filename = `${slug}.html`;
        mimeType = 'text/html';
        break;
      case 'json':
        content = JSON.stringify(article, null, 2);
        filename = `${slug}.json`;
        mimeType = 'application/json';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !article) {
    return (
      <div className="card p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={() => router.push('/articles')} className="btn btn-secondary">
          Back to Articles
        </button>
      </div>
    );
  }

  if (!article) return null;

  const TypeIcon = article.type === 'news' ? Newspaper : BookOpen;
  const formattedDate = new Date(article.created_at).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/articles')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Articles
        </button>

        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <div className="relative group">
            <button className="btn btn-secondary">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('markdown')}
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 rounded-t-lg"
              >
                Markdown (.md)
              </button>
              <button
                onClick={() => handleExport('html')}
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100"
              >
                HTML (.html)
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 rounded-b-lg"
              >
                JSON (.json)
              </button>
            </div>
          </div>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn btn-danger"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>

          <button
            onClick={handleSave}
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
                Save
              </>
            )}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* Article Meta */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600">
            <TypeIcon className="h-3 w-3" />
            {article.type === 'news' ? 'News' : 'Evergreen'}
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <Clock className="h-4 w-4" />
            {formattedDate}
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <Tag className="h-4 w-4" />
            {article.category}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <label className="text-slate-600">Status:</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="card p-6">
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-lg font-semibold"
              placeholder="Article title"
            />
          </div>

          {/* Subheading */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Subheading
            </label>
            <input
              type="text"
              value={subheading}
              onChange={(e) => setSubheading(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              placeholder="Optional subheading"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Content (HTML)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg font-mono text-sm"
              placeholder="Article content..."
            />
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Preview
            </label>
            <div
              className="prose max-w-none p-6 border border-slate-200 rounded-lg bg-slate-50"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>

          {/* Sources */}
          {article.sources.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sources
              </label>
              <ul className="space-y-2">
                {article.sources.map((source, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {source.title}
                      </a>
                    ) : (
                      <span>{source.title}</span>
                    )}
                    {source.description && (
                      <span className="text-slate-400">
                        - {source.description}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {article.tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions for export
function formatAsMarkdown(article: Article): string {
  // Strip HTML tags for markdown
  const stripHtml = (html: string) => {
    return html
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<ul[^>]*>|<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>|<\/ol>/gi, '\n')
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  let md = `# ${article.title}\n\n`;

  if (article.subheading) {
    md += `*${article.subheading}*\n\n`;
  }

  md += `**Category:** ${article.category} | **Type:** ${article.type} | **Status:** ${article.status}\n\n`;
  md += `---\n\n`;
  md += stripHtml(article.content);

  if (article.sources.length > 0) {
    md += `\n\n## Sources\n\n`;
    article.sources.forEach((source) => {
      if (source.url) {
        md += `- [${source.title}](${source.url})`;
      } else {
        md += `- ${source.title}`;
      }
      if (source.description) {
        md += ` - ${source.description}`;
      }
      md += '\n';
    });
  }

  if (article.tags.length > 0) {
    md += `\n**Tags:** ${article.tags.join(', ')}\n`;
  }

  return md;
}

function formatAsHtml(article: Article): string {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(article.title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
    h1 { margin-bottom: 0.5rem; }
    .subheading { color: #666; font-style: italic; margin-bottom: 1rem; }
    .meta { color: #888; font-size: 0.9rem; margin-bottom: 2rem; }
    .sources { margin-top: 2rem; border-top: 1px solid #eee; padding-top: 1rem; }
    .tags { margin-top: 1rem; }
    .tag { display: inline-block; background: #f0f0f0; padding: 0.25rem 0.5rem; border-radius: 0.25rem; margin-right: 0.5rem; font-size: 0.85rem; }
  </style>
</head>
<body>
  <article>
    <h1>${escapeHtml(article.title)}</h1>
`;

  if (article.subheading) {
    html += `    <p class="subheading">${escapeHtml(article.subheading)}</p>\n`;
  }

  html += `    <p class="meta">Category: ${escapeHtml(article.category)} | Type: ${article.type} | Status: ${article.status}</p>\n`;
  html += `    <div class="content">${article.content}</div>\n`;

  if (article.sources.length > 0) {
    html += `    <div class="sources">\n      <h3>Sources</h3>\n      <ul>\n`;
    article.sources.forEach((source) => {
      html += `        <li>`;
      if (source.url) {
        html += `<a href="${escapeHtml(source.url)}" target="_blank">${escapeHtml(source.title)}</a>`;
      } else {
        html += escapeHtml(source.title);
      }
      if (source.description) {
        html += ` - ${escapeHtml(source.description)}`;
      }
      html += `</li>\n`;
    });
    html += `      </ul>\n    </div>\n`;
  }

  if (article.tags.length > 0) {
    html += `    <div class="tags">\n`;
    article.tags.forEach((tag) => {
      html += `      <span class="tag">${escapeHtml(tag)}</span>\n`;
    });
    html += `    </div>\n`;
  }

  html += `  </article>
</body>
</html>`;

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
