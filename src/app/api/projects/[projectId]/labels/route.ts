/**
 * Project Labels API Routes
 * 
 * GET /api/projects/[projectId]/labels - Get all labels
 * POST /api/projects/[projectId]/labels - Create a new label
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createLabelSchema } from '@/lib/validations';

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

    const labels = await db.label.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(labels);
  } catch (error) {
    console.error('Get labels error:', error);
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
    const result = createLabelSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, color } = result.data;

    // Check label limit (max 20 per project)
    const labelCount = await db.label.count({
      where: { projectId },
    });

    if (labelCount >= 20) {
      return NextResponse.json(
        { error: 'Maximum 20 labels per project allowed' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existingLabel = await db.label.findUnique({
      where: {
        projectId_name: { projectId, name },
      },
    });

    if (existingLabel) {
      return NextResponse.json(
        { error: 'A label with this name already exists' },
        { status: 400 }
      );
    }

    const label = await db.label.create({
      data: {
        name,
        color,
        projectId,
      },
    });

    return NextResponse.json(label, { status: 201 });
  } catch (error) {
    console.error('Create label error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
