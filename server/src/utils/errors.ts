import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'

export class AppError extends Error {
  statusCode: number
  code: string
  details?: unknown

  constructor(statusCode: number, message: string, code = 'APP_ERROR', details?: unknown) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, 'Route not found', 'NOT_FOUND'))
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please check the submitted fields.',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    })
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    })
  }

  console.error(error)

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong. Please try again.',
    },
  })
}
