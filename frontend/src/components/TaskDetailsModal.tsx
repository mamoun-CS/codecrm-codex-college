'use client';

import { useState } from 'react';

interface Task {
  id: number;
  lead_id?: number;
  user_id?: number;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task';
  content?: string;
  due_at?: string;
  done_at?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  completed: boolean;
  completed_at?: string;
  created_at: string;
  user?: {
    id: number;
    name: string;
  };
  lead?: any;
}

interface TaskDetailsModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (taskId: number, completed: boolean) => void;
  onDelete: (taskId: number) => void;
}

export default function TaskDetailsModal({
  task,
  isOpen,
  onClose,
  onUpdateStatus,
  onDelete,
}: TaskDetailsModalProps) {
  const [updating, setUpdating] = useState(false);

  if (!isOpen || !task) return null;

  // Parse content to extract title and description
  const contentLines = task.content?.split('\n') || [];
  const title = contentLines[0] || 'New Task';
  const description = contentLines.slice(1).join('\n');
  const isCompleted = task.completed || !!task.done_at;
  const isOverdue = task.due_at && new Date(task.due_at) < new Date() && !isCompleted;

  const handleStatusUpdate = async () => {
    setUpdating(true);
    try {
      await onUpdateStatus(task.id, !isCompleted);
      onClose();
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await onDelete(task.id);
        onClose();
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Task Details</h2>
            <p className="text-blue-100 text-sm">Task ID: {task.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200 text-2xl leading-none focus:outline-none focus:ring-2 focus:ring-white rounded"
            aria-label="Close task details"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {/* Title */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Title</h3>
            <p className="text-gray-700 text-lg">{title}</p>
          </div>

          {/* Description */}
          {description && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{description}</p>
            </div>
          )}

          {/* Priority */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Priority</h3>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                task.priority === 'urgent'
                  ? 'bg-red-100 text-red-800'
                  : task.priority === 'high'
                  ? 'bg-orange-100 text-orange-800'
                  : task.priority === 'medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {task.priority}
            </span>
          </div>

          {/* Status */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Status</h3>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                isCompleted
                  ? 'bg-green-100 text-green-800'
                  : isOverdue
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'Pending'}
            </span>
          </div>

          {/* Due Date */}
          {task.due_at && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Due Date</h3>
              <p className={`text-gray-700 ${isOverdue && !isCompleted ? 'text-red-600 font-semibold' : ''}`}>
                {formatDate(task.due_at)}
                {isOverdue && !isCompleted && ' (Overdue)'}
              </p>
            </div>
          )}

          {/* Assigned User */}
          {task.user && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Assigned To</h3>
              <p className="text-gray-700">{task.user.name}</p>
            </div>
          )}

          {/* Created Date */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Created</h3>
            <p className="text-gray-700">{formatDate(task.created_at)}</p>
          </div>

          {/* Completed Date */}
          {task.done_at && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Completed</h3>
              <p className="text-gray-700">{formatDate(task.done_at)}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <button
            onClick={handleDelete}
            className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete Task
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleStatusUpdate}
              disabled={updating}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {updating && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>
                {isCompleted ? 'Mark as Pending' : 'Mark as Complete'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}