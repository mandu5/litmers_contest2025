/**
 * Issue Detail Page
 * 
 * Displays full issue details with editing, comments, subtasks, and history.
 */
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import IssueDetailClient from './issue-detail-client';

interface PageProps {
  params: { projectId: string; issueId: string };
}

export default async function IssueDetailPage({ params }: PageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  // Fetch issue with all related data
  const issue = await db.issue.findUnique({
    where: { id: params.issueId },
    include: {
      project: {
        include: {
          team: {
            include: {
              members: {
                where: { userId: session.user.id },
              },
            },
          },
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImage: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImage: true,
        },
      },
      labels: {
        include: {
          label: true,
        },
      },
      subtasks: {
        orderBy: { position: 'asc' },
      },
      comments: {
        where: { deletedAt: null },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      history: {
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
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });

  // Check access
  if (
    !issue ||
    issue.deletedAt ||
    issue.project.deletedAt ||
    issue.project.team.deletedAt ||
    !issue.project.team.members.length
  ) {
    notFound();
  }

  // Verify projectId matches
  if (issue.project.id !== params.projectId) {
    redirect(`/projects/${issue.project.id}/issues/${params.issueId}`);
  }

  // Check permissions
  const canEdit = !issue.project.isArchived;
  const canDelete =
    issue.project.team.members[0].role === 'OWNER' ||
    issue.project.team.members[0].role === 'ADMIN' ||
    issue.project.ownerId === session.user.id ||
    issue.creatorId === session.user.id;

  // Get team members for assignee dropdown
  const teamMembers = await db.teamMember.findMany({
    where: { teamId: issue.project.teamId },
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

  // Get project labels
  const labels = await db.label.findMany({
    where: { projectId: params.projectId },
    orderBy: { name: 'asc' },
  });

  // Transform data for client component
  const issueData = {
    ...issue,
    dueDate: issue.dueDate ? issue.dueDate.toISOString() : null,
    createdAt: issue.createdAt.toISOString(),
    labels: issue.labels.map((il) => il.label),
    history: issue.history.map((h) => ({
      ...h,
      createdAt: h.createdAt.toISOString(),
    })),
    comments: issue.comments.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    subtasks: issue.subtasks.map((s) => ({
      id: s.id,
      title: s.title,
      completed: s.isCompleted,
      position: s.position,
    })),
    canEdit,
    canDelete,
    teamMembers: teamMembers.map((m) => m.user),
    projectLabels: labels,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <div>
        <Link
          href={`/projects/${params.projectId}`}
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Project
        </Link>
      </div>

      <IssueDetailClient issue={issueData} projectId={params.projectId} userId={session.user.id} />
    </div>
  );
}

