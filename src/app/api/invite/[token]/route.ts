/**
 * Invite Token API Routes
 * 
 * GET /api/invite/[token] - Get invite details
 * POST /api/invite/[token] - Accept invite
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const invite = await db.teamInvite.findUnique({
      where: { token },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      );
    }

    if (invite.acceptedAt) {
      return NextResponse.json(
        { error: 'Invite has already been accepted' },
        { status: 400 }
      );
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invite has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      id: invite.id,
      email: invite.email,
      team: invite.team,
      invitedBy: invite.invitedBy,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    console.error('Get invite error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = params;

    const invite = await db.teamInvite.findUnique({
      where: { token },
      include: {
        team: true,
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      );
    }

    if (invite.acceptedAt) {
      return NextResponse.json(
        { error: 'Invite has already been accepted' },
        { status: 400 }
      );
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invite has expired' },
        { status: 400 }
      );
    }

    // Check if the logged-in user's email matches the invite
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.email !== invite.email) {
      return NextResponse.json(
        { error: 'This invite was sent to a different email address' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMember = await db.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: invite.teamId, userId: session.user.id },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this team' },
        { status: 400 }
      );
    }

    // Accept invite and add member
    await db.$transaction([
      // Mark invite as accepted
      db.teamInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
      // Add team member
      db.teamMember.create({
        data: {
          teamId: invite.teamId,
          userId: session.user.id,
          role: 'MEMBER',
        },
      }),
      // Log activity
      db.activityLog.create({
        data: {
          teamId: invite.teamId,
          userId: session.user.id,
          type: 'MEMBER_JOINED',
          description: `${session.user.name} joined the team`,
        },
      }),
    ]);

    return NextResponse.json({
      message: 'Successfully joined the team',
      teamId: invite.teamId,
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
