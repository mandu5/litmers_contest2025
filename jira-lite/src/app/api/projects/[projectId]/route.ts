/**
 * Project by ID API Routes
 * 
 * GET /api/projects/[projectId] - Get project details
 * PUT /api/projects/[projectId] - Update project
 * DELETE /api/projects/[projectId] - Delete project
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateProjectSchema } from '@/lib/validations';

// Helper to check project access
async function checkProjectAccess(
  projectId: string,
  userId: string,
  requireOwnerOrAdmin = false
) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      team: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  });

  if (!project || project.deletedAt || project.team.deletedAt) {
    return { authorized: false, error: 'Project not found', status: 404 };
  }

  const membership = project.team.members[0];
  if (!membership) {
    return { authorized: false, error: 'Project not found', status: 404 };
  }

  if (requireOwnerOrAdmin) {
    const canModify =
      membership.role === 'OWNER' ||
      membership.role === 'ADMIN' ||
      project.ownerId === userId;
    
    if (!canModify) {
      return { authorized: false, error: 'Forbidden', status: 403 };
    }
  }

  return { authorized: true, project, membership };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = params;
    const access = await checkProjectAccess(projectId, session.user.id);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
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
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        labels: {
          orderBy: { name: 'asc' },
        },
        statuses: {
          orderBy: { position: 'asc' },
        },
        favorites: {
          where: { userId: session.user.id },
        },
        issues: {
          where: { deletedAt: null },
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                profileImage: true,
              },
            },
            labels: {
              include: {
                label: true,
              },
            },
            subtasks: {
              orderBy: { position: 'asc' },
            },
            _count: {
              select: { comments: { where: { deletedAt: null } } },
            },
          },
          orderBy: [
            { status: 'asc' },
            { position: 'asc' },
          ],
        },
      },
    });

    // Calculate stats
    const stats = {
      total: project?.issues.length || 0,
      backlog: project?.issues.filter((i) => i.status === 'BACKLOG').length || 0,
      inProgress: project?.issues.filter((i) => i.status === 'IN_PROGRESS').length || 0,
      done: project?.issues.filter((i) => i.status === 'DONE').length || 0,
    };

    return NextResponse.json({
      ...project,
      isFavorite: (project?.favorites.length || 0) > 0,
      stats,
      userRole: access.membership?.role,
      canEdit:
        access.membership?.role === 'OWNER' ||
        access.membership?.role === 'ADMIN' ||
        project?.ownerId === session.user.id,
    });
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = params;
    const access = await checkProjectAccess(projectId, session.user.id, true);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const body = await request.json();
    
    // Validate input
    const result = updateProjectSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const project = await db.project.update({
      where: { id: projectId },
      data: {
        name: result.data.name,
        description: result.data.description,
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

    return NextResponse.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = params;
    const access = await checkProjectAccess(projectId, session.user.id, true);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    // Soft delete project and related issues
    await db.$transaction([
      db.issue.updateMany({
        where: { projectId },
        data: { deletedAt: new Date() },
      }),
      db.project.update({
        where: { id: projectId },
        data: { deletedAt: new Date() },
      }),
    ]);

    // Log activity
    await db.activityLog.create({
      data: {
        teamId: access.project!.teamId,
        userId: session.user.id,
        type: 'PROJECT_DELETED',
        description: `${session.user.name} deleted project "${access.project!.name}"`,
      },
    });

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
