/**
 * Password Reset Request API Route
 * 
 * POST /api/auth/request-reset
 * Sends a password reset email to the user.
 */
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { passwordResetRequestSchema } from '@/lib/validations';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const result = passwordResetRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email, deletedAt: null },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: 'If an account exists with this email, a reset link will be sent.',
      });
    }

    // Check if user signed up with Google
    if (user.provider === 'google') {
      return NextResponse.json({
        message: 'If an account exists with this email, a reset link will be sent.',
      });
    }

    // Delete any existing reset tokens for this email
    await db.passwordResetToken.deleteMany({
      where: { email },
    });

    // Create new reset token (expires in 1 hour)
    const token = nanoid(32);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.passwordResetToken.create({
      data: {
        email,
        token,
        expires,
      },
    });

    // Send reset email
    const emailResult = await sendPasswordResetEmail(email, token);
    
    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error);
      // Still return success to not leak information
    }

    return NextResponse.json({
      message: 'If an account exists with this email, a reset link will be sent.',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
