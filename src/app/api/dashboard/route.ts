/**
 * Dashboard API Route
 * 
 * GET /api/dashboard - Get dashboard data for the current user
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'personal';
    const teamId = searchParams.get('teamId');
    const projectId = searchParams.get('projectId');
    const period = searchParams.get('period') || '7'; // days

    const periodDays = parseInt(period, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    if (type === 'personal') {
      // Get user's assigned issues
      const [
        assignedIssues,
        recentComments,
        teams,
        issuesDueSoon,
        issuesDueToday,
      ] = await Promise.all([
        // Assigned issues grouped by status
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
        // Recent comments
        db.comment.findMany({
          where: {
            authorId: session.user.id,
            deletedAt: null,
          },
          include: {
            issue: {
              select: {
                id: true,
                title: true,
                projectId: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
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
              },
            },
          },
        }),
        // Issues due within 7 days
        db.issue.findMany({
          where: {
            assigneeId: session.user.id,
            deletedAt: null,
            status: { not: 'DONE' },
            dueDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { dueDate: 'asc' },
          take: 5,
        }),
        // Issues due today
        db.issue.count({
          where: {
            assigneeId: session.user.id,
            deletedAt: null,
            status: { not: 'DONE' },
            dueDate: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        }),
      ]);

      // Group issues by status
      const issuesByStatus = {
        BACKLOG: assignedIssues.filter((i) => i.status === 'BACKLOG'),
        IN_PROGRESS: assignedIssues.filter((i) => i.status === 'IN_PROGRESS'),
        DONE: assignedIssues.filter((i) => i.status === 'DONE'),
      };

      return NextResponse.json({
        type: 'personal',
        issuesByStatus,
        totalAssigned: assignedIssues.length,
        issuesDueSoon,
        issuesDueToday,
        recentComments,
        teams: teams.map((t) => ({
          ...t,
          projectCount: t._count.projects,
        })),
      });
    }

    if (type === 'project' && projectId) {
      // Project dashboard
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          team: {
            include: {
              members: {
                where: { userId: session.user.id },
              },
            },
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
            },
          },
        },
      });

      if (!project || project.deletedAt || !project.team.members.length) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      // Issue stats
      const stats = {
        total: project.issues.length,
        byStatus: {
          BACKLOG: project.issues.filter((i) => i.status === 'BACKLOG').length,
          IN_PROGRESS: project.issues.filter((i) => i.status === 'IN_PROGRESS').length,
          DONE: project.issues.filter((i) => i.status === 'DONE').length,
        },
        byPriority: {
          HIGH: project.issues.filter((i) => i.priority === 'HIGH').length,
          MEDIUM: project.issues.filter((i) => i.priority === 'MEDIUM').length,
          LOW: project.issues.filter((i) => i.priority === 'LOW').length,
        },
        completionRate: project.issues.length > 0
          ? Math.round(
              (project.issues.filter((i) => i.status === 'DONE').length /
                project.issues.length) *
                100
            )
          : 0,
      };

      // Recent issues
      const recentIssues = project.issues
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      // Issues due soon
      const dueSoon = project.issues
        .filter(
          (i) =>
            i.status !== 'DONE' &&
            i.dueDate &&
            new Date(i.dueDate) >= new Date() &&
            new Date(i.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        )
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
        .slice(0, 5);

      return NextResponse.json({
        type: 'project',
        stats,
        recentIssues,
        dueSoon,
      });
    }

    if (type === 'team' && teamId) {
      // Team statistics
      const team = await db.team.findUnique({
        where: { id: teamId },
        include: {
          members: {
            where: { userId: session.user.id },
          },
        },
      });

      if (!team || team.deletedAt || !team.members.length) {
        return NextResponse.json(
          { error: 'Team not found' },
          { status: 404 }
        );
      }

      // Get all team projects and issues
      const projects = await db.project.findMany({
        where: {
          teamId,
          deletedAt: null,
        },
        include: {
          issues: {
            where: { deletedAt: null },
          },
        },
      });

      const allIssues = projects.flatMap((p) => p.issues);

      // Get team members with issue counts
      const teamMembers = await db.teamMember.findMany({
        where: { teamId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
        },
      });

      const memberStats = await Promise.all(
        teamMembers.map(async (member) => {
          const [assigned, completed] = await Promise.all([
            db.issue.count({
              where: {
                assigneeId: member.userId,
                project: { teamId },
                deletedAt: null,
              },
            }),
            db.issue.count({
              where: {
                assigneeId: member.userId,
                project: { teamId },
                status: 'DONE',
                deletedAt: null,
              },
            }),
          ]);

          return {
            user: member.user,
            role: member.role,
            assigned,
            completed,
          };
        })
      );

      // Issue trends
      const issueCreationByDay = await db.issue.groupBy({
        by: ['createdAt'],
        where: {
          project: { teamId },
          deletedAt: null,
          createdAt: { gte: startDate },
        },
        _count: true,
      });

      // Project stats
      const projectStats = projects.map((p) => ({
        id: p.id,
        name: p.name,
        total: p.issues.length,
        done: p.issues.filter((i) => i.status === 'DONE').length,
        inProgress: p.issues.filter((i) => i.status === 'IN_PROGRESS').length,
        backlog: p.issues.filter((i) => i.status === 'BACKLOG').length,
      }));

      return NextResponse.json({
        type: 'team',
        stats: {
          totalIssues: allIssues.length,
          completedIssues: allIssues.filter((i) => i.status === 'DONE').length,
          inProgressIssues: allIssues.filter((i) => i.status === 'IN_PROGRESS').length,
          projectCount: projects.length,
          memberCount: teamMembers.length,
        },
        memberStats,
        projectStats,
        issueCreationByDay,
      });
    }

    return NextResponse.json(
      { error: 'Invalid dashboard type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
