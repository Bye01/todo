import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import fs from 'node:fs'
import path from 'node:path'
import { config } from './config'
import { requireAuth } from './middleware/auth'
import { authRouter } from './routes/auth'
import { todosRouter } from './routes/todos'
import { errorHandler, notFoundHandler } from './utils/errors'

export function createApp() {
  const app = express()
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many sign-in attempts. Please try again later.',
      },
    },
  })

  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '32kb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.use('/api/auth', authLimiter, authRouter)
  app.use('/api/todos', requireAuth, todosRouter)

  if (config.isProduction) {
    const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist')
    if (fs.existsSync(clientDist)) {
      app.use(express.static(clientDist))
      app.get(/^\/(?!api).*/, (_req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'))
      })
    }
  }

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
