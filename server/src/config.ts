import dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ quiet: true })

const rootDir = path.resolve(__dirname, '..', '..')

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databasePath: process.env.DATABASE_PATH ?? path.join(rootDir, 'server', 'data', 'todos.sqlite'),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-me',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
}
