/**
 * Projects API Routes
 * 
 * GET /api/projects - Get all projects for current user
 * POST /api/projects - Create a new project
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createProjectSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    // Get all teams user is a member of
    const teamMemberships = await db.teamMember.findMany({
      where: { userId: session.user.id },
      select: { teamId: true },
    });

    const teamIds = teamMemberships.map((m) => m.teamId);

    // Get projects
    const projects = await db.project.findMany({
      where: {
        deletedAt: null,
        teamId: teamId ? teamId : { in: teamIds },
        team: {
          deletedAt: null,
        },
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        favorites: {
          where: { userId: session.user.id },
        },
        _count: {
          select: {
            issues: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to include favorite status
    const transformedProjects = projects.map((project) => ({
      ...project,
      isFavorite: project.favorites.length > 0,
      issueCount: project._count.issues,
      favorites: undefined,
      _count: undefined,
    }));

    // Sort: favorites first, then by creation date
    transformedProjects.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json(transformedProjects);
  } catch (error) {
    console.error('Get projects error:', error);
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
    const result = createProjectSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, description, teamId } = result.data;

    // Check team membership
    const membership = await db.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId: session.user.id },
      },
      include: {
        team: true,
      },
    });

    if (!membership || membership.team.deletedAt) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check project limit (max 15 per team)
    const projectCount = await db.project.count({
      where: {
        teamId,
        deletedAt: null,
      },
    });

    if (projectCount >= 15) {
      return NextResponse.json(
        { error: 'Maximum 15 projects per team allowed' },
        { status: 400 }
      );
    }

    // Create project with default statuses
    const project = await db.project.create({
      data: {
        name,
        description,
        teamId,
        ownerId: session.user.id,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        teamId,
        userId: session.user.id,
        type: 'PROJECT_CREATED',
        description: `${session.user.name} created project "${name}"`,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
