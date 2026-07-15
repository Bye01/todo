import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { query } from '../db'
import { signToken } from '../middleware/auth'
import { AppError } from '../utils/errors'
import { authSchema } from '../utils/validation'

type UserRow = {
  id: number
  username: string
  password_hash: string
}

export const authRouter = Router()

authRouter.post('/register', async (req, res, next) => {
  try {
    const input = authSchema.parse(req.body)
    const existing = await query<{ id: number }>('SELECT id FROM users WHERE username = $1', [input.username])

    if (existing.rowCount) {
      throw new AppError(409, 'That username is already taken.', 'USERNAME_TAKEN')
    }

    const passwordHash = await bcrypt.hash(input.password, 12)
    const result = await query<{ id: number; username: string }>(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [input.username, passwordHash],
    )

    const user = result.rows[0]
    res.status(201).json({ user, token: signToken(user) })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = authSchema.parse(req.body)
    const result = await query<UserRow>('SELECT id, username, password_hash FROM users WHERE username = $1', [
      input.username,
    ])
    const user = result.rows[0]

    if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
      throw new AppError(401, 'Invalid username or password.', 'INVALID_CREDENTIALS')
    }

    res.json({
      user: { id: user.id, username: user.username },
      token: signToken({ id: user.id, username: user.username }),
    })
  } catch (error) {
    next(error)
  }
})
