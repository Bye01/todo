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
  completed: boolean
  due_date: string | Date | null
  priority: 'Low' | 'Medium' | 'High'
  created_at: string | Date
  updated_at: string | Date
}

export function toTodo(row: TodoRow) {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    dueDate: toDateOnly(row.due_date),
    priority: row.priority,
    createdAt: toDateTime(row.created_at),
    updatedAt: toDateTime(row.updated_at),
  }
}

function toDateOnly(value: string | Date | null) {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)
  return value.toISOString().slice(0, 10)
}

function toDateTime(value: string | Date) {
  if (typeof value === 'string') return value
  return value.toISOString()
}
