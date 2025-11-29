/**
 * Email Service using Resend
 * 
 * Handles all email sending functionality including:
 * - Password reset emails
 * - Team invitation emails
 * - Notification emails
 */
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'Jira Lite <noreply@jira-lite.app>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Sends a password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset Your Password - Jira Lite',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Password Reset</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #4b5563;">Hi there,</p>
              <p style="font-size: 16px; color: #4b5563;">We received a request to reset your password for your Jira Lite account. Click the button below to create a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">Reset Password</a>
              </div>
              <p style="font-size: 14px; color: #6b7280;">This link will expire in <strong>1 hour</strong>.</p>
              <p style="font-size: 14px; color: #6b7280;">If you didn't request a password reset, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                Can't click the button? Copy and paste this URL into your browser:<br>
                <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
              </p>
            </div>
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px;">
              © ${new Date().getFullYear()} Jira Lite. All rights reserved.
            </p>
          </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    };
  }
}

/**
 * Sends a team invitation email
 */
export async function sendTeamInviteEmail(
  email: string,
  teamName: string,
  inviterName: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const inviteUrl = `${APP_URL}/invite/${token}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `You're invited to join ${teamName} on Jira Lite`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Team Invitation</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Team Invitation</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #4b5563;">Hi there,</p>
              <p style="font-size: 16px; color: #4b5563;"><strong>${inviterName}</strong> has invited you to join <strong>${teamName}</strong> on Jira Lite!</p>
              <p style="font-size: 16px; color: #4b5563;">Jira Lite is an AI-powered issue tracking application that helps teams collaborate and manage projects efficiently.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">Accept Invitation</a>
              </div>
              <p style="font-size: 14px; color: #6b7280;">This invitation will expire in <strong>7 days</strong>.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                Can't click the button? Copy and paste this URL into your browser:<br>
                <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
              </p>
            </div>
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px;">
              © ${new Date().getFullYear()} Jira Lite. All rights reserved.
            </p>
          </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send team invite email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    };
  }
}

/**
 * Sends a notification email (for due dates, assignments, etc.)
 */
export async function sendNotificationEmail(
  email: string,
  subject: string,
  title: string,
  message: string,
  actionUrl?: string,
  actionText?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `${subject} - Jira Lite`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📢 ${title}</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #4b5563;">${message}</p>
              ${actionUrl && actionText ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${actionUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">${actionText}</a>
                </div>
              ` : ''}
            </div>
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px;">
              © ${new Date().getFullYear()} Jira Lite. All rights reserved.
            </p>
          </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send notification email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    };
  }
}
