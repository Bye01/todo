import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { getDb } from '../db'
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
    const db = getDb()
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(input.username)

    if (existing) {
      throw new AppError(409, 'That username is already taken.', 'USERNAME_TAKEN')
    }

    const passwordHash = await bcrypt.hash(input.password, 12)
    const result = db
      .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .run(input.username, passwordHash)

    const user = { id: Number(result.lastInsertRowid), username: input.username }
    res.status(201).json({ user, token: signToken(user) })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = authSchema.parse(req.body)
    const user = getDb()
      .prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
      .get(input.username) as UserRow | undefined

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
