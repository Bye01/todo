import {
  CalendarDays,
  Check,
  Circle,
  Edit3,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import clsx from 'clsx'

type Priority = 'Low' | 'Medium' | 'High'
type Filter = 'all' | 'active' | 'completed'

type User = {
  id: number
  username: string
}

type Todo = {
  id: number
  title: string
  completed: boolean
  dueDate: string | null
  priority: Priority
  createdAt: string
  updatedAt: string
}

type Session = {
  user: User
  token: string
}

const priorityStyles: Record<Priority, string> = {
  Low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Medium: 'border-amber-200 bg-amber-50 text-amber-700',
  High: 'border-rose-200 bg-rose-50 text-rose-700',
}

const savedSession = localStorage.getItem('todo-session')

function App() {
  const [session, setSession] = useState<Session | null>(() => (savedSession ? JSON.parse(savedSession) : null))
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [todos, setTodos] = useState<Todo[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<Priority>('Medium')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [notice, setNotice] = useState('')

  const stats = useMemo(() => {
    const completed = todos.filter((todo) => todo.completed).length
    return {
      total: todos.length,
      active: todos.length - completed,
      completed,
    }
  }, [todos])

  useEffect(() => {
    if (!session) {
      localStorage.removeItem('todo-session')
      return
    }

    localStorage.setItem('todo-session', JSON.stringify(session))
  }, [session])

  useEffect(() => {
    if (!session) return
    void loadTodos()
  }, [session, filter])

  async function api<T>(path: string, options: RequestInit = {}) {
    const response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        ...options.headers,
      },
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.error?.message ?? 'Request failed')
    }

    if (response.status === 204) return null as T
    return response.json() as Promise<T>
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthError('')

    try {
      const data = await api<Session>(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      setSession(data)
      setUsername('')
      setPassword('')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in')
    }
  }

  async function loadTodos() {
    if (!session) return
    setIsLoading(true)
    setNotice('')

    try {
      const params = new URLSearchParams({ filter })
      if (search.trim()) params.set('search', search.trim())
      const data = await api<{ todos: Todo[] }>(`/todos?${params}`)
      setTodos(data.todos)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to load todos')
    } finally {
      setIsLoading(false)
    }
  }

  async function addTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) return

    try {
      await api('/todos', {
        method: 'POST',
        body: JSON.stringify({ title, dueDate: dueDate || null, priority }),
      })
      setTitle('')
      setDueDate('')
      setPriority('Medium')
      await loadTodos()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to add todo')
    }
  }

  async function patchTodo(id: number, body: Partial<Pick<Todo, 'title' | 'completed' | 'dueDate' | 'priority'>>) {
    try {
      await api(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
      await loadTodos()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to update todo')
    }
  }

  async function deleteTodo(id: number) {
    try {
      await api(`/todos/${id}`, { method: 'DELETE' })
      await loadTodos()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to delete todo')
    }
  }

  function startEditing(todo: Todo) {
    setEditingId(todo.id)
    setEditingTitle(todo.title)
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>, todo: Todo) {
    event.preventDefault()
    if (!editingTitle.trim()) return
    await patchTodo(todo.id, { title: editingTitle.trim() })
    setEditingId(null)
    setEditingTitle('')
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-[#f4f7fb] px-4 py-8 text-slate-900 sm:px-6">
        <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
              <ShieldCheck size={18} className="text-teal-600" />
              Private task lists for every local user
            </div>
            <div className="space-y-5">
              <h1 className="max-w-3xl text-5xl font-black tracking-normal text-slate-950 sm:text-6xl">
                Clear your day with a calmer todo board.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Create an account, prioritize what matters, search across tasks, and keep completed work neatly tucked away.
              </p>
            </div>
            <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
              {['Due dates', 'Priority levels', 'Fast filters'].map((item) => (
                <div key={item} className="rounded-lg border border-white bg-white/80 p-4 shadow-sm">
                  <p className="text-sm font-bold text-slate-900">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleAuth} className="rounded-lg border border-white bg-white p-6 shadow-xl shadow-slate-200/70">
            <div className="mb-6">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-600">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {mode === 'login' ? 'Sign in to your list' : 'Start your private list'}
              </h2>
            </div>
            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                placeholder="alex"
                autoComplete="username"
              />
            </label>
            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                placeholder="At least 6 characters"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>
            {authError && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{authError}</p>}
            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 font-bold text-white transition hover:bg-slate-800">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setAuthError('')
              }}
              className="mt-4 w-full rounded-lg px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-lg border border-white bg-white/90 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-600">Today</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">Todo Command Center</h1>
            <p className="mt-1 text-sm text-slate-500">Signed in as {session.user.username}</p>
          </div>
          <button
            onClick={() => setSession(null)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <LogOut size={18} />
            Logout
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <aside className="space-y-6">
            <form onSubmit={addTodo} className="rounded-lg border border-white bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-black text-slate-950">Add todo</h2>
              <label className="mb-4 block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Task</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                  placeholder="Write project brief"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Due date</span>
                  <input
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                    type="date"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Priority</span>
                  <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value as Priority)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </label>
              </div>
              <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 font-bold text-white transition hover:bg-teal-700">
                <Plus size={18} />
                Add task
              </button>
            </form>

            <div className="grid grid-cols-3 gap-3">
              <Stat label="All" value={stats.total} />
              <Stat label="Active" value={stats.active} />
              <Stat label="Done" value={stats.completed} />
            </div>
          </aside>

          <section className="rounded-lg border border-white bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex rounded-lg bg-slate-100 p-1">
                {(['all', 'active', 'completed'] as Filter[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={clsx(
                      'rounded-md px-4 py-2 text-sm font-bold capitalize transition',
                      filter === item ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900',
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void loadTodos()
                }}
                className="flex gap-2"
              >
                <label className="relative flex-1">
                  <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                    placeholder="Search tasks"
                  />
                </label>
                <button className="rounded-lg bg-slate-950 px-4 py-3 font-bold text-white transition hover:bg-slate-800">
                  Search
                </button>
              </form>
            </div>

            {notice && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{notice}</p>}
            {isLoading && <p className="rounded-lg bg-slate-50 px-4 py-8 text-center font-semibold text-slate-500">Loading tasks...</p>}

            {!isLoading && todos.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
                <p className="text-lg font-black text-slate-900">No todos found</p>
                <p className="mt-1 text-slate-500">Add a task or adjust your filters.</p>
              </div>
            )}

            <div className="space-y-3">
              {todos.map((todo) => (
                <article
                  key={todo.id}
                  className={clsx(
                    'rounded-lg border p-4 transition',
                    todo.completed ? 'border-slate-100 bg-slate-50' : 'border-slate-200 bg-white shadow-sm',
                  )}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <button
                        onClick={() => patchTodo(todo.id, { completed: !todo.completed })}
                        className={clsx(
                          'mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition',
                          todo.completed
                            ? 'border-teal-600 bg-teal-600 text-white'
                            : 'border-slate-300 text-slate-400 hover:border-teal-500 hover:text-teal-600',
                        )}
                        aria-label={todo.completed ? 'Mark active' : 'Mark completed'}
                      >
                        {todo.completed ? <Check size={17} /> : <Circle size={17} />}
                      </button>

                      <div className="min-w-0 flex-1">
                        {editingId === todo.id ? (
                          <form onSubmit={(event) => submitEdit(event, todo)} className="flex gap-2">
                            <input
                              value={editingTitle}
                              onChange={(event) => setEditingTitle(event.target.value)}
                              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                              autoFocus
                            />
                            <button className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white">Save</button>
                          </form>
                        ) : (
                          <h3 className={clsx('break-words text-lg font-black', todo.completed && 'text-slate-400 line-through')}>
                            {todo.title}
                          </h3>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={clsx('rounded-full border px-3 py-1 text-xs font-black', priorityStyles[todo.priority])}>
                            {todo.priority}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500">
                            <CalendarDays size={14} />
                            {todo.dueDate || 'No due date'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <select
                        value={todo.priority}
                        onChange={(event) => patchTodo(todo.id, { priority: event.target.value as Priority })}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-teal-500"
                        aria-label="Change priority"
                      >
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </select>
                      <input
                        value={todo.dueDate ?? ''}
                        onChange={(event) => patchTodo(todo.id, { dueDate: event.target.value || null })}
                        className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-teal-500"
                        type="date"
                        aria-label="Change due date"
                      />
                      <button
                        onClick={() => startEditing(todo)}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                        aria-label="Edit todo"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        aria-label="Delete todo"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white bg-white p-4 text-center shadow-sm">
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
    </div>
  )
}

export default App
