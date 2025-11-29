/**
 * NextAuth.js v5 Configuration
 * 
 * Handles authentication with:
 * - Email/Password credentials
 * - Google OAuth
 */
import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { db } from './db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  trustHost: true, // Trust Vercel's proxy
  debug: process.env.NODE_ENV === 'development', // Enable debug in development
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: false,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.user.findUnique({
          where: { 
            email,
            deletedAt: null,
          },
        });

        if (!user) {
          throw new Error('Email or password is incorrect');
        }

        if (!user.password) {
          throw new Error('Please use Google login for this account');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          throw new Error('Email or password is incorrect');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.profileImage,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For Google OAuth, create or update user
      if (account?.provider === 'google') {
        const existingUser = await db.user.findUnique({
          where: { email: user.email! },
        });

        if (existingUser) {
          // Update existing user with Google info if needed
          if (existingUser.provider === 'credentials') {
            // User signed up with email/password, don't allow Google login
            return '/login?error=OAuthAccountNotLinked';
          }
          return true;
        }

        // Create new user for Google OAuth
        await db.user.create({
          data: {
            email: user.email!,
            name: user.name || 'User',
            profileImage: user.image,
            provider: 'google',
            emailVerified: new Date(),
          },
        });
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.provider = token.provider as string;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      // Auto-accept pending team invites for this user
      // Users will still see invites in their notifications
      if (user.email) {
        // Note: Could auto-process invites here if desired
      }
    },
  },
});

// Extend session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      provider?: string;
    };
  }
  
  interface JWT {
    id: string;
    provider?: string;
  }
}
