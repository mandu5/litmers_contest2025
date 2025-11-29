/**
 * Create Issue Page
 * 
 * Allows users to create a new issue within a project.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

interface Label {
  id: string;
  name: string;
  color: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
}

interface Project {
  id: string;
  name: string;
  teamId: string;
  isArchived: boolean;
}

export default function NewIssuePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch project, labels, and team members
        const [projectRes, labelsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/labels`),
        ]);

        if (!projectRes.ok || !labelsRes.ok) {
          toast.error('Failed to load project data');
          router.push('/projects');
          return;
        }

        const projectData = await projectRes.json();
        const labelsData = await labelsRes.json();

        setProject(projectData);
        setLabels(labelsData);

        // Fetch team members from project's team
        if (projectData.team?.members) {
          const members = projectData.team.members.map((m: { user: TeamMember }) => m.user);
          setTeamMembers(members);
        } else if (projectData.teamId) {
          // Fallback: fetch team members by teamId
          const teamRes = await fetch(`/api/teams/${projectData.teamId}/members`);
          if (teamRes.ok) {
            const membersData = await teamRes.json();
            const members = membersData.members?.map((m: { user: TeamMember }) => m.user) || membersData.map((m: { user: TeamMember }) => m.user);
            setTeamMembers(members);
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load project data');
        router.push('/projects');
      } finally {
        setIsLoadingData(false);
      }
    };

    if (projectId) {
      fetchData();
    }
  }, [projectId, router]);

  const handleLabelToggle = (labelId: string) => {
    if (selectedLabels.length >= 5 && !selectedLabels.includes(labelId)) {
      toast.error('Maximum 5 labels allowed per issue');
      return;
    }

    setSelectedLabels((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          assigneeId: assigneeId || undefined,
          dueDate: dueDate || undefined,
          priority,
          labelIds: selectedLabels.length > 0 ? selectedLabels : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to create issue');
        return;
      }

      toast.success('Issue created successfully!');
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (error) {
      console.error('Failed to create issue:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
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

  if (project.isArchived) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              Cannot create issues in an archived project.
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
          <CardTitle>Create New Issue</CardTitle>
          <CardDescription>
            Add a new issue to {project.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Title"
              placeholder="e.g., Fix login bug, Add dark mode"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={1}
              maxLength={200}
              disabled={isLoading}
            />

            <Textarea
              label="Description (optional)"
              placeholder="Describe the issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              disabled={isLoading}
              rows={6}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                value={assigneeId || 'unassigned'}
                onValueChange={(value) => setAssigneeId(value === 'unassigned' ? undefined : value)}
                disabled={isLoading}
              >
                <SelectTrigger label="Assignee (optional)">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as 'HIGH' | 'MEDIUM' | 'LOW')}
                disabled={isLoading}
              >
                <SelectTrigger label="Priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              type="date"
              label="Due Date (optional)"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isLoading}
            />

            {labels.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Labels (optional, max 5)
                </label>
                <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  {labels.map((label) => (
                    <div
                      key={label.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`label-${label.id}`}
                        checked={selectedLabels.includes(label.id)}
                        onCheckedChange={() => handleLabelToggle(label.id)}
                        disabled={isLoading || (selectedLabels.length >= 5 && !selectedLabels.includes(label.id))}
                      />
                      <label
                        htmlFor={`label-${label.id}`}
                        className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        <Badge
                          style={{
                            backgroundColor: label.color + '20',
                            color: label.color,
                            borderColor: label.color,
                          }}
                          variant="outline"
                        >
                          {label.name}
                        </Badge>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <Button type="submit" isLoading={isLoading}>
                {isLoading ? 'Creating...' : 'Create Issue'}
              </Button>
              <Link href={`/projects/${projectId}`}>
                <Button type="button" variant="outline" disabled={isLoading}>
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

