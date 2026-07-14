import { z } from 'zod'

export const prioritySchema = z.enum(['Low', 'Medium', 'High'])

const dueDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format.')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))

    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  }, 'Use a valid calendar date.')
  .nullable()
  .optional()

export const authSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters.')
    .max(30, 'Username must be 30 characters or fewer.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens.'),
  password: z.string().min(6, 'Password must be at least 6 characters.').max(100),
})

export const createTodoSchema = z.object({
  title: z.string().trim().min(1, 'Todo title is required.').max(160),
  dueDate: dueDateSchema,
  priority: prioritySchema.default('Medium'),
})

export const updateTodoSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    completed: z.boolean().optional(),
    dueDate: dueDateSchema,
    priority: prioritySchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required.')

export const todoQuerySchema = z.object({
  filter: z.enum(['all', 'active', 'completed']).default('all'),
  search: z.string().trim().max(100).default(''),
})
