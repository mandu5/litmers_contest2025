/**
 * Team Members API Routes
 * 
 * GET /api/teams/[teamId]/members - Get all team members
 * PUT /api/teams/[teamId]/members - Update member role
 * DELETE /api/teams/[teamId]/members - Remove member or leave team
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { changeRoleSchema, transferOwnershipSchema } from '@/lib/validations';

// Helper to check team membership and role
async function checkTeamAccess(
  teamId: string,
  userId: string,
  requiredRoles?: ('OWNER' | 'ADMIN' | 'MEMBER')[]
) {
  const membership = await db.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
    include: {
      team: true,
    },
  });

  if (!membership || membership.team.deletedAt) {
    return { authorized: false, error: 'Team not found', status: 404 };
  }

  if (requiredRoles && !requiredRoles.includes(membership.role)) {
    return { authorized: false, error: 'Forbidden', status: 403 };
  }

  return { authorized: true, membership, team: membership.team };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = params;
    const access = await checkTeamAccess(teamId, session.user.id);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const members = await db.teamMember.findMany({
      where: { teamId },
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
      orderBy: [
        { role: 'asc' },
        { joinedAt: 'asc' },
      ],
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = params;
    const access = await checkTeamAccess(teamId, session.user.id, ['OWNER']);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'transfer') {
      // Transfer ownership
      const result = transferOwnershipSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.issues[0].message },
          { status: 400 }
        );
      }

      const { userId: newOwnerId } = result.data;

      // Check if target user is a team member
      const targetMember = await db.teamMember.findUnique({
        where: {
          teamId_userId: { teamId, userId: newOwnerId },
        },
      });

      if (!targetMember) {
        return NextResponse.json(
          { error: 'User is not a team member' },
          { status: 400 }
        );
      }

      // Transfer ownership
      await db.$transaction([
        // Update team owner
        db.team.update({
          where: { id: teamId },
          data: { ownerId: newOwnerId },
        }),
        // Set new owner role
        db.teamMember.update({
          where: { teamId_userId: { teamId, userId: newOwnerId } },
          data: { role: 'OWNER' },
        }),
        // Demote previous owner to ADMIN
        db.teamMember.update({
          where: { teamId_userId: { teamId, userId: session.user.id } },
          data: { role: 'ADMIN' },
        }),
      ]);

      // Log activity
      const newOwner = await db.user.findUnique({
        where: { id: newOwnerId },
        select: { name: true },
      });

      await db.activityLog.create({
        data: {
          teamId,
          userId: session.user.id,
          type: 'ROLE_CHANGED',
          description: `${session.user.name} transferred ownership to ${newOwner?.name}`,
        },
      });

      // Create notification for new owner
      await db.notification.create({
        data: {
          userId: newOwnerId,
          type: 'ROLE_CHANGED',
          title: 'Ownership Transfer',
          message: `You are now the owner of ${access.team?.name || 'the team'}`,
          link: `/teams/${teamId}`,
        },
      });

      return NextResponse.json({ message: 'Ownership transferred successfully' });
    } else {
      // Change role
      const result = changeRoleSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.issues[0].message },
          { status: 400 }
        );
      }

      const { userId: targetUserId, role } = result.data;

      // Cannot change own role
      if (targetUserId === session.user.id) {
        return NextResponse.json(
          { error: 'Cannot change your own role' },
          { status: 400 }
        );
      }

      // Check if target user is a team member
      const targetMember = await db.teamMember.findUnique({
        where: {
          teamId_userId: { teamId, userId: targetUserId },
        },
        include: {
          user: {
            select: { name: true },
          },
        },
      });

      if (!targetMember) {
        return NextResponse.json(
          { error: 'User is not a team member' },
          { status: 400 }
        );
      }

      // Cannot change owner's role
      if (targetMember.role === 'OWNER') {
        return NextResponse.json(
          { error: 'Cannot change owner role' },
          { status: 400 }
        );
      }

      // Update role
      await db.teamMember.update({
        where: { teamId_userId: { teamId, userId: targetUserId } },
        data: { role },
      });

      // Log activity
      await db.activityLog.create({
        data: {
          teamId,
          userId: session.user.id,
          type: 'ROLE_CHANGED',
          description: `${session.user.name} changed ${targetMember.user.name}'s role to ${role}`,
        },
      });

      // Create notification
      await db.notification.create({
        data: {
          userId: targetUserId,
          type: 'ROLE_CHANGED',
          title: 'Role Changed',
          message: `Your role in ${access.team?.name || 'the team'} has been changed to ${role}`,
          link: `/teams/${teamId}`,
        },
      });

      return NextResponse.json({ message: 'Role updated successfully' });
    }
  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = params;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    const access = await checkTeamAccess(teamId, session.user.id);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    // If no target user specified, it's a leave action
    if (!targetUserId || targetUserId === session.user.id) {
      // Owner cannot leave
      if (access.membership?.role === 'OWNER') {
        return NextResponse.json(
          { error: 'Owner cannot leave the team. Delete the team or transfer ownership.' },
          { status: 400 }
        );
      }

      // Remove member
      await db.teamMember.delete({
        where: { teamId_userId: { teamId, userId: session.user.id } },
      });

      // Log activity
      await db.activityLog.create({
        data: {
          teamId,
          userId: session.user.id,
          type: 'MEMBER_LEFT',
          description: `${session.user.name} left the team`,
        },
      });

      return NextResponse.json({ message: 'Left team successfully' });
    }

    // Kick member
    const currentRole = access.membership?.role;
    
    // Only OWNER and ADMIN can kick
    if (currentRole !== 'OWNER' && currentRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get target member
    const targetMember = await db.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId: targetUserId },
      },
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: 'User is not a team member' },
        { status: 400 }
      );
    }

    // Cannot kick owner
    if (targetMember.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot kick the team owner' },
        { status: 400 }
      );
    }

    // ADMIN can only kick MEMBER
    if (currentRole === 'ADMIN' && targetMember.role !== 'MEMBER') {
      return NextResponse.json(
        { error: 'Admins can only remove members' },
        { status: 403 }
      );
    }

    // Remove member
    await db.teamMember.delete({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        teamId,
        userId: session.user.id,
        type: 'MEMBER_KICKED',
        description: `${session.user.name} removed ${targetMember.user.name} from the team`,
      },
    });

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
