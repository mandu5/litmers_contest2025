/**
 * Auth Layout
 * 
 * Layout wrapper for authentication pages (login, signup, reset password).
 * Features a split-screen design with branding on one side.
 */
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-12">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Jira Lite</span>
          </Link>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white">
            AI-Powered Issue Tracking
            <br />
            for Modern Teams
          </h1>
          <p className="text-lg text-violet-100">
            Track issues, collaborate with your team, and ship faster with
            intelligent AI suggestions and a beautiful kanban board.
          </p>
          
          <div className="flex items-center gap-4 pt-6">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-10 w-10 rounded-full border-2 border-violet-600 bg-gradient-to-br from-violet-400 to-purple-500"
                />
              ))}
            </div>
            <p className="text-sm text-violet-100">
              <span className="font-semibold text-white">1,000+</span> teams already using Jira Lite
            </p>
          </div>
        </div>
        
        <p className="text-sm text-violet-200">
          © 2025 Jira Lite. Built for Litmers Vibe Coding Contest.
        </p>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center bg-slate-50 dark:bg-slate-900">
        <div className="mx-auto w-full max-w-md px-8">
          {/* Mobile Logo */}
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">Jira Lite</span>
            </Link>
          </div>
          
          {children}
        </div>
      </div>
    </div>
  );
}
