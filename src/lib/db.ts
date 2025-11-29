/**
 * Prisma Database Client Singleton
 * 
 * This ensures we don't create multiple Prisma clients during hot-reload
 * in development mode. In production, a single client instance is used.
 */
import { PrismaClient } from '@prisma/client';

// Validate DATABASE_URL before creating PrismaClient
if (!process.env.DATABASE_URL) {
  console.error('❌ CRITICAL: DATABASE_URL environment variable is not set.');
  console.error('Please add DATABASE_URL to your Vercel project settings:');
  console.error('1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables');
  console.error('2. Add DATABASE_URL with your PostgreSQL connection string');
  console.error('   Format: postgresql://user:password@host:port/database?pgbouncer=true');
  // Don't throw here - let Prisma handle it with a more descriptive error
} else {
  // Check if using wrong port (5432 instead of 6543 for Connection Pooler)
  const dbUrl = process.env.DATABASE_URL;
  if (process.env.NODE_ENV === 'production' && dbUrl.includes(':5432')) {
    console.error('⚠️ WARNING: DATABASE_URL is using port 5432 (direct connection).');
    console.error('For Vercel/serverless, you must use Connection Pooler (port 6543).');
    console.error('Current URL:', dbUrl.replace(/:[^:@]+@/, ':****@')); // Hide password
    console.error('');
    console.error('Fix steps:');
    console.error('1. Go to Supabase Dashboard → Settings → Database');
    console.error('2. Select "Connection pooling" tab (NOT "Connection string")');
    console.error('3. Select "Session mode"');
    console.error('4. Copy the URI (should have port 6543)');
    console.error('5. Update DATABASE_URL in Vercel to use port 6543');
    console.error('6. Format: postgresql://postgres.PROJECT_ID:password@...pooler.supabase.com:6543/postgres?pgbouncer=true');
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Helper function to ensure DATABASE_URL has pgbouncer=true parameter
function ensurePgBouncerConfig(dbUrl: string): string {
  try {
    const url = new URL(dbUrl);
    // Add pgbouncer=true if not present
    if (!url.searchParams.has('pgbouncer')) {
      url.searchParams.set('pgbouncer', 'true');
    }
    // Ensure connection_limit is set for serverless
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '1');
    }
    return url.toString();
  } catch {
    // If URL parsing fails, return original
    return dbUrl;
  }
}

const dbUrl = process.env.DATABASE_URL 
  ? ensurePgBouncerConfig(process.env.DATABASE_URL)
  : process.env.DATABASE_URL;

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

export default db;
