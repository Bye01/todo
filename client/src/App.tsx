import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Edit3,
  Inbox,
  Loader2,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

type Priority = 'Low' | 'Medium' | 'High'
type Filter = 'all' | 'active' | 'completed'
type Toast = { type: 'success' | 'error'; message: string } | null

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [busyTodoId, setBusyTodoId] = useState<number | null>(null)
  const [toast, setToast] = useState<Toast>(null)

  const stats = useMemo(() => {
    const completed = todos.filter((todo) => todo.completed).length
    const today = todos.filter((todo) => todo.dueDate === todayIso()).length

    return {
      today,
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

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timeout)
  }, [toast])

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

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthError('')
    setIsAuthenticating(true)

    try {
      const data = await api<Session>(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      setSession(data)
      setUsername('')
      setPassword('')
      showToast('success', mode === 'login' ? 'Signed in successfully.' : 'Account created.')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in')
    } finally {
      setIsAuthenticating(false)
    }
  }

  async function loadTodos() {
    if (!session) return
    setIsLoading(true)

    try {
      const params = new URLSearchParams({ filter })
      if (search.trim()) params.set('search', search.trim())
      const data = await api<{ todos: Todo[] }>(`/todos?${params}`)
      setTodos(data.todos)
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Unable to load todos.')
    } finally {
      setIsLoading(false)
    }
  }

  async function addTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) return
    setIsSubmitting(true)

    try {
      await api('/todos', {
        method: 'POST',
        body: JSON.stringify({ title, dueDate: dueDate || null, priority }),
      })
      setTitle('')
      setDueDate('')
      setPriority('Medium')
      await loadTodos()
      showToast('success', 'Todo added.')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Unable to add todo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function patchTodo(id: number, body: Partial<Pick<Todo, 'title' | 'completed' | 'dueDate' | 'priority'>>) {
    setBusyTodoId(id)

    try {
      await api(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
      await loadTodos()
      showToast('success', 'Todo updated.')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Unable to update todo.')
    } finally {
      setBusyTodoId(null)
    }
  }

  async function deleteTodo(todo: Todo) {
    const confirmed = window.confirm(`Delete "${todo.title}"? This cannot be undone.`)
    if (!confirmed) return
    setBusyTodoId(todo.id)

    try {
      await api(`/todos/${todo.id}`, { method: 'DELETE' })
      await loadTodos()
      showToast('success', 'Todo deleted.')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Unable to delete todo.')
    } finally {
      setBusyTodoId(null)
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
      <main className="min-h-screen bg-[#f7f6f2] px-4 py-8 text-stone-950 sm:px-6">
        <ToastMessage toast={toast} />
        <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-sm font-medium text-stone-600 shadow-sm shadow-stone-200/50">
              <ShieldCheck size={17} className="text-teal-700" />
              Private workspaces for local users
            </div>
            <div className="space-y-5">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-normal text-stone-950 sm:text-6xl">
                A quieter place to finish your day.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-stone-600">
                Plan the next task, surface what is overdue, and keep completed work neatly out of the way.
              </p>
            </div>
            <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
              {['Due dates', 'Priorities', 'Fast search'].map((item) => (
                <div key={item} className="rounded-lg border border-stone-200 bg-white/85 p-4 shadow-sm shadow-stone-200/60">
                  <p className="text-sm font-semibold text-stone-900">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleAuth} className="rounded-lg border border-stone-200 bg-white p-6 shadow-2xl shadow-stone-300/25">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-950">
                {mode === 'login' ? 'Sign in to your list' : 'Start your private list'}
              </h2>
            </div>
            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-medium text-stone-700">Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-stone-50/60 px-4 py-3 outline-none transition focus:border-stone-400 focus:bg-white focus:ring-4 focus:ring-stone-100"
                placeholder="alex"
                autoComplete="username"
              />
            </label>
            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-medium text-stone-700">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-stone-50/60 px-4 py-3 outline-none transition focus:border-stone-400 focus:bg-white focus:ring-4 focus:ring-stone-100"
                placeholder="At least 6 characters"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>
            {authError && <InlineMessage type="error" message={authError} />}
            <button
              disabled={isAuthenticating}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAuthenticating && <Loader2 size={17} className="animate-spin" />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setAuthError('')
              }}
              className="mt-3 w-full rounded-lg px-4 py-3 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
            >
              {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] px-3 py-4 text-stone-950 sm:px-6 sm:py-8 lg:px-8">
      <ToastMessage toast={toast} />
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-5 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Personal workspace</p>
            <h1 className="text-4xl font-semibold tracking-normal text-stone-950 sm:text-5xl">Today</h1>
            <p className="text-sm text-stone-500">Signed in as {session.user.username}</p>
          </div>
          <button
            onClick={() => setSession(null)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 shadow-sm shadow-stone-200/60 transition hover:border-stone-300 hover:bg-stone-50 sm:w-auto"
          >
            <LogOut size={17} />
            Logout
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
            <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-xl shadow-stone-300/20 sm:p-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-950">New task</h2>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-500">Quick add</span>
              </div>
              <form onSubmit={addTodo} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-stone-700">Task</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-stone-50/60 px-4 py-3 outline-none transition focus:border-stone-400 focus:bg-white focus:ring-4 focus:ring-stone-100"
                    placeholder="Write project brief"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-stone-700">Due date</span>
                    <input
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className="w-full rounded-lg border border-stone-200 bg-stone-50/60 px-4 py-3 outline-none transition focus:border-stone-400 focus:bg-white focus:ring-4 focus:ring-stone-100"
                      type="date"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-stone-700">Priority</span>
                    <select
                      value={priority}
                      onChange={(event) => setPriority(event.target.value as Priority)}
                      className="w-full rounded-lg border border-stone-200 bg-stone-50/60 px-4 py-3 outline-none transition focus:border-stone-400 focus:bg-white focus:ring-4 focus:ring-stone-100"
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </label>
                </div>
                <button
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
                  Add task
                </button>
              </form>
            </section>

            <section className="grid grid-cols-3 gap-3">
              <Stat label="Today" value={stats.today} tone="teal" />
              <Stat label="Done" value={stats.completed} tone="stone" />
              <Stat label="Open" value={stats.active} tone="rose" />
            </section>
          </aside>

          <section className="min-w-0 rounded-lg border border-stone-200 bg-white p-3 shadow-xl shadow-stone-300/20 sm:p-5">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid grid-cols-3 rounded-lg border border-stone-200 bg-stone-50 p-1">
                {(['all', 'active', 'completed'] as Filter[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={clsx(
                      'rounded-md px-3 py-2 text-sm font-semibold capitalize transition sm:px-4',
                      filter === item
                        ? 'bg-white text-stone-950 shadow-sm shadow-stone-200/80'
                        : 'text-stone-500 hover:text-stone-900',
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
                className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <label className="relative min-w-0">
                  <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-stone-50/60 py-3 pl-10 pr-3 outline-none transition focus:border-stone-400 focus:bg-white focus:ring-4 focus:ring-stone-100"
                    placeholder="Search tasks"
                  />
                </label>
                <button className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-800 shadow-sm shadow-stone-200/60 transition hover:bg-stone-50">
                  Search
                </button>
              </form>
            </div>

            {isLoading && <LoadingState />}

            {!isLoading && todos.length === 0 && <EmptyState filter={filter} hasSearch={Boolean(search.trim())} />}

            {!isLoading && todos.length > 0 && (
              <div className="space-y-3">
                {todos.map((todo) => {
                  const overdue = isOverdue(todo)
                  const busy = busyTodoId === todo.id

                  return (
                    <article
                      key={todo.id}
                      className={clsx(
                        'rounded-lg border bg-white p-4 shadow-sm transition sm:p-5',
                        todo.completed && 'border-stone-100 bg-stone-50/70',
                        !todo.completed && !overdue && 'border-stone-200 hover:border-stone-300 hover:shadow-md hover:shadow-stone-200/60',
                        overdue && 'border-rose-200 bg-rose-50/55 shadow-rose-100/70',
                      )}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 flex-1 gap-3">
                          <button
                            disabled={busy}
                            onClick={() => patchTodo(todo.id, { completed: !todo.completed })}
                            className={clsx(
                              'mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50',
                              todo.completed
                                ? 'border-teal-700 bg-teal-700 text-white'
                                : 'border-stone-300 bg-white text-stone-400 hover:border-teal-700 hover:text-teal-700',
                            )}
                            aria-label={todo.completed ? 'Mark active' : 'Mark completed'}
                          >
                            {busy ? <Loader2 size={16} className="animate-spin" /> : todo.completed ? <Check size={16} /> : <Circle size={16} />}
                          </button>

                          <div className="min-w-0 flex-1">
                            {editingId === todo.id ? (
                              <form onSubmit={(event) => submitEdit(event, todo)} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                                <input
                                  value={editingTitle}
                                  onChange={(event) => setEditingTitle(event.target.value)}
                                  className="min-w-0 rounded-lg border border-stone-200 bg-white px-3 py-2 outline-none focus:border-stone-400 focus:ring-4 focus:ring-stone-100"
                                  autoFocus
                                />
                                <button className="rounded-lg bg-stone-950 px-3 py-2 text-sm font-semibold text-white">Save</button>
                              </form>
                            ) : (
                              <h3 className={clsx('break-words text-base font-semibold text-stone-950 sm:text-lg', todo.completed && 'text-stone-400 line-through')}>
                                {todo.title}
                              </h3>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2">
                              {overdue && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700">
                                  <AlertTriangle size={14} />
                                  Overdue
                                </span>
                              )}
                              <span className={clsx('rounded-full border px-3 py-1 text-xs font-semibold', priorityStyles[todo.priority])}>
                                {todo.priority}
                              </span>
                              <span
                                className={clsx(
                                  'inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1 text-xs font-semibold',
                                  overdue ? 'border-rose-200 text-rose-700' : 'border-stone-200 text-stone-500',
                                )}
                              >
                                <CalendarDays size={14} />
                                {todo.dueDate ? formatDate(todo.dueDate) : 'No due date'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
                          <select
                            disabled={busy}
                            value={todo.priority}
                            onChange={(event) => patchTodo(todo.id, { priority: event.target.value as Priority })}
                            className="min-w-0 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-stone-400 disabled:opacity-50"
                            aria-label="Change priority"
                          >
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                          </select>
                          <input
                            disabled={busy}
                            value={todo.dueDate ?? ''}
                            onChange={(event) => patchTodo(todo.id, { dueDate: event.target.value || null })}
                            className="min-w-0 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-stone-400 disabled:opacity-50"
                            type="date"
                            aria-label="Change due date"
                          />
                          <button
                            disabled={busy}
                            onClick={() => startEditing(todo)}
                            className="rounded-lg border border-stone-200 bg-white p-2 text-stone-500 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-50"
                            aria-label="Edit todo"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => deleteTodo(todo)}
                            className="rounded-lg border border-stone-200 bg-white p-2 text-stone-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                            aria-label="Delete todo"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'teal' | 'stone' | 'rose' }) {
  const toneClass = {
    teal: 'text-teal-700',
    stone: 'text-stone-900',
    rose: 'text-rose-700',
  }[tone]

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 text-center shadow-sm shadow-stone-200/60">
      <p className={clsx('text-2xl font-semibold', toneClass)}>{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">{label}</p>
    </div>
  )
}

function ToastMessage({ toast }: { toast: Toast }) {
  if (!toast) return null

  return (
    <div className="fixed left-3 right-3 top-3 z-50 mx-auto max-w-md sm:left-auto sm:right-6 sm:top-6">
      <div
        className={clsx(
          'flex items-start gap-3 rounded-lg border bg-white px-4 py-3 text-sm font-medium shadow-xl shadow-stone-300/30',
          toast.type === 'success' ? 'border-teal-200 text-teal-800' : 'border-rose-200 text-rose-800',
        )}
      >
        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
        <span>{toast.message}</span>
      </div>
    </div>
  )
}

function InlineMessage({ type, message }: { type: 'error'; message: string }) {
  return (
    <p
      className={clsx(
        'mb-4 rounded-lg border px-4 py-3 text-sm font-medium',
        type === 'error' && 'border-rose-200 bg-rose-50 text-rose-700',
      )}
    >
      {message}
    </p>
  )
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-lg border border-stone-200 bg-stone-50 p-5">
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-stone-200" />
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-20 animate-pulse rounded-full bg-stone-200" />
            <div className="h-6 w-28 animate-pulse rounded-full bg-stone-200" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ filter, hasSearch }: { filter: Filter; hasSearch: boolean }) {
  const title = hasSearch ? 'No matching tasks' : filter === 'completed' ? 'No completed tasks yet' : 'No tasks here'
  const body = hasSearch
    ? 'Try a different search term or clear the search field.'
    : filter === 'active'
      ? 'Everything active is already handled. Nice and quiet.'
      : 'Add your first task from the panel on the left.'

  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50/70 px-5 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500">
        <Inbox size={22} />
      </div>
      <p className="mt-4 text-lg font-semibold text-stone-950">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-500">{body}</p>
    </div>
  )
}

function todayIso() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isOverdue(todo: Todo) {
  return Boolean(todo.dueDate && !todo.completed && todo.dueDate < todayIso())
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${month}/${day}/${year}`
}

export default App
