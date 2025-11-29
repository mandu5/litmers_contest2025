/**
 * NextAuth.js Route Handler
 * 
 * Handles all authentication API routes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { handlers } from '@/lib/auth';

// Validate environment variables
if (!process.env.AUTH_SECRET) {
  console.error('⚠️ CRITICAL: AUTH_SECRET is not set in environment variables.');
  console.error('Please add AUTH_SECRET to your Vercel project settings:');
  console.error('1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables');
  console.error('2. Add AUTH_SECRET with value from: openssl rand -base64 32');
}

export async function GET(request: NextRequest) {
  try {
    return await handlers.GET(request);
  } catch (error: unknown) {
    console.error('❌ NextAuth GET error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Environment check:', {
      hasAUTH_SECRET: !!process.env.AUTH_SECRET,
      hasNEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      hasDATABASE_URL: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
      vercelUrl: process.env.VERCEL_URL,
    });
    
    const url = new URL('/login', request.url);
    url.searchParams.set('error', 'Configuration');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    url.searchParams.set('message', encodeURIComponent(errorMessage));
    
    return NextResponse.redirect(url);
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handlers.POST(request);
  } catch (error: unknown) {
    console.error('❌ NextAuth POST error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Environment check:', {
      hasAUTH_SECRET: !!process.env.AUTH_SECRET,
      hasNEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      hasDATABASE_URL: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
      vercelUrl: process.env.VERCEL_URL,
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Authentication configuration error';
    
    // Provide more specific error message
    let userMessage = errorMessage;
    if (!process.env.AUTH_SECRET) {
      userMessage = 'AUTH_SECRET environment variable is not set. Please add it to Vercel environment variables.';
    } else if (!process.env.DATABASE_URL) {
      userMessage = 'DATABASE_URL environment variable is not set. Please check your database configuration.';
    } else if (errorMessage.includes('Prisma') || errorMessage.includes('database')) {
      userMessage = 'Database connection error. Please check your DATABASE_URL configuration.';
    }
    
    return NextResponse.json(
      { 
        error: 'Configuration',
        message: userMessage,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
