/**
 * Project Issues API Routes
 * 
 * GET /api/projects/[projectId]/issues - Get all issues with filters
 * POST /api/projects/[projectId]/issues - Create a new issue
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createIssueSchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';

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

    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const status = searchParams.get('status');
    const assigneeId = searchParams.get('assigneeId');
    const priority = searchParams.get('priority');
    const labelId = searchParams.get('labelId');
    const search = searchParams.get('search');
    const hasDueDate = searchParams.get('hasDueDate');
    const dueDateFrom = searchParams.get('dueDateFrom');
    const dueDateTo = searchParams.get('dueDateTo');
    const sortBy = searchParams.get('sortBy') || 'position';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build where clause
    const where: Prisma.IssueWhereInput = {
      projectId,
      deletedAt: null,
    };

    if (status) {
      where.status = status as 'BACKLOG' | 'IN_PROGRESS' | 'DONE';
    }

    if (assigneeId) {
      where.assigneeId = assigneeId === 'unassigned' ? null : assigneeId;
    }

    if (priority) {
      where.priority = priority as 'HIGH' | 'MEDIUM' | 'LOW';
    }

    if (labelId) {
      where.labels = {
        some: { labelId },
      };
    }

    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (hasDueDate === 'true') {
      where.dueDate = { not: null };
    } else if (hasDueDate === 'false') {
      where.dueDate = null;
    }

    if (dueDateFrom || dueDateTo) {
      where.dueDate = {
        ...(dueDateFrom && { gte: new Date(dueDateFrom) }),
        ...(dueDateTo && { lte: new Date(dueDateTo) }),
      };
    }

    // Build orderBy
    const orderBy: Prisma.IssueOrderByWithRelationInput[] = [];
    
    switch (sortBy) {
      case 'createdAt':
        orderBy.push({ createdAt: sortOrder as 'asc' | 'desc' });
        break;
      case 'dueDate':
        orderBy.push({ dueDate: sortOrder as 'asc' | 'desc' });
        break;
      case 'priority':
        orderBy.push({ priority: sortOrder as 'asc' | 'desc' });
        break;
      case 'updatedAt':
        orderBy.push({ updatedAt: sortOrder as 'asc' | 'desc' });
        break;
      default:
        orderBy.push({ position: 'asc' });
    }

    const issues = await db.issue.findMany({
      where,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
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
          select: {
            comments: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy,
    });

    // Transform labels for easier consumption
    const transformedIssues = issues.map((issue) => ({
      ...issue,
      labels: issue.labels.map((il) => il.label),
      commentCount: issue._count.comments,
      _count: undefined,
    }));

    return NextResponse.json(transformedIssues);
  } catch (error) {
    console.error('Get issues error:', error);
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

    // Check if project is archived
    if (access.project?.isArchived) {
      return NextResponse.json(
        { error: 'Cannot create issues in an archived project' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const result = createIssueSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, description, assigneeId, dueDate, priority, labelIds } = result.data;

    // Check issue limit (max 200 per project)
    const issueCount = await db.issue.count({
      where: {
        projectId,
        deletedAt: null,
      },
    });

    if (issueCount >= 200) {
      return NextResponse.json(
        { error: 'Maximum 200 issues per project allowed' },
        { status: 400 }
      );
    }

    // Validate assignee is a team member
    if (assigneeId) {
      const isMember = await db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: access.project!.teamId,
            userId: assigneeId,
          },
        },
      });

      if (!isMember) {
        return NextResponse.json(
          { error: 'Assignee must be a team member' },
          { status: 400 }
        );
      }
    }

    // Get max position for BACKLOG status
    const maxPosition = await db.issue.aggregate({
      where: {
        projectId,
        status: 'BACKLOG',
        deletedAt: null,
      },
      _max: { position: true },
    });

    const newPosition = (maxPosition._max.position || 0) + 1;

    // Create issue
    const issue = await db.issue.create({
      data: {
        title,
        description,
        projectId,
        creatorId: session.user.id,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        position: newPosition,
        labels: labelIds?.length
          ? {
              create: labelIds.map((labelId) => ({ labelId })),
            }
          : undefined,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        labels: {
          include: {
            label: true,
          },
        },
        subtasks: true,
      },
    });

    // Create notification for assignee
    if (assigneeId && assigneeId !== session.user.id) {
      await db.notification.create({
        data: {
          userId: assigneeId,
          type: 'ISSUE_ASSIGNED',
          title: 'New Issue Assigned',
          message: `You've been assigned to "${title}"`,
          link: `/projects/${projectId}/issues/${issue.id}`,
        },
      });
    }

    return NextResponse.json(
      {
        ...issue,
        labels: issue.labels.map((il) => il.label),
        commentCount: 0,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create issue error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
