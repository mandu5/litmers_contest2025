/**
 * Project Archive API Route
 * 
 * POST /api/projects/[projectId]/archive - Toggle archive status
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = params;

    // Check project access and permission
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
      },
    });

    if (!project || project.deletedAt) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const membership = project.team.members[0];
    if (!membership) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check permission
    const canArchive =
      membership.role === 'OWNER' ||
      membership.role === 'ADMIN' ||
      project.ownerId === session.user.id;

    if (!canArchive) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Toggle archive status
    const updatedProject = await db.project.update({
      where: { id: projectId },
      data: { isArchived: !project.isArchived },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        teamId: project.teamId,
        userId: session.user.id,
        type: updatedProject.isArchived ? 'PROJECT_ARCHIVED' : 'PROJECT_RESTORED',
        description: `${session.user.name} ${updatedProject.isArchived ? 'archived' : 'restored'} project "${project.name}"`,
      },
    });

    return NextResponse.json({ isArchived: updatedProject.isArchived });
  } catch (error) {
    console.error('Toggle archive error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
