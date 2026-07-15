import { Router } from 'express'
import { query } from '../db'
import type { AuthenticatedRequest, TodoRow } from '../types'
import { toTodo } from '../types'
import { AppError } from '../utils/errors'
import { createTodoSchema, todoQuerySchema, updateTodoSchema } from '../utils/validation'

export const todosRouter = Router()

todosRouter.get('/', async (req, res, next) => {
  try {
    const { filter, search } = todoQuerySchema.parse(req.query)
    const userId = getUserId(req)
    const where = ['user_id = $1']
    const params: Array<number | string> = [userId]

    if (filter === 'active') where.push('completed = FALSE')
    if (filter === 'completed') where.push('completed = TRUE')
    if (search) {
      params.push(`%${search}%`)
      where.push(`title ILIKE $${params.length}`)
    }

    const result = await query<TodoRow>(
      `SELECT id, user_id, title, completed, due_date, priority, created_at, updated_at
         FROM todos WHERE ${where.join(' AND ')}
         ORDER BY completed ASC,
          CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
          COALESCE(due_date, DATE '9999-12-31') ASC,
          created_at DESC`,
      params,
    )

    res.json({ todos: result.rows.map(toTodo) })
  } catch (error) {
    next(error)
  }
})

todosRouter.post('/', async (req, res, next) => {
  try {
    const input = createTodoSchema.parse(req.body)
    const userId = getUserId(req)
    const result = await query<TodoRow>(
      `INSERT INTO todos (user_id, title, due_date, priority)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, title, completed, due_date, priority, created_at, updated_at`,
      [userId, input.title, input.dueDate ?? null, input.priority],
    )

    res.status(201).json({ todo: toTodo(result.rows[0]) })
  } catch (error) {
    next(error)
  }
})

todosRouter.patch('/:id', async (req, res, next) => {
  try {
    const todoId = Number(req.params.id)
    const userId = getUserId(req)

    if (!Number.isInteger(todoId) || todoId < 1) {
      throw new AppError(400, 'Invalid todo id.', 'INVALID_TODO_ID')
    }

    await getTodoOrThrow(todoId, userId)
    const input = updateTodoSchema.parse(req.body)
    const fields: string[] = []
    const params: Array<string | number | boolean | null> = []

    if (input.title !== undefined) {
      params.push(input.title)
      fields.push(`title = $${params.length}`)
    }

    if (input.completed !== undefined) {
      params.push(input.completed)
      fields.push(`completed = $${params.length}`)
    }

    if (input.dueDate !== undefined) {
      params.push(input.dueDate)
      fields.push(`due_date = $${params.length}`)
    }

    if (input.priority !== undefined) {
      params.push(input.priority)
      fields.push(`priority = $${params.length}`)
    }

    fields.push('updated_at = NOW()')
    params.push(todoId, userId)

    await query(`UPDATE todos SET ${fields.join(', ')} WHERE id = $${params.length - 1} AND user_id = $${params.length}`, params)

    res.json({ todo: toTodo(await getTodoOrThrow(todoId, userId)) })
  } catch (error) {
    next(error)
  }
})

todosRouter.delete('/:id', async (req, res, next) => {
  try {
    const todoId = Number(req.params.id)
    const userId = getUserId(req)

    if (!Number.isInteger(todoId) || todoId < 1) {
      throw new AppError(400, 'Invalid todo id.', 'INVALID_TODO_ID')
    }

    const result = await query('DELETE FROM todos WHERE id = $1 AND user_id = $2', [todoId, userId])

    if (result.rowCount === 0) {
      throw new AppError(404, 'Todo not found.', 'TODO_NOT_FOUND')
    }

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

async function getTodoOrThrow(todoId: number, userId: number) {
  const result = await query<TodoRow>(
    'SELECT id, user_id, title, completed, due_date, priority, created_at, updated_at FROM todos WHERE id = $1 AND user_id = $2',
    [todoId, userId],
  )
  const row = result.rows[0]

  if (!row) {
    throw new AppError(404, 'Todo not found.', 'TODO_NOT_FOUND')
  }

  return row
}

function getUserId(req: unknown) {
  return (req as AuthenticatedRequest).user.id
}
