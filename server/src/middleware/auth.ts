import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { query } from '../db'
import type { AuthenticatedRequest, User } from '../types'
import { AppError } from '../utils/errors'

type TokenPayload = {
  userId: number
}

export function signToken(user: User) {
  return jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' })
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return next(new AppError(401, 'Authentication is required.', 'UNAUTHORIZED'))
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as TokenPayload
    const result = await query<User>('SELECT id, username FROM users WHERE id = $1', [payload.userId])
    const user = result.rows[0]

    if (!user) {
      return next(new AppError(401, 'Authentication is required.', 'UNAUTHORIZED'))
    }

    ;(req as AuthenticatedRequest).user = user
    return next()
  } catch {
    return next(new AppError(401, 'Authentication is required.', 'UNAUTHORIZED'))
  }
}
