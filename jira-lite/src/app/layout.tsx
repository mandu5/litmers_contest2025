/**
 * Root Layout
 * 
 * The main layout wrapper for the entire application.
 * Sets up fonts, metadata, and global providers.
 */
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

export const metadata: Metadata = {
  title: 'Jira Lite - AI-Powered Issue Tracking',
  description: 'A lightweight, AI-powered issue tracking application for teams',
  keywords: ['issue tracking', 'project management', 'kanban', 'AI', 'team collaboration'],
  authors: [{ name: 'Jira Lite Team' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              borderRadius: '0.75rem',
              padding: '1rem',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#f8fafc',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#f8fafc',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
