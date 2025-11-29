/**
 * Project Settings Page
 * 
 * Allows project owners and admins to manage project settings.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Save, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import toast from 'react-hot-toast';

interface Project {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  teamId: string;
  ownerId: string;
  canEdit: boolean;
}

export default function ProjectSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch project');
        }
        const data = await response.json();
        setProject(data);
        setName(data.name || '');
        setDescription(data.description || '');
      } catch (error) {
        console.error('Failed to fetch project:', error);
        toast.error('Failed to load project');
        router.push('/projects');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to update project');
        return;
      }

      setProject(data);
      toast.success('Project updated successfully!');
      router.refresh();
    } catch (error) {
      console.error('Failed to update project:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveToggle = async () => {
    setIsArchiving(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/archive`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to toggle archive status');
        setIsArchiving(false);
        return;
      }

      const newArchiveStatus = !project?.isArchived;
      setProject((prev) => prev ? { ...prev, isArchived: newArchiveStatus } : null);
      
      toast.success(
        newArchiveStatus
          ? 'Project archived successfully'
          : 'Project restored successfully'
      );
      router.refresh();
    } catch (error) {
      console.error('Failed to toggle archive:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to delete project');
        setIsDeleting(false);
        return;
      }

      toast.success('Project deleted successfully');
      router.push('/projects');
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('An unexpected error occurred');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  if (!project.canEdit) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              You don&apos;t have permission to edit this project.
            </p>
            <Link href={`/projects/${projectId}`}>
              <Button variant="outline" className="mt-4">
                Back to Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Project
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Settings</CardTitle>
          <CardDescription>
            Manage your project settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-6">
            <Input
              label="Project Name"
              placeholder="e.g., Website Redesign, Mobile App"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={1}
              maxLength={100}
              disabled={isSaving}
            />

            <Textarea
              label="Description (optional)"
              placeholder="Describe your project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              disabled={isSaving}
              rows={4}
            />

            <div className="flex gap-4">
              <Button type="submit" isLoading={isSaving} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Archive Status</CardTitle>
          <CardDescription>
            {project.isArchived
              ? 'Restore this project to make it active again'
              : 'Archive this project to hide it from active lists'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleArchiveToggle}
            isLoading={isArchiving}
            disabled={isArchiving}
          >
            {project.isArchived ? (
              <>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                {isArchiving ? 'Restoring...' : 'Restore Project'}
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                {isArchiving ? 'Archiving...' : 'Archive Project'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete this project and all its issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  project &quot;{project.name}&quot; and remove all associated issues, labels,
                  and comments from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Project'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

