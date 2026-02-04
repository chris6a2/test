/**
 * Articles API Routes
 *
 * GET /api/articles - List all articles
 * POST /api/articles - Create a new article
 */

import { NextRequest, NextResponse } from 'next/server';
import { getArticles, createArticle } from '@/lib/db';
import { ArticleInsert } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const articles = getArticles(status);

    return NextResponse.json({
      success: true,
      data: articles,
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch articles',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ArticleInsert = await request.json();

    // Validate required fields
    if (!body.title || !body.content || !body.type || !body.category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: title, content, type, category',
        },
        { status: 400 }
      );
    }

    // Validate type
    if (!['news', 'evergreen'].includes(body.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid article type. Must be "news" or "evergreen"',
        },
        { status: 400 }
      );
    }

    const article = createArticle(body);

    return NextResponse.json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error('Error creating article:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create article',
      },
      { status: 500 }
    );
  }
}
