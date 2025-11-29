/**
 * Profile API Routes
 * 
 * GET /api/profile - Get current user's profile
 * PUT /api/profile - Update current user's profile
 * DELETE /api/profile - Delete current user's account
 */
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { profileUpdateSchema } from '@/lib/validations';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        profileImage: true,
        provider: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input
    const result = profileUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, profileImage } = result.data;

    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        name,
        profileImage: profileImage || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        profileImage: true,
        provider: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    const user = await db.user.findUnique({
      where: { id: session.user.id, deletedAt: null },
      include: {
        ownedTeams: {
          where: { deletedAt: null },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check for owned teams
    if (user.ownedTeams.length > 0) {
      return NextResponse.json(
        { error: 'Please delete owned teams or transfer ownership first' },
        { status: 400 }
      );
    }

    // For credentials users, verify password
    if (user.provider === 'credentials') {
      if (!password) {
        return NextResponse.json(
          { error: 'Password is required' },
          { status: 400 }
        );
      }

      if (!user.password) {
        return NextResponse.json(
          { error: 'Unable to verify password' },
          { status: 400 }
        );
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Incorrect password' },
          { status: 400 }
        );
      }
    }

    // Soft delete user
    await db.user.update({
      where: { id: session.user.id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
