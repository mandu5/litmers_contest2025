/**
 * AI Service using OpenAI API
 * 
 * Provides AI-powered features:
 * - Issue summary generation
 * - Solution suggestions
 * - Auto-label recommendations
 * - Duplicate detection
 * - Comment summarization
 */
import OpenAI from 'openai';
import { db } from './db';

// Lazy initialization to avoid build-time errors
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({
    apiKey,
  });
}

// Rate limiting constants
const RATE_LIMIT_PER_MINUTE = 10;
const RATE_LIMIT_PER_DAY = 100;
const MIN_DESCRIPTION_LENGTH = 10;

/**
 * Check and update AI usage rate limits
 */
export async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  remainingMinute: number;
  remainingDaily: number;
  resetTime?: Date;
}> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  // Get or create daily usage record
  let dailyUsage = await db.aIUsage.findUnique({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
  });

  if (!dailyUsage) {
    dailyUsage = await db.aIUsage.create({
      data: {
        userId,
        date: today,
        count: 0,
      },
    });
  }

  // Check daily limit
  if (dailyUsage.count >= RATE_LIMIT_PER_DAY) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      allowed: false,
      remainingMinute: 0,
      remainingDaily: 0,
      resetTime: tomorrow,
    };
  }

  // For minute-based rate limiting, we use a simpler approach
  // In production, consider using Redis for more precise rate limiting
  const recentUsage = await db.aIUsage.count({
    where: {
      userId,
      updatedAt: { gte: oneMinuteAgo },
    },
  });

  if (recentUsage >= RATE_LIMIT_PER_MINUTE) {
    return {
      allowed: false,
      remainingMinute: 0,
      remainingDaily: RATE_LIMIT_PER_DAY - dailyUsage.count,
      resetTime: new Date(oneMinuteAgo.getTime() + 60 * 1000),
    };
  }

  return {
    allowed: true,
    remainingMinute: RATE_LIMIT_PER_MINUTE - recentUsage,
    remainingDaily: RATE_LIMIT_PER_DAY - dailyUsage.count,
  };
}

/**
 * Increment AI usage count
 */
export async function incrementUsage(userId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await db.aIUsage.upsert({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
    update: {
      count: { increment: 1 },
    },
    create: {
      userId,
      date: today,
      count: 1,
    },
  });
}

/**
 * Generate a summary of an issue
 */
export async function generateIssueSummary(
  title: string,
  description: string
): Promise<string> {
  if (description.length <= MIN_DESCRIPTION_LENGTH) {
    throw new Error('Description must be longer than 10 characters for AI features');
  }

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that summarizes technical issues. Provide concise 2-4 sentence summaries that capture the key points.',
      },
      {
        role: 'user',
        content: `Please summarize this issue:\n\nTitle: ${title}\n\nDescription: ${description}`,
      },
    ],
    max_tokens: 200,
    temperature: 0.5,
  });

  return response.choices[0]?.message?.content || 'Unable to generate summary.';
}

/**
 * Generate solution suggestions for an issue
 */
export async function generateSolutionSuggestion(
  title: string,
  description: string
): Promise<string> {
  if (description.length <= MIN_DESCRIPTION_LENGTH) {
    throw new Error('Description must be longer than 10 characters for AI features');
  }

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful technical assistant. Provide practical approaches to solve the given issue. Be specific and actionable.',
      },
      {
        role: 'user',
        content: `Suggest an approach to solve this issue:\n\nTitle: ${title}\n\nDescription: ${description}`,
      },
    ],
    max_tokens: 500,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || 'Unable to generate suggestions.';
}

/**
 * Auto-recommend labels based on issue content
 */
export async function recommendLabels(
  title: string,
  description: string,
  availableLabels: Array<{ id: string; name: string }>
): Promise<Array<{ id: string; name: string }>> {
  if (availableLabels.length === 0) {
    return [];
  }

  const labelNames = availableLabels.map((l) => l.name).join(', ');

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant that categorizes issues. Based on the issue content, recommend the most relevant labels from the available options. Return ONLY a JSON array of label names (max 3), nothing else.`,
      },
      {
        role: 'user',
        content: `Available labels: ${labelNames}\n\nIssue Title: ${title}\n\nIssue Description: ${description || 'No description provided'}`,
      },
    ],
    max_tokens: 100,
    temperature: 0.3,
  });

  try {
    const content = response.choices[0]?.message?.content || '[]';
    // Extract JSON array from the response
    const match = content.match(/\[.*\]/s);
    if (!match) return [];
    
    const recommendedNames: string[] = JSON.parse(match[0]);
    return availableLabels.filter((label) =>
      recommendedNames.some(
        (name) => name.toLowerCase() === label.name.toLowerCase()
      )
    ).slice(0, 3);
  } catch {
    return [];
  }
}

/**
 * Detect duplicate/similar issues
 */
export async function detectDuplicates(
  title: string,
  existingIssues: Array<{ id: string; title: string; description?: string | null }>
): Promise<Array<{ id: string; title: string; similarity: number }>> {
  if (existingIssues.length === 0) {
    return [];
  }

  // Create a concise list of existing issues
  const issueList = existingIssues
    .slice(0, 20) // Limit to 20 most recent issues
    .map((issue, index) => `${index + 1}. ${issue.title}`)
    .join('\n');

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant that detects duplicate or similar issues. Given a new issue title and a list of existing issues, identify the most similar ones. Return ONLY a JSON array of objects with "index" (1-based) and "similarity" (0-100) properties, max 3 items. Return [] if no similar issues found.`,
      },
      {
        role: 'user',
        content: `New issue title: ${title}\n\nExisting issues:\n${issueList}`,
      },
    ],
    max_tokens: 200,
    temperature: 0.3,
  });

  try {
    const content = response.choices[0]?.message?.content || '[]';
    const match = content.match(/\[.*\]/s);
    if (!match) return [];

    const similarities: Array<{ index: number; similarity: number }> = JSON.parse(match[0]);
    
    return similarities
      .filter((s) => s.similarity >= 50) // Only return issues with 50%+ similarity
      .map((s) => {
        const issue = existingIssues[s.index - 1];
        if (!issue) return null;
        return {
          id: issue.id,
          title: issue.title,
          similarity: s.similarity,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 3);
  } catch {
    return [];
  }
}

/**
 * Summarize comment discussions
 */
export async function summarizeComments(
  issueTitle: string,
  comments: Array<{ author: string; content: string; createdAt: Date }>
): Promise<{ summary: string; keyDecisions: string[] }> {
  if (comments.length < 5) {
    throw new Error('At least 5 comments are required for summarization');
  }

  const commentText = comments
    .map(
      (c) =>
        `${c.author} (${new Date(c.createdAt).toLocaleDateString()}): ${c.content}`
    )
    .join('\n\n');

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant that summarizes technical discussions. Provide a 3-5 sentence summary of the discussion and identify any key decisions made. Return a JSON object with "summary" (string) and "keyDecisions" (array of strings).`,
      },
      {
        role: 'user',
        content: `Issue: ${issueTitle}\n\nDiscussion:\n${commentText}`,
      },
    ],
    max_tokens: 400,
    temperature: 0.5,
  });

  try {
    const content = response.choices[0]?.message?.content || '';
    // Try to parse as JSON first
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    // Fallback if not valid JSON
    return {
      summary: content,
      keyDecisions: [],
    };
  } catch {
    return {
      summary: response.choices[0]?.message?.content || 'Unable to summarize discussion.',
      keyDecisions: [],
    };
  }
}

/**
 * Helper to validate description length
 */
export function canUseAI(description: string | null | undefined): boolean {
  return !!description && description.length > MIN_DESCRIPTION_LENGTH;
}

/**
 * Get AI rate limit status message
 */
export function getRateLimitMessage(
  remainingMinute: number,
  remainingDaily: number,
  resetTime?: Date
): string {
  if (remainingDaily === 0) {
    return `Daily AI limit reached. Resets at midnight.`;
  }
  if (remainingMinute === 0) {
    const resetIn = resetTime
      ? Math.ceil((resetTime.getTime() - Date.now()) / 1000)
      : 60;
    return `Rate limit reached. Please wait ${resetIn} seconds.`;
  }
  return `${remainingDaily} AI requests remaining today.`;
}
