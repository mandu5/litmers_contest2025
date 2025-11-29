/**
 * Project Custom Statuses API Routes
 * 
 * GET /api/projects/[projectId]/statuses - Get all custom statuses
 * POST /api/projects/[projectId]/statuses - Create a new custom status
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createCustomStatusSchema } from '@/lib/validations';

// Helper to check project access
async function checkProjectAccess(projectId: string, userId: string) {
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

    const statuses = await db.customStatus.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(statuses);
  } catch (error) {
    console.error('Get statuses error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

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
    const access = await checkProjectAccess(projectId, session.user.id);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const body = await request.json();
    
    // Validate input
    const result = createCustomStatusSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, color, position, wipLimit } = result.data;

    // Check custom status limit (max 5 per project)
    const statusCount = await db.customStatus.count({
      where: { projectId },
    });

    if (statusCount >= 5) {
      return NextResponse.json(
        { error: 'Maximum 5 custom statuses per project allowed' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existingStatus = await db.customStatus.findUnique({
      where: {
        projectId_name: { projectId, name },
      },
    });

    if (existingStatus) {
      return NextResponse.json(
        { error: 'A status with this name already exists' },
        { status: 400 }
      );
    }

    const status = await db.customStatus.create({
      data: {
        name,
        color,
        position,
        wipLimit,
        projectId,
      },
    });

    return NextResponse.json(status, { status: 201 });
  } catch (error) {
    console.error('Create status error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
