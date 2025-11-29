/**
 * Team by ID API Routes
 * 
 * GET /api/teams/[teamId] - Get team details
 * PUT /api/teams/[teamId] - Update team
 * DELETE /api/teams/[teamId] - Delete team
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateTeamSchema } from '@/lib/validations';

// Helper to check team membership and role
async function checkTeamAccess(
  teamId: string,
  userId: string,
  requiredRoles?: ('OWNER' | 'ADMIN' | 'MEMBER')[]
) {
  const membership = await db.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
    include: {
      team: {
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });

  if (!membership || membership.team.deletedAt) {
    return { authorized: false, error: 'Team not found', status: 404 };
  }

  if (requiredRoles && !requiredRoles.includes(membership.role)) {
    return { authorized: false, error: 'Forbidden', status: 403 };
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

    const team = await db.team.findUnique({
      where: { id: teamId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        members: {
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
          orderBy: [
            { role: 'asc' },
            { joinedAt: 'asc' },
          ],
        },
        projects: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        invites: {
          where: {
            acceptedAt: null,
            expiresAt: { gt: new Date() },
          },
        },
      },
    });

    return NextResponse.json({
      ...team,
      userRole: access.membership?.role,
    });
  } catch (error) {
    console.error('Get team error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = params;
    const access = await checkTeamAccess(teamId, session.user.id, ['OWNER', 'ADMIN']);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const body = await request.json();
    
    // Validate input
    const result = updateTeamSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name } = result.data;

    const team = await db.team.update({
      where: { id: teamId },
      data: { name },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        members: {
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
        },
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        teamId,
        userId: session.user.id,
        type: 'TEAM_UPDATED',
        description: `${session.user.name} updated team settings`,
      },
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error('Update team error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = params;
    const access = await checkTeamAccess(teamId, session.user.id, ['OWNER']);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    // Soft delete team and all related entities
    await db.$transaction([
      // Soft delete all projects
      db.project.updateMany({
        where: { teamId },
        data: { deletedAt: new Date() },
      }),
      // Soft delete all issues in team projects
      db.issue.updateMany({
        where: { project: { teamId } },
        data: { deletedAt: new Date() },
      }),
      // Soft delete the team
      db.team.update({
        where: { id: teamId },
        data: { deletedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
