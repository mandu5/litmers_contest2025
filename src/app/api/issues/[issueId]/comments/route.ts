/**
 * Issue Comments API Routes
 * 
 * GET /api/issues/[issueId]/comments - Get all comments with pagination
 * POST /api/issues/[issueId]/comments - Create a new comment
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createCommentSchema, updateCommentSchema } from '@/lib/validations';

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

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const comments = await db.comment.findMany({
      where: {
        issueId,
        deletedAt: null,
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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
    });

    let nextCursor: string | undefined;
    if (comments.length > limit) {
      const nextItem = comments.pop();
      nextCursor = nextItem?.id;
    }

    return NextResponse.json({
      comments,
      nextCursor,
      hasMore: !!nextCursor,
    });
  } catch (error) {
    console.error('Get comments error:', error);
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
        { error: 'Cannot add comments in an archived project' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const result = createCommentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { content } = result.data;

    const comment = await db.comment.create({
      data: {
        content,
        issueId,
        authorId: session.user.id,
      },
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
    });

    // Invalidate AI comment summary cache
    await db.issue.update({
      where: { id: issueId },
      data: {
        aiCommentSummary: null,
        aiCommentSummaryCachedAt: null,
      },
    });

    // Create notification for issue owner and assignee (if not the commenter)
    const issue = access.issue!;
    const notifyUserIds = new Set<string>();
    
    if (issue.creatorId !== session.user.id) {
      notifyUserIds.add(issue.creatorId);
    }
    if (issue.assigneeId && issue.assigneeId !== session.user.id) {
      notifyUserIds.add(issue.assigneeId);
    }

    for (const userId of Array.from(notifyUserIds)) {
      await db.notification.create({
        data: {
          userId,
          type: 'COMMENT_ADDED',
          title: 'New Comment',
          message: `${session.user.name} commented on "${issue.title}"`,
          link: `/projects/${issue.projectId}/issues/${issueId}`,
        },
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Create comment error:', error);
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

    const body = await request.json();
    const { commentId, ...updateData } = body;

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    // Validate input
    const result = updateCommentSchema.safeParse(updateData);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check if comment exists and user is the author
    const existingComment = await db.comment.findUnique({
      where: { id: commentId },
    });

    if (!existingComment || existingComment.issueId !== issueId || existingComment.deletedAt) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    if (existingComment.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the author can edit this comment' },
        { status: 403 }
      );
    }

    const comment = await db.comment.update({
      where: { id: commentId },
      data: result.data,
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
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Update comment error:', error);
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
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
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

    // Check if comment exists
    const existingComment = await db.comment.findUnique({
      where: { id: commentId },
    });

    if (!existingComment || existingComment.issueId !== issueId || existingComment.deletedAt) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check permission: author, issue owner, project owner, team owner/admin
    const issue = access.issue!;
    const canDelete =
      existingComment.authorId === session.user.id ||
      issue.creatorId === session.user.id ||
      issue.project.ownerId === session.user.id ||
      access.membership?.role === 'OWNER' ||
      access.membership?.role === 'ADMIN';

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete
    await db.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
