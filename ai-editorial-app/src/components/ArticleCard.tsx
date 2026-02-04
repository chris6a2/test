'use client';

import Link from 'next/link';
import { Clock, Tag, Newspaper, BookOpen } from 'lucide-react';
import { Article } from '@/types';

interface ArticleCardProps {
  article: Article;
}

export function ArticleCard({ article }: ArticleCardProps) {
  const formattedDate = new Date(article.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const TypeIcon = article.type === 'news' ? Newspaper : BookOpen;

  const statusColors = {
    draft: 'bg-amber-100 text-amber-800',
    published: 'bg-green-100 text-green-800',
    archived: 'bg-slate-100 text-slate-600',
  };

  return (
    <Link href={`/articles/${article.id}`}>
      <div className="card p-5 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Type and Status badges */}
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                <TypeIcon className="h-3 w-3" />
                {article.type === 'news' ? 'News' : 'Evergreen'}
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  statusColors[article.status]
                }`}
              >
                {article.status.charAt(0).toUpperCase() + article.status.slice(1)}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-slate-900 line-clamp-2 mb-1">
              {article.title}
            </h3>

            {/* Subheading */}
            {article.subheading && (
              <p className="text-slate-600 text-sm line-clamp-2 mb-3">
                {article.subheading}
              </p>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {article.category}
              </span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t">
            {article.tags.slice(0, 4).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded"
              >
                {tag}
              </span>
            ))}
            {article.tags.length > 4 && (
              <span className="px-2 py-0.5 text-slate-400 text-xs">
                +{article.tags.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
