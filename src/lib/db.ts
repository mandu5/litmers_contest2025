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
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

export default db;
