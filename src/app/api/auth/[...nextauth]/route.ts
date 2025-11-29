/**
 * NextAuth.js Route Handler
 * 
 * Handles all authentication API routes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { handlers } from '@/lib/auth';

// Wrap handlers with error handling
const { GET: originalGET, POST: originalPOST } = handlers;

export async function GET(request: NextRequest) {
  try {
    return await originalGET(request);
  } catch (error: unknown) {
    console.error('NextAuth GET error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Authentication configuration error';
    
    // Check if it's a configuration error
    if (errorMessage.includes('AUTH_SECRET') || errorMessage.includes('configuration')) {
      return NextResponse.json(
        { 
          error: 'Configuration',
          message: 'Authentication configuration error. Please check environment variables (AUTH_SECRET, NEXTAUTH_URL).' 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Configuration', message: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await originalPOST(request);
  } catch (error: unknown) {
    console.error('NextAuth POST error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Authentication configuration error';
    
    // Check if it's a configuration error
    if (errorMessage.includes('AUTH_SECRET') || errorMessage.includes('configuration')) {
      return NextResponse.json(
        { 
          error: 'Configuration',
          message: 'Authentication configuration error. Please check environment variables (AUTH_SECRET, NEXTAUTH_URL).' 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Configuration', message: errorMessage },
      { status: 500 }
    );
  }
}
