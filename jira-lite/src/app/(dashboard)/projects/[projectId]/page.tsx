/**
 * Project Detail Page
 * 
 * Shows project details with Kanban board and issue management.
 */
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Settings, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import KanbanBoard from './kanban-board';

interface PageProps {
  params: { projectId: string };
}

export default async function ProjectPage({ params }: PageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  const project = await db.project.findUnique({
    where: { id: params.projectId },
    include: {
      team: {
        include: {
          members: {
            where: { userId: session.user.id },
          },
        },
      },
      owner: {
        select: {
          id: true,
          name: true,
          profileImage: true,
        },
      },
      labels: {
        orderBy: { name: 'asc' },
      },
      favorites: {
        where: { userId: session.user.id },
      },
      issues: {
        where: { deletedAt: null },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
          labels: {
            include: { label: true },
          },
          subtasks: {
            orderBy: { position: 'asc' },
          },
          _count: {
            select: { comments: { where: { deletedAt: null } } },
          },
        },
        orderBy: [{ status: 'asc' }, { position: 'asc' }],
      },
    },
  });

  if (!project || project.deletedAt || !project.team.members.length) {
    notFound();
  }

  const teamMembers = await db.teamMember.findMany({
    where: { teamId: project.teamId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImage: true,
        },
      },
    },
  });

  const isFavorite = project.favorites.length > 0;
  const membership = project.team.members[0];
  const canEdit =
    membership.role === 'OWNER' ||
    membership.role === 'ADMIN' ||
    project.ownerId === session.user.id;

  // Calculate stats
  const stats = {
    total: project.issues.length,
    backlog: project.issues.filter((i) => i.status === 'BACKLOG').length,
    inProgress: project.issues.filter((i) => i.status === 'IN_PROGRESS').length,
    done: project.issues.filter((i) => i.status === 'DONE').length,
  };

  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/projects"
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {project.name}
            </h1>
            {isFavorite && (
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            )}
            {project.isArchived && <Badge variant="secondary">Archived</Badge>}
          </div>
          {project.description && (
            <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-2xl">
              {project.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
            <span>Team: {project.team.name}</span>
            <span>·</span>
            <span>{stats.total} issues</span>
            <span>·</span>
            <span>{completionRate}% complete</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!project.isArchived && (
            <Link href={`/projects/${project.id}/issues/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Issue
              </Button>
            </Link>
          )}
          {canEdit && (
            <Link href={`/projects/${project.id}/settings`}>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats.backlog}
          </p>
          <p className="text-sm text-slate-500">Backlog</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
          <p className="text-sm text-slate-500">In Progress</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-2xl font-bold text-green-600">{stats.done}</p>
          <p className="text-sm text-slate-500">Done</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-2xl font-bold text-violet-600">{completionRate}%</p>
          <p className="text-sm text-slate-500">Complete</p>
        </div>
      </div>

      {/* Kanban Board */}
      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">Kanban Board</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>
        <TabsContent value="board" className="mt-4">
          <KanbanBoard
            projectId={project.id}
            issues={project.issues.map((issue) => ({
              ...issue,
              labels: issue.labels.map((il) => il.label),
              commentCount: issue._count.comments,
            }))}
            labels={project.labels}
            teamMembers={teamMembers.map((m) => m.user)}
            isArchived={project.isArchived}
          />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            {project.issues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-slate-500">No issues yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {project.issues.map((issue) => (
                  <Link
                    key={issue.id}
                    href={`/projects/${project.id}/issues/${issue.id}`}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
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
                      <span className="font-medium text-slate-900 dark:text-white">
                        {issue.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          issue.priority === 'HIGH'
                            ? 'destructive'
                            : issue.priority === 'LOW'
                            ? 'secondary'
                            : 'warning'
                        }
                      >
                        {issue.priority}
                      </Badge>
                      {issue.assignee && (
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-xs text-white"
                          title={issue.assignee.name}
                        >
                          {issue.assignee.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
