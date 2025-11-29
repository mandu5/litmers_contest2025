/**
 * Create Project Page
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';

interface Team {
  id: string;
  name: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch('/api/teams');
        if (response.ok) {
          const data = await response.json();
          setTeams(data);
          if (data.length === 1) {
            setTeamId(data[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch teams:', error);
      } finally {
        setIsLoadingTeams(false);
      }
    };

    fetchTeams();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamId) {
      toast.error('Please select a team');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, teamId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to create project');
        return;
      }

      toast.success('Project created successfully!');
      router.push(`/projects/${data.id}`);
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a New Project</CardTitle>
          <CardDescription>
            Projects help you organize and track issues for your team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teams.length === 0 && !isLoadingTeams ? (
            <div className="text-center py-8">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                You need to be part of a team to create a project.
              </p>
              <Link href="/teams/new">
                <Button>Create a Team First</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select value={teamId} onValueChange={setTeamId} disabled={isLoadingTeams}>
                <SelectTrigger label="Team">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                label="Project Name"
                placeholder="e.g., Website Redesign, Mobile App"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={1}
                maxLength={100}
                disabled={isLoading}
              />

              <Textarea
                label="Description (optional)"
                placeholder="Describe what this project is about..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                disabled={isLoading}
                rows={4}
              />

              <div className="flex gap-4 pt-2">
                <Button type="submit" isLoading={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Project'}
                </Button>
                <Link href="/projects">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
