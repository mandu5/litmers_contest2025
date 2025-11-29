/**
 * Team Invites API Routes
 * 
 * GET /api/teams/[teamId]/invites - Get pending invites
 * POST /api/teams/[teamId]/invites - Create new invite
 * DELETE /api/teams/[teamId]/invites - Cancel invite
 */
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { inviteMemberSchema } from '@/lib/validations';
import { sendTeamInviteEmail } from '@/lib/email';

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
      user: {
        select: { name: true },
      },
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
    const access = await checkTeamAccess(teamId, session.user.id, ['OWNER', 'ADMIN']);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const invites = await db.teamInvite.findMany({
      where: {
        teamId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(invites);
  } catch (error) {
    console.error('Get invites error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = params;
    const access = await checkTeamAccess(teamId, session.user.id, ['OWNER', 'ADMIN']);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const body = await request.json();
    
    // Validate input
    const result = inviteMemberSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Check if user is already a member
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const existingMember = await db.teamMember.findUnique({
        where: {
          teamId_userId: { teamId, userId: existingUser.id },
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a team member' },
          { status: 400 }
        );
      }
    }

    // Check for existing pending invite
    const existingInvite = await db.teamInvite.findFirst({
      where: {
        teamId,
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      // Update expiration date (resend)
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      await db.teamInvite.update({
        where: { id: existingInvite.id },
        data: { expiresAt: newExpiresAt },
      });

      // Resend email
      await sendTeamInviteEmail(
        email,
        access.team?.name || 'Team',
        access.membership?.user.name || session.user.name || 'Team Admin',
        existingInvite.token
      );

      return NextResponse.json({ message: 'Invite resent successfully' });
    }

    // Create new invite
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await db.teamInvite.create({
      data: {
        teamId,
        email,
        invitedById: session.user.id,
        token,
        expiresAt,
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send invitation email
    await sendTeamInviteEmail(
      email,
      access.team?.name || 'Team',
      access.membership?.user.name || session.user.name || 'Team Admin',
      token
    );

    // If user exists, create notification
    if (existingUser) {
      await db.notification.create({
        data: {
          userId: existingUser.id,
          type: 'TEAM_INVITE',
          title: 'Team Invitation',
          message: `You've been invited to join ${access.team?.name || 'a team'}`,
          link: `/invite/${token}`,
        },
      });
    }

    return NextResponse.json(invite, { status: 201 });
  } catch (error) {
    console.error('Create invite error:', error);
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
    const inviteId = searchParams.get('inviteId');

    if (!inviteId) {
      return NextResponse.json(
        { error: 'Invite ID is required' },
        { status: 400 }
      );
    }

    const access = await checkTeamAccess(teamId, session.user.id, ['OWNER', 'ADMIN']);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    // Find and delete the invite
    const invite = await db.teamInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.teamId !== teamId) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      );
    }

    await db.teamInvite.delete({
      where: { id: inviteId },
    });

    return NextResponse.json({ message: 'Invite cancelled successfully' });
  } catch (error) {
    console.error('Delete invite error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
