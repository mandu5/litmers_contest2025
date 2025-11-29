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
    console.error('NextAuth GET error:', error);
    const url = new URL('/login', request.url);
    url.searchParams.set('error', 'Configuration');
    
    if (!process.env.AUTH_SECRET) {
      url.searchParams.set('message', 'AUTH_SECRET environment variable is not set');
    }
    
    return NextResponse.redirect(url);
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handlers.POST(request);
  } catch (error: unknown) {
    console.error('NextAuth POST error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Authentication configuration error';
    
    return NextResponse.json(
      { 
        error: 'Configuration',
        message: !process.env.AUTH_SECRET
          ? 'AUTH_SECRET environment variable is not set. Please add it to Vercel environment variables.'
          : errorMessage
      },
      { status: 500 }
    );
  }
}
