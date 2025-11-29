/**
 * Landing Page
 * 
 * The public-facing homepage with feature highlights and CTAs.
 */
import Link from 'next/link';
import { 
  Sparkles, 
  Layout, 
  Users, 
  Zap, 
  Shield, 
  BarChart3,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Jira Lite</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-700 hover:to-purple-700 hover:shadow-xl hover:shadow-violet-500/30"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-hero-pattern opacity-30" />
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-500/20 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-purple-500/20 blur-[100px]" />
        
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300 mb-8">
            <Sparkles className="h-4 w-4" />
            AI-Powered Issue Tracking
          </div>
          
          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Track Issues.
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              Ship Faster.
            </span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            A lightweight, AI-powered issue tracking system designed for modern teams.
            Kanban boards, smart suggestions, and seamless collaboration — all in one place.
          </p>
          
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-violet-500/25 transition-all hover:from-violet-700 hover:to-purple-700 hover:shadow-2xl hover:shadow-violet-500/30"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { label: 'Active Teams', value: '1,000+' },
              { label: 'Issues Tracked', value: '50K+' },
              { label: 'AI Suggestions', value: '10K+' },
              { label: 'Time Saved', value: '30%' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="mt-1 text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Everything you need to ship faster
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Powerful features designed to streamline your workflow
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Layout,
                title: 'Kanban Boards',
                description: 'Visualize your workflow with drag-and-drop kanban boards. Track progress at a glance.',
              },
              {
                icon: Sparkles,
                title: 'AI-Powered',
                description: 'Smart summaries, solution suggestions, and automatic label recommendations powered by AI.',
              },
              {
                icon: Users,
                title: 'Team Collaboration',
                description: 'Invite team members, assign issues, and collaborate in real-time with role-based access.',
              },
              {
                icon: Zap,
                title: 'Lightning Fast',
                description: 'Built for speed with instant search, quick actions, and keyboard shortcuts.',
              },
              {
                icon: Shield,
                title: 'Secure by Default',
                description: 'Enterprise-grade security with role-based permissions and data encryption.',
              },
              {
                icon: BarChart3,
                title: 'Insights & Analytics',
                description: 'Track team performance with detailed dashboards and customizable reports.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all hover:border-violet-500/50 hover:bg-white/10"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-purple-600 p-12 text-center shadow-2xl shadow-violet-500/25">
            <div className="absolute inset-0 bg-hero-pattern opacity-20" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Ready to get started?
              </h2>
              <p className="mt-4 text-lg text-violet-100">
                Join thousands of teams already using Jira Lite to ship faster.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/signup"
                  className="flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-violet-600 shadow-xl transition-all hover:bg-violet-50"
                >
                  <CheckCircle className="h-5 w-5" />
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-white">Jira Lite</span>
            </div>
            <p className="text-sm text-slate-400">
              © 2025 Jira Lite. Built for Litmers Vibe Coding Contest.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
