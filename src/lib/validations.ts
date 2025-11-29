/**
 * Zod Validation Schemas
 * 
 * Centralized validation schemas for all form inputs and API requests.
 * These schemas enforce the data limits specified in the PRD.
 */
import { z } from 'zod';

// ============================================
// Authentication Schemas
// ============================================

export const signUpSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must be at most 255 characters'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be at most 100 characters'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be at most 50 characters'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
});

export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be at most 100 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be at most 100 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be at most 50 characters'),
  profileImage: z.string().url().optional().or(z.literal('')),
});

// ============================================
// Team Schemas
// ============================================

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(1, 'Team name is required')
    .max(50, 'Team name must be at most 50 characters'),
});

export const updateTeamSchema = z.object({
  name: z
    .string()
    .min(1, 'Team name is required')
    .max(50, 'Team name must be at most 50 characters'),
});

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
});

export const changeRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['ADMIN', 'MEMBER']),
});

export const transferOwnershipSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

// ============================================
// Project Schemas
// ============================================

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be at most 100 characters'),
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .optional(),
  teamId: z.string().min(1, 'Team ID is required'),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be at most 100 characters')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .optional(),
});

// ============================================
// Issue Schemas
// ============================================

export const createIssueSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  description: z
    .string()
    .max(5000, 'Description must be at most 5000 characters')
    .optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  labelIds: z.array(z.string()).max(5, 'Maximum 5 labels allowed').optional(),
});

export const updateIssueSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters')
    .optional(),
  description: z
    .string()
    .max(5000, 'Description must be at most 5000 characters')
    .optional(),
  status: z.enum(['BACKLOG', 'IN_PROGRESS', 'DONE']).optional(),
  customStatusId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  labelIds: z.array(z.string()).max(5, 'Maximum 5 labels allowed').optional(),
  position: z.number().optional(),
});

export const reorderIssueSchema = z.object({
  issueId: z.string(),
  newStatus: z.enum(['BACKLOG', 'IN_PROGRESS', 'DONE']),
  newPosition: z.number(),
  customStatusId: z.string().optional().nullable(),
});

// ============================================
// Label Schemas
// ============================================

export const createLabelSchema = z.object({
  name: z
    .string()
    .min(1, 'Label name is required')
    .max(30, 'Label name must be at most 30 characters'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
});

export const updateLabelSchema = z.object({
  name: z
    .string()
    .min(1, 'Label name is required')
    .max(30, 'Label name must be at most 30 characters')
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional(),
});

// ============================================
// Custom Status Schemas
// ============================================

export const createCustomStatusSchema = z.object({
  name: z
    .string()
    .min(1, 'Status name is required')
    .max(30, 'Status name must be at most 30 characters'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional(),
  position: z.number().min(0),
  wipLimit: z.number().min(1).max(50).optional().nullable(),
});

export const updateCustomStatusSchema = z.object({
  name: z
    .string()
    .min(1, 'Status name is required')
    .max(30, 'Status name must be at most 30 characters')
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional(),
  position: z.number().min(0).optional(),
  wipLimit: z.number().min(1).max(50).optional().nullable(),
});

// ============================================
// Subtask Schemas
// ============================================

export const createSubtaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
});

export const updateSubtaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters')
    .optional(),
  isCompleted: z.boolean().optional(),
  position: z.number().optional(),
});

// ============================================
// Comment Schemas
// ============================================

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must be at most 1000 characters'),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must be at most 1000 characters'),
});

// ============================================
// Type Exports
// ============================================

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type ReorderIssueInput = z.infer<typeof reorderIssueSchema>;
export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
export type CreateCustomStatusInput = z.infer<typeof createCustomStatusSchema>;
export type UpdateCustomStatusInput = z.infer<typeof updateCustomStatusSchema>;
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
