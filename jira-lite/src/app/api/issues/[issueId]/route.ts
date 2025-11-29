/**
 * Issue by ID API Routes
 * 
 * GET /api/issues/[issueId] - Get issue details
 * PUT /api/issues/[issueId] - Update issue
 * DELETE /api/issues/[issueId] - Delete issue
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateIssueSchema } from '@/lib/validations';

// Helper to check issue access
async function checkIssueAccess(
  issueId: string,
  userId: string,
  requireEditPermission = false
) {
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

  if (requireEditPermission) {
    const canDelete =
      membership.role === 'OWNER' ||
      membership.role === 'ADMIN' ||
      issue.project.ownerId === userId ||
      issue.creatorId === userId;

    if (!canDelete) {
      return { authorized: false, error: 'Forbidden', status: 403 };
    }
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

    const issue = await db.issue.findUnique({
      where: { id: issueId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            teamId: true,
            isArchived: true,
            ownerId: true,
          },
        },
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
        comments: {
          where: { deletedAt: null },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImage: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        history: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profileImage: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    // Check permissions
    const canEdit = !access.issue?.project.isArchived;
    const canDelete =
      access.membership?.role === 'OWNER' ||
      access.membership?.role === 'ADMIN' ||
      issue?.project.ownerId === session.user.id ||
      issue?.creatorId === session.user.id;

    return NextResponse.json({
      ...issue,
      labels: issue?.labels.map((il) => il.label),
      canEdit,
      canDelete,
    });
  } catch (error) {
    console.error('Get issue error:', error);
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
        { error: 'Cannot edit issues in an archived project' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const result = updateIssueSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, description, status, customStatusId, assigneeId, dueDate, priority, labelIds, position } =
      result.data;

    const currentIssue = access.issue!;

    // Prepare history entries
    const historyEntries: {
      issueId: string;
      userId: string;
      field: string;
      oldValue: string | null;
      newValue: string | null;
    }[] = [];

    if (title !== undefined && title !== currentIssue.title) {
      historyEntries.push({
        issueId,
        userId: session.user.id,
        field: 'title',
        oldValue: currentIssue.title,
        newValue: title,
      });
    }

    if (status !== undefined && status !== currentIssue.status) {
      historyEntries.push({
        issueId,
        userId: session.user.id,
        field: 'status',
        oldValue: currentIssue.status,
        newValue: status,
      });

      // Invalidate AI cache when status changes
    }

    if (assigneeId !== undefined) {
      const oldAssigneeId = currentIssue.assigneeId;
      const newAssigneeId = assigneeId === '' ? null : assigneeId;

      if (oldAssigneeId !== newAssigneeId) {
        // Validate new assignee is a team member
        if (newAssigneeId) {
          const isMember = await db.teamMember.findUnique({
            where: {
              teamId_userId: {
                teamId: currentIssue.project.teamId,
                userId: newAssigneeId,
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

        historyEntries.push({
          issueId,
          userId: session.user.id,
          field: 'assignee',
          oldValue: oldAssigneeId,
          newValue: newAssigneeId,
        });

        // Create notification for new assignee
        if (newAssigneeId && newAssigneeId !== session.user.id) {
          await db.notification.create({
            data: {
              userId: newAssigneeId,
              type: 'ISSUE_ASSIGNED',
              title: 'Issue Assigned',
              message: `You've been assigned to "${currentIssue.title}"`,
              link: `/projects/${currentIssue.projectId}/issues/${issueId}`,
            },
          });
        }
      }
    }

    if (priority !== undefined && priority !== currentIssue.priority) {
      historyEntries.push({
        issueId,
        userId: session.user.id,
        field: 'priority',
        oldValue: currentIssue.priority,
        newValue: priority,
      });
    }

    if (dueDate !== undefined) {
      const oldDueDate = currentIssue.dueDate?.toISOString().split('T')[0] || null;
      const newDueDate = dueDate || null;

      if (oldDueDate !== newDueDate) {
        historyEntries.push({
          issueId,
          userId: session.user.id,
          field: 'dueDate',
          oldValue: oldDueDate,
          newValue: newDueDate,
        });
      }
    }

    // Update issue
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) {
      updateData.description = description;
      // Invalidate AI cache
      updateData.aiSummary = null;
      updateData.aiSuggestion = null;
      updateData.aiSummaryCachedAt = null;
      updateData.aiSuggestionCachedAt = null;
    }
    if (status !== undefined) updateData.status = status;
    if (customStatusId !== undefined) updateData.customStatusId = customStatusId;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId === '' ? null : assigneeId;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (priority !== undefined) updateData.priority = priority;
    if (position !== undefined) updateData.position = position;

    // Handle labels
    if (labelIds !== undefined) {
      // Delete existing labels
      await db.issueLabel.deleteMany({
        where: { issueId },
      });

      // Create new labels
      if (labelIds.length > 0) {
        await db.issueLabel.createMany({
          data: labelIds.map((labelId) => ({
            issueId,
            labelId,
          })),
        });
      }
    }

    // Update issue and create history
    const [updatedIssue] = await db.$transaction([
      db.issue.update({
        where: { id: issueId },
        data: updateData,
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
        },
      }),
      ...(historyEntries.length > 0
        ? [db.issueHistory.createMany({ data: historyEntries })]
        : []),
    ]);

    return NextResponse.json({
      ...updatedIssue,
      labels: updatedIssue.labels.map((il) => il.label),
    });
  } catch (error) {
    console.error('Update issue error:', error);
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
    const access = await checkIssueAccess(issueId, session.user.id, true);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    // Soft delete issue and related comments
    await db.$transaction([
      db.comment.updateMany({
        where: { issueId },
        data: { deletedAt: new Date() },
      }),
      db.issue.update({
        where: { id: issueId },
        data: { deletedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Delete issue error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
