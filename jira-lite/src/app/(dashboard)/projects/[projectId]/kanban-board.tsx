/**
 * Kanban Board Component
 * 
 * Drag and drop kanban board for managing issues.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { MessageSquare, Calendar, CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate, isOverdue, isDueToday } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Issue {
  id: string;
  title: string;
  description: string | null;
  status: 'BACKLOG' | 'IN_PROGRESS' | 'DONE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  position: number;
  dueDate: Date | null;
  assignee: {
    id: string;
    name: string;
    profileImage: string | null;
  } | null;
  labels: Array<{ id: string; name: string; color: string }>;
  subtasks: Array<{ id: string; isCompleted: boolean }>;
  commentCount: number;
}

interface KanbanBoardProps {
  projectId: string;
  issues: Issue[];
  labels?: Array<{ id: string; name: string; color: string }>;
  teamMembers?: Array<{ id: string; name: string; email: string; profileImage: string | null }>;
  isArchived?: boolean;
}

const COLUMNS = [
  { id: 'BACKLOG', title: 'Backlog', color: 'bg-slate-200 dark:bg-slate-700' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-200 dark:bg-blue-900' },
  { id: 'DONE', title: 'Done', color: 'bg-green-200 dark:bg-green-900' },
];

export default function KanbanBoard({
  projectId,
  issues: initialIssues,
  isArchived,
}: KanbanBoardProps) {
  const router = useRouter();
  const [issues, setIssues] = useState(initialIssues);

  const getIssuesByStatus = (status: string) =>
    issues
      .filter((issue) => issue.status === status)
      .sort((a, b) => a.position - b.position);

  const handleDragEnd = async (result: DropResult) => {

    if (!result.destination || isArchived) return;

    const { source, destination, draggableId } = result;

    // If dropped in the same position, do nothing
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const issueId = draggableId;
    const newStatus = destination.droppableId as 'BACKLOG' | 'IN_PROGRESS' | 'DONE';
    const newPosition = destination.index;

    // Optimistically update the UI
    setIssues((prev) => {
      const updated = [...prev];
      const issueIndex = updated.findIndex((i) => i.id === issueId);
      if (issueIndex === -1) return prev;

      const issue = { ...updated[issueIndex] };
      issue.status = newStatus;
      issue.position = newPosition;
      updated[issueIndex] = issue;

      // Update positions for other issues in the same column
      const columnIssues = updated
        .filter((i) => i.status === newStatus && i.id !== issueId)
        .sort((a, b) => a.position - b.position);

      columnIssues.forEach((i, idx) => {
        const index = updated.findIndex((u) => u.id === i.id);
        if (idx >= newPosition) {
          updated[index] = { ...updated[index], position: idx + 1 };
        }
      });

      return updated;
    });

    // Send update to server
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          position: newPosition,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update issue');
      }

      router.refresh();
    } catch {
      // Revert on error
      setIssues(initialIssues);
      toast.error('Failed to update issue');
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((column) => {
          const columnIssues = getIssuesByStatus(column.id);
          return (
            <div key={column.id} className="flex flex-col">
              <div
                className={cn(
                  'mb-3 flex items-center justify-between rounded-lg px-3 py-2',
                  column.color
                )}
              >
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {column.title}
                </h3>
                <Badge variant="secondary">{columnIssues.length}</Badge>
              </div>

              <Droppable droppableId={column.id} isDropDisabled={isArchived}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex-1 space-y-3 rounded-lg border-2 border-dashed p-2 transition-colors',
                      snapshot.isDraggingOver
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/10'
                        : 'border-transparent'
                    )}
                    style={{ minHeight: '200px' }}
                  >
                    {columnIssues.map((issue, index) => (
                      <Draggable
                        key={issue.id}
                        draggableId={issue.id}
                        index={index}
                        isDragDisabled={isArchived}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <IssueCard
                              issue={issue}
                              projectId={projectId}
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

function IssueCard({
  issue,
  projectId,
  isDragging,
}: {
  issue: Issue;
  projectId: string;
  isDragging: boolean;
}) {
  const completedSubtasks = issue.subtasks.filter((s) => s.isCompleted).length;
  const totalSubtasks = issue.subtasks.length;

  return (
    <Link href={`/projects/${projectId}/issues/${issue.id}`}>
      <div
        className={cn(
          'kanban-card rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-950',
          isDragging && 'rotate-2 shadow-lg ring-2 ring-violet-500',
          issue.priority === 'HIGH' && 'border-l-4 border-l-red-500',
          issue.priority === 'MEDIUM' && 'border-l-4 border-l-yellow-500',
          issue.priority === 'LOW' && 'border-l-4 border-l-blue-500'
        )}
      >
        {/* Labels */}
        {issue.labels.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {issue.labels.slice(0, 3).map((label) => (
              <span
                key={label.id}
                className="inline-block rounded px-1.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `${label.color}20`,
                  color: label.color,
                }}
              >
                {label.name}
              </span>
            ))}
            {issue.labels.length > 3 && (
              <span className="text-xs text-slate-500">
                +{issue.labels.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h4 className="font-medium text-slate-900 dark:text-white line-clamp-2">
          {issue.title}
        </h4>

        {/* Meta */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            {totalSubtasks > 0 && (
              <span className="flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                {completedSubtasks}/{totalSubtasks}
              </span>
            )}
            {issue.commentCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {issue.commentCount}
              </span>
            )}
            {issue.dueDate && (
              <span
                className={cn(
                  'flex items-center gap-1',
                  isOverdue(issue.dueDate) && issue.status !== 'DONE'
                    ? 'text-red-500'
                    : isDueToday(issue.dueDate)
                    ? 'text-amber-500'
                    : ''
                )}
              >
                <Calendar className="h-3 w-3" />
                {formatDate(issue.dueDate)}
              </span>
            )}
          </div>

          {issue.assignee && (
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-xs text-white"
              title={issue.assignee.name}
            >
              {issue.assignee.name.charAt(0)}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
