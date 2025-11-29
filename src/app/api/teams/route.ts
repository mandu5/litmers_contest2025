/**
 * Teams API Routes
 * 
 * GET /api/teams - Get all teams for current user
 * POST /api/teams - Create a new team
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createTeamSchema } from '@/lib/validations';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teams = await db.team.findMany({
      where: {
        deletedAt: null,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
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
        _count: {
          select: {
            projects: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform data to include member count and user's role
    const transformedTeams = teams.map((team) => {
      const userMembership = team.members.find((m) => m.userId === session.user.id);
      return {
        ...team,
        memberCount: team.members.length,
        projectCount: team._count.projects,
        userRole: userMembership?.role || null,
      };
    });

    return NextResponse.json(transformedTeams);
  } catch (error) {
    console.error('Get teams error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input
    const result = createTeamSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name } = result.data;

    // Create team with owner as member
    const team = await db.team.create({
      data: {
        name,
        ownerId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: 'OWNER',
          },
        },
      },
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
        teamId: team.id,
        userId: session.user.id,
        type: 'MEMBER_JOINED',
        description: `${session.user.name} created the team`,
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error('Create team error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
