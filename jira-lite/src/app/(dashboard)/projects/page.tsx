/**
 * Projects Page
 * 
 * Displays all projects across teams the user belongs to.
 */
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, FolderKanban, Star, Archive, ArrowRight, Layout } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function ProjectsPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  const projects = await db.project.findMany({
    where: {
      deletedAt: null,
      team: {
        deletedAt: null,
        members: {
          some: { userId: session.user.id },
        },
      },
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      owner: {
        select: {
          id: true,
          name: true,
          profileImage: true,
        },
      },
      favorites: {
        where: { userId: session.user.id },
      },
      _count: {
        select: {
          issues: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const activeProjects = projects.filter((p) => !p.isArchived);
  const archivedProjects = projects.filter((p) => p.isArchived);
  const favoriteProjects = projects.filter((p) => p.favorites.length > 0 && !p.isArchived);

  // Sort: favorites first
  activeProjects.sort((a, b) => {
    const aFav = a.favorites.length > 0 ? 1 : 0;
    const bFav = b.favorites.length > 0 ? 1 : 0;
    return bFav - aFav;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Projects
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Manage and track your projects across all teams.
          </p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeProjects.length})
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Star className="mr-1 h-4 w-4" />
            Favorites ({favoriteProjects.length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            <Archive className="mr-1 h-4 w-4" />
            Archived ({archivedProjects.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {activeProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="mb-4 h-12 w-12 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  No projects yet
                </h3>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Create your first project to start tracking issues.
                </p>
                <Link href="/projects/new" className="mt-4">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isFavorite={project.favorites.length > 0}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="mt-6">
          {favoriteProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Star className="mb-4 h-12 w-12 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  No favorite projects
                </h3>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Star your important projects for quick access.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {favoriteProjects.map((project) => (
                <ProjectCard key={project.id} project={project} isFavorite />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-6">
          {archivedProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Archive className="mb-4 h-12 w-12 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  No archived projects
                </h3>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Archived projects will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {archivedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isFavorite={project.favorites.length > 0}
                  isArchived
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProjectCard({
  project,
  isFavorite,
  isArchived,
}: {
  project: {
    id: string;
    name: string;
    description: string | null;
    team: { id: string; name: string };
    _count: { issues: number };
  };
  isFavorite?: boolean;
  isArchived?: boolean;
}) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className={`h-full transition-all hover:border-violet-300 hover:shadow-lg dark:hover:border-violet-700 ${isArchived ? 'opacity-70' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/25">
              <Layout className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              {isFavorite && (
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              )}
              {isArchived && <Badge variant="secondary">Archived</Badge>}
            </div>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white line-clamp-1">
            {project.name}
          </h3>
          {project.description && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              {project.description}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-500">{project.team.name}</span>
            <span className="flex items-center gap-1 text-slate-500">
              <FolderKanban className="h-4 w-4" />
              {project._count.issues} issues
            </span>
          </div>
          <div className="mt-4 flex items-center justify-end">
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
