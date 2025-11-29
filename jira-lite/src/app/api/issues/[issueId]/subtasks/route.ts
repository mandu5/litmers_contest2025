/**
 * Issue Subtasks API Routes
 * 
 * GET /api/issues/[issueId]/subtasks - Get all subtasks
 * POST /api/issues/[issueId]/subtasks - Create a new subtask
 * PUT /api/issues/[issueId]/subtasks - Update subtask
 * DELETE /api/issues/[issueId]/subtasks - Delete subtask
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createSubtaskSchema, updateSubtaskSchema } from '@/lib/validations';

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

export async function GET(
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

    const subtasks = await db.subtask.findMany({
      where: { issueId },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(subtasks);
  } catch (error) {
    console.error('Get subtasks error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
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

    // Check if project is archived
    if (access.issue?.project.isArchived) {
      return NextResponse.json(
        { error: 'Cannot add subtasks in an archived project' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const result = createSubtaskSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title } = result.data;

    // Check subtask limit (max 20 per issue)
    const subtaskCount = await db.subtask.count({
      where: { issueId },
    });

    if (subtaskCount >= 20) {
      return NextResponse.json(
        { error: 'Maximum 20 subtasks per issue allowed' },
        { status: 400 }
      );
    }

    // Get max position
    const maxPosition = await db.subtask.aggregate({
      where: { issueId },
      _max: { position: true },
    });

    const subtask = await db.subtask.create({
      data: {
        title,
        issueId,
        position: (maxPosition._max.position || 0) + 1,
      },
    });

    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    console.error('Create subtask error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    // Check if project is archived
    if (access.issue?.project.isArchived) {
      return NextResponse.json(
        { error: 'Cannot update subtasks in an archived project' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { subtaskId, ...updateData } = body;

    if (!subtaskId) {
      return NextResponse.json(
        { error: 'Subtask ID is required' },
        { status: 400 }
      );
    }

    // Validate input
    const result = updateSubtaskSchema.safeParse(updateData);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check if subtask exists
    const existingSubtask = await db.subtask.findUnique({
      where: { id: subtaskId },
    });

    if (!existingSubtask || existingSubtask.issueId !== issueId) {
      return NextResponse.json(
        { error: 'Subtask not found' },
        { status: 404 }
      );
    }

    const subtask = await db.subtask.update({
      where: { id: subtaskId },
      data: result.data,
    });

    return NextResponse.json(subtask);
  } catch (error) {
    console.error('Update subtask error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { issueId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { issueId } = params;
    const { searchParams } = new URL(request.url);
    const subtaskId = searchParams.get('subtaskId');

    if (!subtaskId) {
      return NextResponse.json(
        { error: 'Subtask ID is required' },
        { status: 400 }
      );
    }

    const access = await checkIssueAccess(issueId, session.user.id);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    // Check if subtask exists
    const existingSubtask = await db.subtask.findUnique({
      where: { id: subtaskId },
    });

    if (!existingSubtask || existingSubtask.issueId !== issueId) {
      return NextResponse.json(
        { error: 'Subtask not found' },
        { status: 404 }
      );
    }

    await db.subtask.delete({
      where: { id: subtaskId },
    });

    return NextResponse.json({ message: 'Subtask deleted successfully' });
  } catch (error) {
    console.error('Delete subtask error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
