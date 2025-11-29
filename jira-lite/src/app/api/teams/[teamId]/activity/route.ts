/**
 * Team Activity Log API Route
 * 
 * GET /api/teams/[teamId]/activity - Get team activity log with pagination
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// Helper to check team membership
async function checkTeamAccess(teamId: string, userId: string) {
  const membership = await db.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
    include: {
      team: true,
    },
  });

  if (!membership || membership.team.deletedAt) {
    return { authorized: false, error: 'Team not found', status: 404 };
  }

  return { authorized: true, membership, team: membership.team };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = params;
    const access = await checkTeamAccess(teamId, session.user.id);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const activities = await db.activityLog.findMany({
      where: { teamId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let nextCursor: string | undefined;
    if (activities.length > limit) {
      const nextItem = activities.pop();
      nextCursor = nextItem?.id;
    }

    return NextResponse.json({
      activities,
      nextCursor,
      hasMore: !!nextCursor,
    });
  } catch (error) {
    console.error('Get activity error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
