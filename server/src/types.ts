import type { Request } from 'express'

export type User = {
  id: number
  username: string
}

export type AuthenticatedRequest = Request & {
  user: User
}

export type TodoRow = {
  id: number
  user_id: number
  title: string
  completed: 0 | 1
  due_date: string | null
  priority: 'Low' | 'Medium' | 'High'
  created_at: string
  updated_at: string
}

export function toTodo(row: TodoRow) {
  return {
    id: row.id,
    title: row.title,
    completed: Boolean(row.completed),
    dueDate: row.due_date,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
