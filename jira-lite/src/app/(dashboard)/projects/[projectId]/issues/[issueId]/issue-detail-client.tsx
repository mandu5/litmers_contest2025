/**
 * Issue Detail Client Component
 * 
 * Fully functional client component for displaying and interacting with issue details.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, getInitials, formatRelativeTime } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Calendar,
  User,
  Tag,
  MessageSquare,
  List,
  History,
  Sparkles,
  Lightbulb,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Loader2,
  MoreVertical,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function IssueDetailClient({
  issue: initialIssue,
  projectId,
  userId,
}: {
  issue: any;
  projectId: string;
  userId: string;
}) {
  const router = useRouter();
  const [issue, setIssue] = useState(initialIssue);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.description || '');
  const [status, setStatus] = useState(issue.status);
  const [priority, setPriority] = useState(issue.priority);
  const [assigneeId, setAssigneeId] = useState(issue.assigneeId || 'unassigned');
  const [dueDate, setDueDate] = useState(
    issue.dueDate ? new Date(issue.dueDate).toISOString().split('T')[0] : ''
  );
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    issue.labels?.map((l: any) => l.id) || []
  );

  // Subtask state
  const [subtasks, setSubtasks] = useState(issue.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isSubtaskLoading, setIsSubtaskLoading] = useState<string | null>(null);

  // Comment state
  const [comments, setComments] = useState(issue.comments || []);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');

  // AI state
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState<string | null>(null);

  // Refresh issue data
  const refreshIssue = async () => {
    try {
      const response = await fetch(`/api/issues/${issue.id}`);
      if (response.ok) {
        const data = await response.json();
        setIssue(data);
        setTitle(data.title);
        setDescription(data.description || '');
        setStatus(data.status);
        setPriority(data.priority);
        setAssigneeId(data.assigneeId || 'unassigned');
        setDueDate(data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : '');
        setSelectedLabels(data.labels?.map((l: any) => l.id) || []);
        setSubtasks(data.subtasks || []);
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to refresh issue:', error);
    }
  };

  // Handle issue update
  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/issues/${issue.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          status,
          priority,
          assigneeId: assigneeId === 'unassigned' ? null : assigneeId,
          dueDate: dueDate || null,
          labelIds: selectedLabels,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to update issue');
        return;
      }

      toast.success('Issue updated successfully!');
      setIsEditing(false);
      await refreshIssue();
      router.refresh();
    } catch (error) {
      console.error('Failed to update issue:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle subtask toggle
  const handleSubtaskToggle = async (subtaskId: string, isCompleted: boolean) => {
    if (!issue.canEdit) return;

    setIsSubtaskLoading(subtaskId);
    try {
      const response = await fetch(`/api/issues/${issue.id}/subtasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtaskId,
          isCompleted: !isCompleted,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to update subtask');
        return;
      }

      await refreshIssue();
    } catch (error) {
      console.error('Failed to toggle subtask:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubtaskLoading(null);
    }
  };

  // Handle add subtask
  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !issue.canEdit) return;

    setIsAddingSubtask(true);
    try {
      const response = await fetch(`/api/issues/${issue.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSubtaskTitle.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to add subtask');
        return;
      }

      toast.success('Subtask added successfully!');
      setNewSubtaskTitle('');
      await refreshIssue();
    } catch (error) {
      console.error('Failed to add subtask:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsAddingSubtask(false);
    }
  };

  // Handle delete subtask
  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!issue.canEdit) return;

    try {
      const response = await fetch(`/api/issues/${issue.id}/subtasks?subtaskId=${subtaskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete subtask');
        return;
      }

      toast.success('Subtask deleted successfully!');
      await refreshIssue();
    } catch (error) {
      console.error('Failed to delete subtask:', error);
      toast.error('An unexpected error occurred');
    }
  };

  // Handle add comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !issue.canEdit) return;

    setIsAddingComment(true);
    try {
      const response = await fetch(`/api/issues/${issue.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to add comment');
        return;
      }

      toast.success('Comment added successfully!');
      setNewComment('');
      await refreshIssue();
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsAddingComment(false);
    }
  };

  // Handle edit comment
  const handleEditComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return;

    try {
      const response = await fetch(`/api/issues/${issue.id}/comments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          content: editCommentContent.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to update comment');
        return;
      }

      toast.success('Comment updated successfully!');
      setEditingCommentId(null);
      setEditCommentContent('');
      await refreshIssue();
    } catch (error) {
      console.error('Failed to update comment:', error);
      toast.error('An unexpected error occurred');
    }
  };

  // Handle delete comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/issues/${issue.id}/comments?commentId=${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete comment');
        return;
      }

      toast.success('Comment deleted successfully!');
      await refreshIssue();
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('An unexpected error occurred');
    }
  };

  // Handle AI summary
  const handleAISummary = async () => {
    if (!issue.description || issue.description.length <= 10) {
      toast.error('Description must be longer than 10 characters');
      return;
    }

    setIsLoadingAI('summary');
    try {
      const response = await fetch(`/api/issues/${issue.id}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'summary' }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to generate summary');
        return;
      }

      setAiSummary(data.content);
      if (data.cached) {
        toast.success('Loaded cached summary');
      } else {
        toast.success('Summary generated successfully!');
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoadingAI(null);
    }
  };

  // Handle AI suggestion
  const handleAISuggestion = async () => {
    if (!issue.description || issue.description.length <= 10) {
      toast.error('Description must be longer than 10 characters');
      return;
    }

    setIsLoadingAI('suggestion');
    try {
      const response = await fetch(`/api/issues/${issue.id}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'suggestion' }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to generate suggestion');
        return;
      }

      setAiSuggestion(data.content);
      if (data.cached) {
        toast.success('Loaded cached suggestion');
      } else {
        toast.success('Suggestion generated successfully!');
      }
    } catch (error) {
      console.error('Failed to generate suggestion:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoadingAI(null);
    }
  };

  // Update subtasks and comments when issue refreshes
  useEffect(() => {
    setSubtasks(issue.subtasks || []);
    setComments(issue.comments || []);
  }, [issue]);

  const canEdit = issue.canEdit;
  const canDelete = issue.canDelete;

  return (
    <>
      {/* Issue Header with Edit Mode */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mb-2 text-2xl font-bold"
                  disabled={isSaving}
                />
              ) : (
                <CardTitle className="text-2xl">{issue.title}</CardTitle>
              )}
              <CardDescription className="mt-2">
                Created {formatDate(issue.createdAt)} by {issue.creator.name}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={handleUpdate} isLoading={isSaving} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </>
              ) : (
                <>
                  {canEdit && (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  )}
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
                  <Badge
                    variant="outline"
                    style={{
                      borderColor:
                        issue.priority === 'HIGH'
                          ? '#ef4444'
                          : issue.priority === 'MEDIUM'
                          ? '#f59e0b'
                          : '#3b82f6',
                      color:
                        issue.priority === 'HIGH'
                          ? '#ef4444'
                          : issue.priority === 'MEDIUM'
                          ? '#f59e0b'
                          : '#3b82f6',
                    }}
                  >
                    {issue.priority}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Labels */}
          {isEditing ? (
            <div className="mb-4 space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Labels (max 5)
              </label>
              <div className="flex flex-wrap gap-2">
                {issue.projectLabels?.map((label: any) => (
                  <label key={label.id} className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={selectedLabels.includes(label.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          if (selectedLabels.length >= 5) {
                            toast.error('Maximum 5 labels allowed');
                            return;
                          }
                          setSelectedLabels([...selectedLabels, label.id]);
                        } else {
                          setSelectedLabels(selectedLabels.filter((id) => id !== label.id));
                        }
                      }}
                    />
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: `${label.color}20`,
                        color: label.color,
                        borderColor: label.color,
                      }}
                    >
                      {label.name}
                    </Badge>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            issue.labels && issue.labels.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {issue.labels.map((label: any) => (
                  <Badge
                    key={label.id}
                    variant="outline"
                    style={{
                      backgroundColor: `${label.color}20`,
                      color: label.color,
                      borderColor: label.color,
                    }}
                  >
                    <Tag className="mr-1 h-3 w-3" />
                    {label.name}
                  </Badge>
                ))}
              </div>
            )
          )}

          {/* Description */}
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Description
            </h3>
            {isEditing ? (
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue..."
                rows={6}
                maxLength={5000}
                disabled={isSaving}
              />
            ) : (
              <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-400">
                {issue.description || 'No description provided.'}
              </p>
            )}
          </div>

          <Separator className="my-4" />

          {/* Metadata */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isEditing ? (
              <>
                <Select
                  value={assigneeId}
                  onValueChange={setAssigneeId}
                  disabled={isSaving}
                >
                  <SelectTrigger label="Assignee">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {issue.teamMembers?.map((member: any) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as 'HIGH' | 'MEDIUM' | 'LOW')}
                  disabled={isSaving}
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
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as 'BACKLOG' | 'IN_PROGRESS' | 'DONE')}
                  disabled={isSaving}
                >
                  <SelectTrigger label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BACKLOG">Backlog</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  label="Due Date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isSaving}
                />
              </>
            ) : (
              <>
                {issue.assignee && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Assignee:</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={issue.assignee.profileImage || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(issue.assignee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{issue.assignee.name}</span>
                    </div>
                  </div>
                )}
                {issue.dueDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Due date:</span>
                    <span className="text-sm font-medium">{formatDate(issue.dueDate)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Subtasks, Comments, History, AI */}
      <Tabs defaultValue="subtasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subtasks">
            <List className="mr-2 h-4 w-4" />
            Subtasks ({subtasks.length})
          </TabsTrigger>
          <TabsTrigger value="comments">
            <MessageSquare className="mr-2 h-4 w-4" />
            Comments ({comments.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Sparkles className="mr-2 h-4 w-4" />
            AI Features
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subtasks">
          <Card>
            <CardHeader>
              <CardTitle>Subtasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canEdit && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a subtask..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isAddingSubtask) {
                        handleAddSubtask();
                      }
                    }}
                    disabled={isAddingSubtask || subtasks.length >= 20}
                  />
                  <Button
                    onClick={handleAddSubtask}
                    isLoading={isAddingSubtask}
                    disabled={!newSubtaskTitle.trim() || isAddingSubtask || subtasks.length >= 20}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {subtasks.length === 0 ? (
                <p className="text-center text-sm text-slate-500">No subtasks yet.</p>
              ) : (
                <div className="space-y-2">
                  {subtasks.map((subtask: any) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                    >
                      {isSubtaskLoading === subtask.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      ) : (
                        <Checkbox
                          checked={subtask.isCompleted}
                          onCheckedChange={() => handleSubtaskToggle(subtask.id, subtask.isCompleted)}
                          disabled={!canEdit}
                          className="h-4 w-4"
                        />
                      )}
                      <span
                        className={`flex-1 text-sm ${
                          subtask.isCompleted
                            ? 'text-slate-500 line-through'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {subtask.title}
                      </span>
                      {canEdit && (
                          <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Subtask?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this subtask? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteSubtask(subtask.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {subtasks.length >= 20 && (
                <p className="text-xs text-slate-500">Maximum 20 subtasks per issue.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canEdit && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    disabled={isAddingComment}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleAddComment}
                      isLoading={isAddingComment}
                      disabled={!newComment.trim() || isAddingComment}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Comment
                    </Button>
                  </div>
                </div>
              )}
              {comments.length === 0 ? (
                <p className="text-center text-sm text-slate-500">No comments yet.</p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment: any) => (
                    <div
                      key={comment.id}
                      className="flex gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.author.profileImage || undefined} />
                        <AvatarFallback>{getInitials(comment.author.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{comment.author.name}</span>
                            <span className="text-xs text-slate-500">
                              {formatRelativeTime(comment.createdAt)}
                            </span>
                          </div>
                          {((comment.author.id === userId) || canDelete) && !editingCommentId && (
                            <div className="flex gap-1">
                              {comment.author.id === userId && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setEditingCommentId(comment.id);
                                    setEditCommentContent(comment.content);
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this comment? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                        {editingCommentId === comment.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editCommentContent}
                              onChange={(e) => setEditCommentContent(e.target.value)}
                              rows={3}
                              maxLength={1000}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleEditComment(comment.id)}
                                disabled={!editCommentContent.trim()}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditCommentContent('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Change History</CardTitle>
            </CardHeader>
            <CardContent>
              {issue.history && issue.history.length > 0 ? (
                <div className="space-y-3">
                  {issue.history.map((entry: any) => (
                    <div
                      key={entry.id}
                      className="flex gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={entry.user.profileImage || undefined} />
                        <AvatarFallback>{getInitials(entry.user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="font-medium">{entry.user.name}</span> changed{' '}
                          <span className="font-medium">{entry.field}</span> from{' '}
                          <span className="text-slate-500">{entry.oldValue || 'empty'}</span> to{' '}
                          <span className="text-slate-500">{entry.newValue || 'empty'}</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatRelativeTime(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-slate-500">No history yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI Features</CardTitle>
              <CardDescription>
                Generate AI summaries and suggestions for this issue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleAISummary}
                    disabled={!issue.description || issue.description.length <= 10 || isLoadingAI !== null}
                    isLoading={isLoadingAI === 'summary'}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {aiSummary ? 'Regenerate AI Summary' : 'Generate AI Summary'}
                  </Button>
                  {aiSummary && (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {aiSummary}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleAISuggestion}
                    disabled={!issue.description || issue.description.length <= 10 || isLoadingAI !== null}
                    isLoading={isLoadingAI === 'suggestion'}
                  >
                    <Lightbulb className="mr-2 h-4 w-4" />
                    {aiSuggestion ? 'Regenerate AI Suggestion' : 'Get AI Suggestion'}
                  </Button>
                  {aiSuggestion && (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {aiSuggestion}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {(!issue.description || issue.description.length <= 10) && (
                <p className="text-xs text-slate-500">
                  AI features require issue description to be longer than 10 characters.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
