/**
 * Core type definitions for the AI Editorial App
 */

export type ArticleStatus = 'draft' | 'published' | 'archived';
export type ArticleType = 'news' | 'evergreen';

export interface Article {
  id: number;
  type: ArticleType;
  title: string;
  subheading: string | null;
  content: string;
  category: string;
  tags: string[];
  sources: ArticleSource[];
  status: ArticleStatus;
  created_at: string;
  updated_at: string;
}

export interface ArticleSource {
  title: string;
  url?: string;
  description?: string;
}

export interface ArticleInsert {
  type: ArticleType;
  title: string;
  subheading?: string;
  content: string;
  category: string;
  tags?: string[];
  sources?: ArticleSource[];
  status?: ArticleStatus;
}

export interface ArticleUpdate {
  title?: string;
  subheading?: string;
  content?: string;
  category?: string;
  tags?: string[];
  sources?: ArticleSource[];
  status?: ArticleStatus;
}

export interface Settings {
  api_key: string;
  model: string;
}

export interface GenerateRequest {
  topic?: string;
}

export interface GenerateResponse {
  success: boolean;
  articles?: Article[];
  error?: string;
}

export interface AIArticleResponse {
  articles: {
    type: ArticleType;
    title: string;
    subheading?: string;
    content: string;
    category: string;
    tags?: string[];
    sources?: ArticleSource[];
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
