/**
 * Teams Page
 * 
 * Displays all teams the user belongs to.
 */
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Users, FolderKanban, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function TeamsPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  const teams = await db.team.findMany({
    where: {
      deletedAt: null,
      members: {
        some: { userId: session.user.id },
      },
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          profileImage: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
        },
        take: 5,
      },
      _count: {
        select: {
          projects: { where: { deletedAt: null } },
          members: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Teams
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Manage your teams and collaborate with others.
          </p>
        </div>
        <Link href="/teams/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Team
          </Button>
        </Link>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-4 h-12 w-12 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              No teams yet
            </h3>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Create your first team to get started.
            </p>
            <Link href="/teams/new" className="mt-4">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const userMembership = team.members.find(
              (m) => m.userId === session.user.id
            );
            return (
              <Link key={team.id} href={`/teams/${team.id}`}>
                <Card className="h-full transition-all hover:border-violet-300 hover:shadow-lg dark:hover:border-violet-700">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-xl font-bold text-white shadow-lg shadow-violet-500/25">
                        {team.name.charAt(0)}
                      </div>
                      <Badge variant="outline">
                        {userMembership?.role || 'MEMBER'}
                      </Badge>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                      {team.name}
                    </h3>
                    <div className="mt-4 flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {team._count.members}
                      </span>
                      <span className="flex items-center gap-1">
                        <FolderKanban className="h-4 w-4" />
                        {team._count.projects} projects
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {team.members.slice(0, 4).map((member) => (
                          <div
                            key={member.userId}
                            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-violet-400 to-purple-500 text-xs font-medium text-white dark:border-slate-900"
                            title={member.user.name}
                          >
                            {member.user.name.charAt(0)}
                          </div>
                        ))}
                        {team._count.members > 4 && (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-medium text-slate-600 dark:border-slate-900 dark:bg-slate-800 dark:text-slate-400">
                            +{team._count.members - 4}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
