/**
 * Client-Side AI Service
 *
 * Handles communication with the Claude API directly from the browser
 */

import { ArticleInsert } from '@/types';
import { EDITORIAL_SYSTEM_PROMPT } from './prompt';

const API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

interface ClaudeResponse {
  content: { type: string; text: string }[];
  error?: { message: string };
}

interface AIArticleResponse {
  articles?: Array<{
    type: string;
    title: string;
    subheading?: string;
    content: string;
    category: string;
    tags?: string[];
    sources?: Array<{ title: string; url?: string; description?: string }>;
  }>;
}

/**
 * Generate articles using the Claude API (client-side)
 */
export async function generateArticles(
  apiKey: string,
  model: string,
  topic?: string
): Promise<ArticleInsert[]> {
  if (!apiKey) {
    throw new Error('API key is not configured. Please add your Claude API key in Settings.');
  }

  // Build user message
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let userMessage = `Today's date is ${currentDate}. `;

  if (topic) {
    userMessage += `Please focus on the following topic: ${topic}. `;
  }

  userMessage += 'Generate the articles as specified in your instructions. Return the response as valid JSON only.';

  // Make API request
  const response = await callClaudeAPI(apiKey, model, userMessage);

  // Parse and validate response
  return parseAIResponse(response);
}

/**
 * Call the Claude API
 */
async function callClaudeAPI(
  apiKey: string,
  model: string,
  userMessage: string
): Promise<string> {
  const requestBody = {
    model,
    max_tokens: 8192,
    system: EDITORIAL_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  };

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = `API request failed with status ${response.status}`;

    try {
      const errorJson = JSON.parse(errorBody);
      if (errorJson.error?.message) {
        errorMessage = errorJson.error.message;
      }
    } catch {
      // Use default error message
    }

    // Provide helpful error messages for common issues
    switch (response.status) {
      case 401:
        throw new Error('Invalid API key. Please check your API key in Settings.');
      case 403:
        throw new Error('API key lacks required permissions.');
      case 429:
        throw new Error('Rate limit exceeded. Please try again in a few minutes.');
      case 500:
      case 503:
        throw new Error('Claude API is temporarily unavailable. Please try again later.');
      default:
        throw new Error(errorMessage);
    }
  }

  const data: ClaudeResponse = await response.json();

  if (!data.content?.[0]?.text) {
    throw new Error('Unexpected API response format');
  }

  return data.content[0].text;
}

/**
 * Parse AI response and extract articles
 */
function parseAIResponse(responseText: string): ArticleInsert[] {
  // Try to extract JSON from the response
  let jsonContent = responseText.trim();

  // Handle markdown code blocks
  const codeBlockMatch = jsonContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    jsonContent = codeBlockMatch[1].trim();
  }

  // Try to find JSON object or array
  if (!jsonContent.startsWith('{') && !jsonContent.startsWith('[')) {
    const jsonMatch = jsonContent.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    } else {
      throw new Error('Could not find valid JSON in AI response');
    }
  }

  // Parse JSON
  let parsed: AIArticleResponse;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (e) {
    throw new Error(`Failed to parse AI response as JSON: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }

  // Extract articles array
  const articles = parsed.articles || (Array.isArray(parsed) ? parsed : null);

  if (!articles || !Array.isArray(articles)) {
    throw new Error('AI response does not contain valid articles array');
  }

  // Validate and transform articles
  return articles.map((article, index) => {
    if (!article.title || !article.content) {
      throw new Error(`Article at index ${index} is missing required fields (title, content)`);
    }

    return {
      type: article.type === 'evergreen' ? 'evergreen' : 'news',
      title: article.title,
      subheading: article.subheading || undefined,
      content: article.content,
      category: article.category || (article.type === 'evergreen' ? 'Evergreen' : 'News'),
      tags: Array.isArray(article.tags) ? article.tags : [],
      sources: Array.isArray(article.sources) ? article.sources : [],
      status: 'draft',
    } as ArticleInsert;
  });
}
