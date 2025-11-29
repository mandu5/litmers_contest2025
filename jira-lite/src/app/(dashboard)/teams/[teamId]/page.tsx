/**
 * Team Detail Page
 * 
 * Displays team information, members, and activity log.
 */
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Calendar, Mail, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, getInitials } from '@/lib/utils';
import TeamDetailClient from './team-detail-client';

interface PageProps {
  params: { teamId: string };
}

export default async function TeamDetailPage({ params }: PageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  // Check team access
  const membership = await db.teamMember.findUnique({
    where: {
      teamId_userId: { teamId: params.teamId, userId: session.user.id },
    },
    include: {
      team: {
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });

  if (!membership || membership.team.deletedAt) {
    notFound();
  }

  // Fetch team with all related data
  const team = await db.team.findUnique({
    where: { id: params.teamId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImage: true,
        },
      },
      members: {
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
        orderBy: [
          { role: 'asc' },
          { joinedAt: 'asc' },
        ],
      },
      projects: {
        where: { deletedAt: null },
        include: {
          _count: {
            select: {
              issues: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      invites: {
        where: {
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!team) {
    notFound();
  }

  // Fetch activity log
  const activities = await db.activityLog.findMany({
    where: { teamId: params.teamId },
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
  });

  const userRole = membership.role;
  const canEdit = userRole === 'OWNER' || userRole === 'ADMIN';
  const canDelete = userRole === 'OWNER';

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <div>
        <Link
          href="/teams"
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Teams
        </Link>
      </div>

      {/* Team Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{team.name}</CardTitle>
              <CardDescription className="mt-1">
                Created {formatDate(team.createdAt)} by {team.owner.name}
              </CardDescription>
            </div>
            {userRole && (
              <Badge variant={userRole === 'OWNER' ? 'default' : 'outline'}>
                {userRole}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Members:</span>
              <span className="text-sm font-medium">{team.members.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Projects:</span>
              <span className="text-sm font-medium">{team.projects.length}</span>
            </div>
            {team.invites.length > 0 && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Pending Invites:</span>
                <span className="text-sm font-medium">{team.invites.length}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="mr-2 h-4 w-4" />
            Members ({team.members.length})
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Calendar className="mr-2 h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage team members and their roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {team.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.user.profileImage || undefined} />
                        <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {member.user.name}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {member.user.email}
                        </p>
                        <p className="text-xs text-slate-500">
                          Joined {formatDate(member.joinedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.role === 'OWNER' ? 'default' : 'outline'}>
                        <Shield className="mr-1 h-3 w-3" />
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <TeamDetailClient teamId={params.teamId} initialActivities={activities} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

