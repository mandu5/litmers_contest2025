/**
 * AI Features API Routes
 * 
 * POST /api/ai - General AI features (label recommendation, duplicate detection)
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  checkRateLimit,
  incrementUsage,
  recommendLabels,
  detectDuplicates,
  getRateLimitMessage,
} from '@/lib/ai';

// Force dynamic rendering to avoid build-time execution
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, projectId, title, description } = body;

    if (!['labelRecommendation', 'duplicateDetection'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid AI request type' },
        { status: 400 }
      );
    }

    if (!projectId || !title) {
      return NextResponse.json(
        { error: 'Project ID and title are required' },
        { status: 400 }
      );
    }

    // Check project access
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        team: {
          include: {
            members: {
              where: { userId: session.user.id },
            },
          },
        },
        labels: true,
        issues: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            description: true,
          },
          take: 50,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project || project.deletedAt || !project.team.members.length) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

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

    if (type === 'labelRecommendation') {
      if (project.labels.length === 0) {
        return NextResponse.json({
          labels: [],
          message: 'No labels available in this project',
        });
      }

      await incrementUsage(session.user.id);
      const recommendedLabels = await recommendLabels(
        title,
        description || '',
        project.labels.map((l) => ({ id: l.id, name: l.name }))
      );

      return NextResponse.json({
        labels: recommendedLabels,
        remaining: {
          minute: rateLimit.remainingMinute - 1,
          daily: rateLimit.remainingDaily - 1,
        },
      });
    }

    if (type === 'duplicateDetection') {
      if (project.issues.length === 0) {
        return NextResponse.json({
          duplicates: [],
          message: 'No existing issues to compare',
        });
      }

      await incrementUsage(session.user.id);
      const duplicates = await detectDuplicates(title, project.issues);

      return NextResponse.json({
        duplicates,
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
