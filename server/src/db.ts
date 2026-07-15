import { Pool, type QueryResult, type QueryResultRow } from 'pg'
import { config } from './config'

type DbPool = {
  query<T extends QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>
  end(): Promise<void>
}

let pool: DbPool | null = null

export async function getDb() {
  if (!pool) {
    pool = await createPool()
  }

  return pool
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  const result = await (await getDb()).query<T>(text, params)
  return result
}

export async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      due_date DATE,
      priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
    CREATE INDEX IF NOT EXISTS idx_todos_user_completed ON todos(user_id, completed);
  `)
}

export async function closeDb() {
  await pool?.end()
  pool = null
}

async function createPool(): Promise<DbPool> {
  if (config.databaseUrl === 'pgmem://verify') {
    const { newDb } = await import('pg-mem')
    const memoryDb = newDb()
    const adapter = memoryDb.adapters.createPg()
    return new adapter.Pool()
  }

  return new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
  })
}
