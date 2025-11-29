/**
 * Issue AI Features API Routes
 * 
 * POST /api/issues/[issueId]/ai - Generate AI content (summary, suggestion, comment summary)
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  checkRateLimit,
  incrementUsage,
  generateIssueSummary,
  generateSolutionSuggestion,
  summarizeComments,
  canUseAI,
  getRateLimitMessage,
} from '@/lib/ai';

// Force dynamic rendering to avoid build-time execution
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Helper to check issue access
async function checkIssueAccess(issueId: string, userId: string) {
  const issue = await db.issue.findUnique({
    where: { id: issueId },
    include: {
      project: {
        include: {
          team: {
            include: {
              members: {
                where: { userId },
              },
            },
          },
        },
      },
      comments: {
        where: { deletedAt: null },
        include: {
          author: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (
    !issue ||
    issue.deletedAt ||
    issue.project.deletedAt ||
    issue.project.team.deletedAt
  ) {
    return { authorized: false, error: 'Issue not found', status: 404 };
  }

  const membership = issue.project.team.members[0];
  if (!membership) {
    return { authorized: false, error: 'Issue not found', status: 404 };
  }

  return { authorized: true, issue, membership };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { issueId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { issueId } = params;
    const access = await checkIssueAccess(issueId, session.user.id);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const body = await request.json();
    const { type } = body; // 'summary', 'suggestion', 'commentSummary'

    if (!['summary', 'suggestion', 'commentSummary'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid AI request type' },
        { status: 400 }
      );
    }

    const issue = access.issue!;

    // Check rate limit
    const rateLimit = await checkRateLimit(session.user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: getRateLimitMessage(
            rateLimit.remainingMinute,
            rateLimit.remainingDaily,
            rateLimit.resetTime
          ),
        },
        { status: 429 }
      );
    }

    // Handle different AI request types
    if (type === 'summary') {
      // Check if we have a cached summary
      if (issue.aiSummary && issue.aiSummaryCachedAt) {
        return NextResponse.json({
          content: issue.aiSummary,
          cached: true,
          remaining: {
            minute: rateLimit.remainingMinute,
            daily: rateLimit.remainingDaily,
          },
        });
      }

      // Check if description is long enough
      if (!canUseAI(issue.description)) {
        return NextResponse.json(
          { error: 'Description must be longer than 10 characters for AI features' },
          { status: 400 }
        );
      }

      // Generate summary
      await incrementUsage(session.user.id);
      const summary = await generateIssueSummary(issue.title, issue.description!);

      // Cache the result
      await db.issue.update({
        where: { id: issueId },
        data: {
          aiSummary: summary,
          aiSummaryCachedAt: new Date(),
        },
      });

      return NextResponse.json({
        content: summary,
        cached: false,
        remaining: {
          minute: rateLimit.remainingMinute - 1,
          daily: rateLimit.remainingDaily - 1,
        },
      });
    }

    if (type === 'suggestion') {
      // Check if we have a cached suggestion
      if (issue.aiSuggestion && issue.aiSuggestionCachedAt) {
        return NextResponse.json({
          content: issue.aiSuggestion,
          cached: true,
          remaining: {
            minute: rateLimit.remainingMinute,
            daily: rateLimit.remainingDaily,
          },
        });
      }

      // Check if description is long enough
      if (!canUseAI(issue.description)) {
        return NextResponse.json(
          { error: 'Description must be longer than 10 characters for AI features' },
          { status: 400 }
        );
      }

      // Generate suggestion
      await incrementUsage(session.user.id);
      const suggestion = await generateSolutionSuggestion(issue.title, issue.description!);

      // Cache the result
      await db.issue.update({
        where: { id: issueId },
        data: {
          aiSuggestion: suggestion,
          aiSuggestionCachedAt: new Date(),
        },
      });

      return NextResponse.json({
        content: suggestion,
        cached: false,
        remaining: {
          minute: rateLimit.remainingMinute - 1,
          daily: rateLimit.remainingDaily - 1,
        },
      });
    }

    if (type === 'commentSummary') {
      // Check if we have enough comments
      if (issue.comments.length < 5) {
        return NextResponse.json(
          { error: 'At least 5 comments are required for summarization' },
          { status: 400 }
        );
      }

      // Check if we have a cached summary
      if (issue.aiCommentSummary && issue.aiCommentSummaryCachedAt) {
        return NextResponse.json({
          content: JSON.parse(issue.aiCommentSummary),
          cached: true,
          remaining: {
            minute: rateLimit.remainingMinute,
            daily: rateLimit.remainingDaily,
          },
        });
      }

      // Generate comment summary
      await incrementUsage(session.user.id);
      const commentData = issue.comments.map((c) => ({
        author: c.author.name || 'Unknown',
        content: c.content,
        createdAt: c.createdAt,
      }));
      
      const summary = await summarizeComments(issue.title, commentData);

      // Cache the result
      await db.issue.update({
        where: { id: issueId },
        data: {
          aiCommentSummary: JSON.stringify(summary),
          aiCommentSummaryCachedAt: new Date(),
        },
      });

      return NextResponse.json({
        content: summary,
        cached: false,
        remaining: {
          minute: rateLimit.remainingMinute - 1,
          daily: rateLimit.remainingDaily - 1,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('AI request error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
