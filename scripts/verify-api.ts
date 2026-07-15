import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

let baseUrl = ''

async function main() {
  process.env.PORT = '0'
  process.env.DATABASE_URL = 'pgmem://verify'
  process.env.DATABASE_SSL = 'false'
  process.env.JWT_SECRET = 'verify-secret'
  process.env.CORS_ORIGIN = '*'

  const [{ createApp }, { closeDb, initDb }] = await Promise.all([import('../server/src/app'), import('../server/src/db')])
  await initDb()
  const server = createApp().listen(0, '127.0.0.1')

  try {
    await waitForListening(server)
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}/api`

    const first = await request('/auth/register', {
      method: 'POST',
      body: { username: `sam_${Date.now()}`, password: 'secret123' },
      expectStatus: 201,
    })
    const second = await request('/auth/register', {
      method: 'POST',
      body: { username: `lee_${Date.now()}`, password: 'secret123' },
      expectStatus: 201,
    })
    await request('/auth/login', {
      method: 'POST',
      body: { username: first.user.username, password: 'secret123' },
    })

    const high = await request('/todos', {
      method: 'POST',
      token: first.token,
      body: { title: 'Ship the full-stack todo app', priority: 'High', dueDate: '2026-07-20' },
      expectStatus: 201,
    })
    await request('/todos', {
      method: 'POST',
      token: first.token,
      body: { title: 'Review active tasks', priority: 'Medium' },
      expectStatus: 201,
    })
    await request('/todos', {
      method: 'POST',
      token: second.token,
      body: { title: 'Private second user todo', priority: 'Low' },
      expectStatus: 201,
    })

    const all = await request('/todos?filter=all', { token: first.token })
    assert(all.todos.length === 2, 'first user should only see their own todos')

    const patched = await request(`/todos/${high.todo.id}`, {
      method: 'PATCH',
      token: first.token,
      body: { completed: true, title: 'Ship the polished full-stack todo app' },
    })
    assert(patched.todo.completed === true, 'patch should mark todo completed')

    const completed = await request('/todos?filter=completed', { token: first.token })
    assert(completed.todos.length === 1, 'completed filter should return one todo')

    const active = await request('/todos?filter=active', { token: first.token })
    assert(active.todos.length === 1, 'active filter should return one todo')

    const search = await request('/todos?search=polished', { token: first.token })
    assert(search.todos.length === 1, 'search should match edited todo')

    await request('/todos', { expectStatus: 401 })
    await request('/todos', {
      method: 'POST',
      token: first.token,
      body: { title: 'Invalid date should fail', priority: 'High', dueDate: '2026-99-99' },
      expectStatus: 400,
    })

    await request(`/todos/${high.todo.id}`, { method: 'DELETE', token: first.token, expectStatus: 204 })
    const afterDelete = await request('/todos', { token: first.token })
    assert(afterDelete.todos.length === 1, 'delete should remove todo')

    console.log('API verification passed.')
  } finally {
    await closeServer(server)
    await closeDb()
  }
}

function waitForListening(server: Server) {
  return new Promise<void>((resolve) => {
    if (server.listening) {
      resolve()
      return
    }
    server.on('listening', resolve)
  })
}

function closeServer(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

async function request(pathname: string, options: RequestOptions = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  const response = await fetch(`${baseUrl}${pathname}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const expected = options.expectStatus ?? 200
  if (response.status !== expected) {
    const text = await response.text()
    throw new Error(`${options.method ?? 'GET'} ${pathname} failed with ${response.status}: ${text}`)
  }

  if (response.status === 204) return null
  return response.json() as Promise<any>
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

type RequestOptions = {
  method?: string
  token?: string
  body?: unknown
  expectStatus?: number
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
