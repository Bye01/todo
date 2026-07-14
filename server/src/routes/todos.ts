import { Router } from 'express'
import { getDb } from '../db'
import type { AuthenticatedRequest, TodoRow } from '../types'
import { toTodo } from '../types'
import { AppError } from '../utils/errors'
import { createTodoSchema, todoQuerySchema, updateTodoSchema } from '../utils/validation'

export const todosRouter = Router()

todosRouter.get('/', (req, res, next) => {
  try {
    const { filter, search } = todoQuerySchema.parse(req.query)
    const userId = getUserId(req)
    const where = ['user_id = ?']
    const params: Array<number | string> = [userId]

    if (filter === 'active') where.push('completed = 0')
    if (filter === 'completed') where.push('completed = 1')
    if (search) {
      where.push('title LIKE ?')
      params.push(`%${search}%`)
    }

    const rows = getDb()
      .prepare(
        `SELECT * FROM todos WHERE ${where.join(' AND ')}
         ORDER BY completed ASC,
          CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
          COALESCE(due_date, '9999-12-31') ASC,
          created_at DESC`,
      )
      .all(...params) as TodoRow[]

    res.json({ todos: rows.map(toTodo) })
  } catch (error) {
    next(error)
  }
})

todosRouter.post('/', (req, res, next) => {
  try {
    const input = createTodoSchema.parse(req.body)
    const userId = getUserId(req)
    const result = getDb()
      .prepare('INSERT INTO todos (user_id, title, due_date, priority) VALUES (?, ?, ?, ?)')
      .run(userId, input.title, input.dueDate ?? null, input.priority)

    const row = getTodoOrThrow(Number(result.lastInsertRowid), userId)
    res.status(201).json({ todo: toTodo(row) })
  } catch (error) {
    next(error)
  }
})

todosRouter.patch('/:id', (req, res, next) => {
  try {
    const todoId = Number(req.params.id)
    const userId = getUserId(req)

    if (!Number.isInteger(todoId) || todoId < 1) {
      throw new AppError(400, 'Invalid todo id.', 'INVALID_TODO_ID')
    }

    getTodoOrThrow(todoId, userId)
    const input = updateTodoSchema.parse(req.body)
    const fields: string[] = []
    const params: Array<string | number | null> = []

    if (input.title !== undefined) {
      fields.push('title = ?')
      params.push(input.title)
    }

    if (input.completed !== undefined) {
      fields.push('completed = ?')
      params.push(input.completed ? 1 : 0)
    }

    if (input.dueDate !== undefined) {
      fields.push('due_date = ?')
      params.push(input.dueDate)
    }

    if (input.priority !== undefined) {
      fields.push('priority = ?')
      params.push(input.priority)
    }

    fields.push("updated_at = datetime('now')")
    params.push(todoId, userId)

    getDb()
      .prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`)
      .run(...params)

    res.json({ todo: toTodo(getTodoOrThrow(todoId, userId)) })
  } catch (error) {
    next(error)
  }
})

todosRouter.delete('/:id', (req, res, next) => {
  try {
    const todoId = Number(req.params.id)
    const userId = getUserId(req)

    if (!Number.isInteger(todoId) || todoId < 1) {
      throw new AppError(400, 'Invalid todo id.', 'INVALID_TODO_ID')
    }

    const result = getDb().prepare('DELETE FROM todos WHERE id = ? AND user_id = ?').run(todoId, userId)

    if (result.changes === 0) {
      throw new AppError(404, 'Todo not found.', 'TODO_NOT_FOUND')
    }

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

function getTodoOrThrow(todoId: number, userId: number) {
  const row = getDb().prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(todoId, userId) as
    | TodoRow
    | undefined

  if (!row) {
    throw new AppError(404, 'Todo not found.', 'TODO_NOT_FOUND')
  }

  return row
}

function getUserId(req: unknown) {
  return (req as AuthenticatedRequest).user.id
}
