/**
 * Article Generation API Route
 *
 * POST /api/generate - Generate articles using AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateArticles } from '@/lib/ai';
import { createArticle } from '@/lib/db';
import { GenerateRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json().catch(() => ({}));
    const topic = body.topic?.trim() || undefined;

    console.log(`Generating articles${topic ? ` for topic: ${topic}` : ''}...`);

    // Generate articles using AI
    const articleInserts = await generateArticles(topic);

    // Save articles to database
    const savedArticles = articleInserts.map((articleData) => {
      return createArticle(articleData);
    });

    console.log(`Successfully generated ${savedArticles.length} articles`);

    return NextResponse.json({
      success: true,
      data: savedArticles,
    });
  } catch (error) {
    console.error('Error generating articles:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate articles',
      },
      { status: 500 }
    );
  }
}
