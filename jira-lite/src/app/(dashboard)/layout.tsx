/**
 * Dashboard Layout
 * 
 * Main layout for authenticated pages with sidebar and header.
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Fetch user's teams for sidebar
  const teams = await db.team.findMany({
    where: {
      deletedAt: null,
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar teams={teams} />
      <div className="lg:ml-64 transition-all duration-300">
        <Header user={session.user} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
