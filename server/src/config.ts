import dotenv from 'dotenv'
import path from 'node:path'
import { AppError } from './utils/errors'

dotenv.config({ quiet: true })

const rootDir = path.resolve(__dirname, '..', '..')
const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret) {
  throw new AppError(500, 'JWT_SECRET environment variable is required.', 'MISSING_JWT_SECRET')
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databasePath: process.env.DATABASE_PATH ?? path.join(rootDir, 'server', 'data', 'todos.sqlite'),
  jwtSecret,
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
}
