/**
 * Password Reset API Route
 * 
 * POST /api/auth/reset-password
 * Resets the user's password using a valid token.
 */
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { passwordResetSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const result = passwordResetSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { token, password } = result.data;

    // Find the reset token
    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (resetToken.expires < new Date()) {
      await db.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      return NextResponse.json(
        { error: 'Reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await db.user.findUnique({
      where: { email: resetToken.email, deletedAt: null },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete the reset token
    await db.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    return NextResponse.json({
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
