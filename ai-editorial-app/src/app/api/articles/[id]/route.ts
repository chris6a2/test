/**
 * Single Article API Routes
 *
 * GET /api/articles/[id] - Get single article
 * PUT /api/articles/[id] - Update article
 * DELETE /api/articles/[id] - Delete article
 */

import { NextRequest, NextResponse } from 'next/server';
import { getArticle, updateArticle, deleteArticle } from '@/lib/db';
import { ArticleUpdate } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const articleId = parseInt(id, 10);

    if (isNaN(articleId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid article ID' },
        { status: 400 }
      );
    }

    const article = getArticle(articleId);

    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch article',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const articleId = parseInt(id, 10);

    if (isNaN(articleId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid article ID' },
        { status: 400 }
      );
    }

    const body: ArticleUpdate = await request.json();
    const article = updateArticle(articleId, body);

    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error('Error updating article:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update article',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const articleId = parseInt(id, 10);

    if (isNaN(articleId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid article ID' },
        { status: 400 }
      );
    }

    const deleted = deleteArticle(articleId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: articleId },
    });
  } catch (error) {
    console.error('Error deleting article:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete article',
      },
      { status: 500 }
    );
  }
}
