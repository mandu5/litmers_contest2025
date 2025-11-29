/**
 * Dashboard Page
 * 
 * Main dashboard showing user's personal overview and statistics.
 */
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  FolderKanban,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, getPriorityBgColor, isDueToday, isOverdue } from '@/lib/utils';

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  // Fetch dashboard data
  const [teams, assignedIssues] = await Promise.all([
    // Teams with project counts
    db.team.findMany({
      where: {
        deletedAt: null,
        members: {
          some: { userId: session.user.id },
        },
      },
      include: {
        _count: {
          select: {
            projects: { where: { deletedAt: null } },
            members: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    // Assigned issues
    db.issue.findMany({
      where: {
        assigneeId: session.user.id,
        deletedAt: null,
        project: { deletedAt: null },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            teamId: true,
          },
        },
        labels: {
          include: { label: true },
        },
      },
      orderBy: [
        { priority: 'asc' },
        { dueDate: 'asc' },
      ],
    }),
  ]);

  // Calculate stats
  const stats = {
    totalTeams: teams.length,
    totalAssigned: assignedIssues.length,
    inProgress: assignedIssues.filter((i) => i.status === 'IN_PROGRESS').length,
    completed: assignedIssues.filter((i) => i.status === 'DONE').length,
    dueToday: assignedIssues.filter((i) => i.dueDate && isDueToday(i.dueDate)).length,
    overdue: assignedIssues.filter((i) => i.dueDate && i.status !== 'DONE' && isOverdue(i.dueDate)).length,
  };

  const issuesDueSoon = assignedIssues
    .filter((i) => i.status !== 'DONE' && i.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Welcome back, {session.user.name?.split(' ')[0]}! 👋
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Here&apos;s what&apos;s happening with your projects today.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/teams/new">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              New Team
            </Button>
          </Link>
          <Link href="/projects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/20">
              <Users className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalTeams}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Teams</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <FolderKanban className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalAssigned}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Assigned Issues</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/20">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">In Progress</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* My Issues */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              My Issues
            </CardTitle>
            <Link href="/projects">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {assignedIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                <FolderKanban className="mb-2 h-12 w-12 opacity-50" />
                <p>No issues assigned to you yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedIssues.slice(0, 5).map((issue) => (
                  <Link
                    key={issue.id}
                    href={`/projects/${issue.projectId}/issues/${issue.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3 transition-all hover:border-violet-300 hover:bg-violet-50/50 dark:border-slate-800 dark:hover:border-violet-700 dark:hover:bg-violet-900/10"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          issue.status === 'DONE'
                            ? 'success'
                            : issue.status === 'IN_PROGRESS'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {issue.status.replace('_', ' ')}
                      </Badge>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {issue.title}
                        </p>
                        <p className="text-sm text-slate-500">{issue.project.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityBgColor(issue.priority)}>
                        {issue.priority}
                      </Badge>
                      {issue.dueDate && (
                        <span
                          className={`text-xs ${
                            isOverdue(issue.dueDate) && issue.status !== 'DONE'
                              ? 'text-red-500'
                              : isDueToday(issue.dueDate)
                              ? 'text-amber-500'
                              : 'text-slate-500'
                          }`}
                        >
                          {formatDate(issue.dueDate)}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Due Soon */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                Due Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              {issuesDueSoon.length === 0 ? (
                <p className="text-sm text-slate-500">No upcoming deadlines</p>
              ) : (
                <div className="space-y-3">
                  {issuesDueSoon.map((issue) => (
                    <Link
                      key={issue.id}
                      href={`/projects/${issue.projectId}/issues/${issue.id}`}
                      className="block"
                    >
                      <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">
                        {issue.title}
                      </p>
                      <p
                        className={`text-xs ${
                          isOverdue(issue.dueDate)
                            ? 'text-red-500'
                            : isDueToday(issue.dueDate)
                            ? 'text-amber-500'
                            : 'text-slate-500'
                        }`}
                      >
                        {isOverdue(issue.dueDate)
                          ? 'Overdue'
                          : isDueToday(issue.dueDate)
                          ? 'Due Today'
                          : `Due ${formatDate(issue.dueDate)}`}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Teams */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My Teams</CardTitle>
              <Link href="/teams">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-3">No teams yet</p>
                  <Link href="/teams/new">
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Team
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {teams.slice(0, 3).map((team) => (
                    <Link
                      key={team.id}
                      href={`/teams/${team.id}`}
                      className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold">
                          {team.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {team.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {team._count.members} members · {team._count.projects} projects
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
