import dotenv from 'dotenv'
import { AppError } from './utils/errors'

dotenv.config({ quiet: true })

const jwtSecret = process.env.JWT_SECRET
const databaseUrl = process.env.DATABASE_URL

if (!jwtSecret) {
  throw new AppError(500, 'JWT_SECRET environment variable is required.', 'MISSING_JWT_SECRET')
}

if (!databaseUrl) {
  throw new AppError(500, 'DATABASE_URL environment variable is required.', 'MISSING_DATABASE_URL')
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl,
  databaseSsl: process.env.DATABASE_SSL === 'true' || process.env.NODE_ENV === 'production',
  jwtSecret,
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
}
