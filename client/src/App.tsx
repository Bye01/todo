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
  Low: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  Medium: 'border-blue-100 bg-blue-50 text-blue-700',
  High: 'border-rose-100 bg-rose-50 text-rose-700',
}

const priorityLabels: Record<Priority, string> = {
  Low: '低',
  Medium: '中',
  High: '高',
}

const filterLabels: Record<Filter, string> = {
  all: '全部',
  active: '进行中',
  completed: '已完成',
}

const errorMessages: Record<string, string> = {
  'Too many sign-in attempts. Please try again later.': '登录尝试过于频繁，请稍后再试。',
  'JWT_SECRET environment variable is required.': '服务配置缺失，请联系管理员。',
  'DATABASE_URL environment variable is required.': '数据库配置缺失，请联系管理员。',
  'Authentication is required.': '请先登录后再继续操作。',
  'That username is already taken.': '该用户名已被占用。',
  'Invalid username or password.': '用户名或密码不正确。',
  'Route not found': '请求的接口不存在。',
  'Please check the submitted fields.': '请检查填写内容。',
  'Something went wrong. Please try again.': '操作失败，请稍后重试。',
  'Invalid todo id.': '任务编号无效。',
  'Todo not found.': '任务不存在或已被删除。',
  'Username must be at least 3 characters.': '用户名至少需要 3 个字符。',
  'Username must be 30 characters or fewer.': '用户名不能超过 30 个字符。',
  'Username can only contain letters, numbers, underscores, and hyphens.': '用户名只能包含字母、数字、下划线和连字符。',
  'Password must be at least 6 characters.': '密码至少需要 6 个字符。',
  'Todo title is required.': '请输入任务内容。',
  'At least one field is required.': '请至少修改一项内容。',
  'Request failed': '请求失败，请稍后重试。',
}

const savedSession = localStorage.getItem('todo-session')
const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''

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
    const response = await fetch(`${apiBaseUrl}/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        ...options.headers,
      },
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(toChineseError(payload?.error?.message ?? 'Request failed'))
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
      showToast('success', mode === 'login' ? '登录成功。' : '注册成功。')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : '无法登录，请稍后重试。')
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
      showToast('error', error instanceof Error ? error.message : '待办事项加载失败。')
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
      showToast('success', '待办事项已创建。')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : '待办事项创建失败。')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function patchTodo(id: number, body: Partial<Pick<Todo, 'title' | 'completed' | 'dueDate' | 'priority'>>) {
    setBusyTodoId(id)

    try {
      await api(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
      await loadTodos()
      showToast('success', '待办事项已更新。')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : '待办事项更新失败。')
    } finally {
      setBusyTodoId(null)
    }
  }

  async function deleteTodo(todo: Todo) {
    const confirmed = window.confirm(`确认删除“${todo.title}”？此操作无法撤销。`)
    if (!confirmed) return
    setBusyTodoId(todo.id)

    try {
      await api(`/todos/${todo.id}`, { method: 'DELETE' })
      await loadTodos()
      showToast('success', '待办事项已删除。')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : '待办事项删除失败。')
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
      <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-[#1f2329] sm:px-6">
        <ToastMessage toast={toast} />
        <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_6px_20px_rgba(31,35,41,0.05)]">
              <ShieldCheck size={17} className="text-blue-600" />
              本地用户专属空间
            </div>
            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-[#1f2329] sm:text-6xl">
                更从容地安排今天的事项
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                规划下一步，及时看到逾期任务，也让已完成的事项保持清爽有序。
              </p>
            </div>
            <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
              {['截止日期', '优先级', '快速搜索'].map((item) => (
                <div key={item} className="rounded-xl border border-slate-100 bg-white/90 p-4 shadow-[0_8px_28px_rgba(31,35,41,0.06)]">
                  <p className="text-sm font-semibold text-slate-800">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleAuth} className="rounded-xl border border-slate-100 bg-white p-6 shadow-[0_18px_50px_rgba(31,35,41,0.10)]">
            <div className="mb-6">
              <p className="text-xs font-semibold tracking-[0.08em] text-blue-600">
                {mode === 'login' ? '欢迎回来' : '创建账号'}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#1f2329]">
                {mode === 'login' ? '登录你的待办清单' : '开启你的专属清单'}
              </h2>
            </div>
            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-medium text-slate-700">用户名</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </label>
            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-medium text-slate-700">密码</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                placeholder="至少 6 个字符"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>
            {authError && <InlineMessage type="error" message={authError} />}
            <button
              disabled={isAuthenticating}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAuthenticating && <Loader2 size={17} className="animate-spin" />}
              {mode === 'login' ? '登录' : '注册'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setAuthError('')
              }}
              className="mt-3 h-11 w-full rounded-lg px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-blue-600"
            >
              {mode === 'login' ? '还没有账号？立即注册' : '已有账号？去登录'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-3 py-4 text-[#1f2329] sm:px-6 sm:py-8 lg:px-8">
      <ToastMessage toast={toast} />
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-5 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.08em] text-blue-600">个人工作区</p>
            <h1 className="text-4xl font-semibold tracking-normal text-[#1f2329] sm:text-5xl">今日</h1>
            <p className="text-sm text-slate-500">当前用户：{session.user.username}</p>
          </div>
          <button
            onClick={() => setSession(null)}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-[0_6px_18px_rgba(31,35,41,0.05)] transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:w-auto"
          >
            <LogOut size={17} />
            退出登录
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
            <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-[0_12px_36px_rgba(31,35,41,0.07)] sm:p-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#1f2329]">新建任务</h2>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">快速添加</span>
              </div>
              <form onSubmit={addTodo} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">任务内容</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    placeholder="例如：整理项目简报"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">截止日期</span>
                    <div className="group relative flex h-11 w-full items-center rounded-lg border border-slate-200 bg-slate-50/70 px-4 text-sm transition hover:bg-blue-50/70 focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.12)]">
                      <span className="mr-2 text-base leading-none" aria-hidden="true">
                        📅
                      </span>
                      <span className={clsx('min-w-0 flex-1 truncate', dueDate ? 'text-slate-800' : 'text-slate-400')}>
                        {dueDate || '请选择截止日期'}
                      </span>
                      <input
                        value={dueDate}
                        onChange={(event) => setDueDate(event.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        type="date"
                        aria-label="选择截止日期"
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">优先级</span>
                    <select
                      value={priority}
                      onChange={(event) => setPriority(event.target.value as Priority)}
                      className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    >
                      <option value="Low">低</option>
                      <option value="Medium">中</option>
                      <option value="High">高</option>
                    </select>
                  </label>
                </div>
                <button
                  disabled={isSubmitting}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
                  新建任务
                </button>
              </form>
            </section>

            <section className="grid grid-cols-3 gap-3">
              <Stat label="今日" value={stats.today} tone="teal" />
              <Stat label="已完成" value={stats.completed} tone="stone" />
              <Stat label="进行中" value={stats.active} tone="rose" />
            </section>
          </aside>

          <section className="min-w-0 rounded-xl border border-slate-100 bg-white p-3 shadow-[0_12px_36px_rgba(31,35,41,0.07)] sm:p-5">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid grid-cols-3 rounded-lg border border-slate-200 bg-slate-50 p-1">
                {(['all', 'active', 'completed'] as Filter[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={clsx(
                      'h-10 rounded-md px-3 text-sm font-semibold transition sm:px-4',
                      filter === item
                        ? 'bg-white text-blue-700 shadow-[0_4px_12px_rgba(31,35,41,0.08)]'
                        : 'text-slate-500 hover:text-slate-900',
                    )}
                  >
                    {filterLabels[item]}
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
                  <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    placeholder="搜索待办事项"
                  />
                </label>
                <button className="h-11 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-[0_6px_18px_rgba(31,35,41,0.05)] transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                  搜索
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
                        'rounded-xl border bg-white p-4 shadow-[0_6px_20px_rgba(31,35,41,0.05)] transition sm:p-5',
                        todo.completed && 'border-slate-100 bg-slate-50/70',
                        !todo.completed && !overdue && 'border-slate-100 hover:border-blue-200 hover:shadow-[0_10px_28px_rgba(31,35,41,0.08)]',
                        overdue && 'border-rose-100 bg-rose-50/70 shadow-[0_8px_26px_rgba(225,29,72,0.08)]',
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
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-300 bg-white text-slate-400 hover:border-blue-500 hover:text-blue-600',
                            )}
                            aria-label={todo.completed ? '标记为进行中' : '标记为已完成'}
                          >
                            {busy ? <Loader2 size={16} className="animate-spin" /> : todo.completed ? <Check size={16} /> : <Circle size={16} />}
                          </button>

                          <div className="min-w-0 flex-1">
                            {editingId === todo.id ? (
                              <form onSubmit={(event) => submitEdit(event, todo)} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                                <input
                                  value={editingTitle}
                                  onChange={(event) => setEditingTitle(event.target.value)}
                                  className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                                  autoFocus
                                />
                                <button className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700">保存</button>
                              </form>
                            ) : (
                              <h3 className={clsx('break-words text-base font-semibold leading-7 text-[#1f2329] sm:text-lg', todo.completed && 'text-slate-400 line-through')}>
                                {todo.title}
                              </h3>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2">
                              {overdue && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-white px-3 py-1 text-xs font-semibold text-rose-700">
                                  <AlertTriangle size={14} />
                                  已逾期
                                </span>
                              )}
                              <span className={clsx('rounded-full border px-3 py-1 text-xs font-semibold', priorityStyles[todo.priority])}>
                                {priorityLabels[todo.priority]}
                              </span>
                              <span
                                className={clsx(
                                  'inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1 text-xs font-semibold',
                                  overdue ? 'border-rose-100 text-rose-700' : 'border-slate-100 text-slate-500',
                                )}
                              >
                                <CalendarDays size={14} />
                                {todo.dueDate ? formatDate(todo.dueDate) : '无截止日期'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
                          <select
                            disabled={busy}
                            value={todo.priority}
                            onChange={(event) => patchTodo(todo.id, { priority: event.target.value as Priority })}
                            className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:opacity-50"
                            aria-label="修改优先级"
                          >
                            <option value="Low">低</option>
                            <option value="Medium">中</option>
                            <option value="High">高</option>
                          </select>
                          <input
                            disabled={busy}
                            value={todo.dueDate ?? ''}
                            onChange={(event) => patchTodo(todo.id, { dueDate: event.target.value || null })}
                            className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:opacity-50"
                            type="date"
                            aria-label="修改截止日期"
                          />
                          <button
                            disabled={busy}
                            onClick={() => startEditing(todo)}
                            className="h-10 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                            aria-label="编辑待办事项"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => deleteTodo(todo)}
                            className="h-10 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                            aria-label="删除待办事项"
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
    teal: 'text-blue-700',
    stone: 'text-slate-900',
    rose: 'text-rose-700',
  }[tone]

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 text-center shadow-[0_8px_24px_rgba(31,35,41,0.05)]">
      <p className={clsx('text-2xl font-semibold', toneClass)}>{value}</p>
      <p className="mt-1 text-xs font-semibold tracking-[0.06em] text-slate-400">{label}</p>
    </div>
  )
}

function ToastMessage({ toast }: { toast: Toast }) {
  if (!toast) return null

  return (
    <div className="fixed left-3 right-3 top-3 z-50 mx-auto max-w-md sm:left-auto sm:right-6 sm:top-6">
      <div
        className={clsx(
          'flex items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm font-medium shadow-[0_18px_45px_rgba(31,35,41,0.14)]',
          toast.type === 'success' ? 'border-blue-100 text-blue-800' : 'border-rose-100 text-rose-800',
        )}
      >
        <span
          className={clsx(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
            toast.type === 'success' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600',
          )}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
        </span>
        <span className="leading-6">{toast.message}</span>
      </div>
    </div>
  )
}

function InlineMessage({ type, message }: { type: 'error'; message: string }) {
  return (
    <p
      className={clsx(
        'mb-4 rounded-lg border px-4 py-3 text-sm font-medium leading-6',
        type === 'error' && 'border-rose-100 bg-rose-50 text-rose-700',
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
        <div key={item} className="rounded-xl border border-slate-100 bg-slate-50 p-5">
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" />
            <div className="h-6 w-28 animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ filter, hasSearch }: { filter: Filter; hasSearch: boolean }) {
  const title = hasSearch ? '没有符合条件的待办事项' : filter === 'completed' ? '暂无已完成任务' : '暂无任务'
  const body = hasSearch
    ? '换个关键词试试，或清空搜索内容。'
    : filter === 'active'
      ? '当前没有待完成事项，可以稍微放松一下。'
      : '从左侧面板创建你的第一条待办事项。'

  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-500 shadow-[0_8px_22px_rgba(31,35,41,0.06)]">
        <Inbox size={22} />
      </div>
      <p className="mt-4 text-lg font-semibold text-[#1f2329]">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{body}</p>
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
  return `${year}-${month}-${day}`
}

function toChineseError(message: unknown) {
  if (typeof message !== 'string') return '操作失败，请稍后重试。'
  return errorMessages[message] ?? '操作失败，请稍后重试。'
}

export default App
