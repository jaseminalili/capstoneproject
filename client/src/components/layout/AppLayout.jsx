import { useState, useRef, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  LayoutDashboard, FolderKanban, Users, Settings, CheckSquare,
  ChevronDown, ChevronRight, Plus, LogOut, Search, Bell, Circle, Menu, X
} from 'lucide-react'
import { logout, setCurrentWorkspace, fetchProjects, fetchMyTasks, fetchTeam } from '../../store/store'
import { Avatar } from '../ui'

// ── Priority dot colors ────────────────────────────────────────────────────────
const PRIORITY_DOT = { critical:'bg-red-600', high:'bg-orange-500', medium:'bg-amber-400', low:'bg-green-500' }
const STATUS_DOT   = { active:'text-emerald-500', planning:'text-blue-400', completed:'text-gray-400', on_hold:'text-amber-400', cancelled:'text-red-400' }

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ mobile, onClose }) {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const { pathname } = useLocation()
  const { current: ws, list: workspaces } = useSelector(s => s.workspace)
  const { list: projects } = useSelector(s => s.projects)
  const { myTasks }        = useSelector(s => s.tasks)
  const { user }           = useSelector(s => s.auth)

  const [wsOpen, setWsOpen]       = useState(false)
  const [tasksOpen, setTasksOpen] = useState(false)
  const [projsOpen, setProjsOpen] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    const handler = e => { if (wsRef.current && !wsRef.current.contains(e.target)) setWsOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const go = path => { navigate(path); mobile && onClose?.() }

  const switchWorkspace = w => {
    dispatch(setCurrentWorkspace(w))
    dispatch(fetchProjects(w.id))
    dispatch(fetchTeam(w.id))
    setWsOpen(false)
    go('/dashboard')
  }

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Projects',  icon: FolderKanban,    path: '/projects'  },
    { label: 'Team',      icon: Users,           path: '/team'      },
    { label: 'Settings',  icon: Settings,        path: '/settings'  },
  ]

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Workspace Switcher */}
      <div className="p-4 border-b border-gray-100 relative" ref={wsRef}>
        <button onClick={() => setWsOpen(o => !o)}
          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors text-left">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
            {ws?.name?.[0] || 'T'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{ws?.name || 'Select Workspace'}</p>
            <p className="text-xs text-gray-400">{workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}</p>
          </div>
          <ChevronDown size={15} className={`text-gray-400 shrink-0 transition-transform duration-200 ${wsOpen ? 'rotate-180' : ''}`} />
        </button>

        {wsOpen && (
          <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-50">
            <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Workspaces</p>
            {workspaces.map(w => (
              <button key={w.id} onClick={() => switchWorkspace(w)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${ws?.id === w.id ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{w.name[0]}</div>
                <span className="truncate">{w.name}</span>
                {ws?.id === w.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
              </button>
            ))}
            <div className="border-t border-gray-100 mt-1 pt-1">
              <button onClick={() => { setWsOpen(false); go('/settings') }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium transition-colors">
                <Plus size={14} /> New Workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map(({ label, icon: Icon, path }) => {
          const active = pathname === path || (path !== '/dashboard' && pathname.startsWith(path))
          return (
            <button key={path} onClick={() => go(path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}>
              <Icon size={18} className={active ? 'text-blue-600' : ''} />
              {label}
            </button>
          )
        })}

        {/* My Tasks */}
        <div className="pt-2">
          <button onClick={() => setTasksOpen(o => !o)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            <CheckSquare size={18} />
            <span className="flex-1 text-left">My Tasks</span>
            {myTasks.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">{myTasks.length}</span>
            )}
            {tasksOpen ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
          </button>
          {tasksOpen && (
            <div className="ml-8 mt-1 space-y-0.5">
              {myTasks.length === 0 && <p className="text-xs text-gray-400 px-2 py-2">No open tasks</p>}
              {myTasks.slice(0, 8).map(t => (
                <button key={t.id} onClick={() => go(`/task/${t.id}?projectId=${t.project_id}`)}
                  className="w-full flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left transition-colors group">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${PRIORITY_DOT[t.priority] || 'bg-gray-400'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate group-hover:text-gray-900">{t.title}</p>
                    <p className="text-[10px] text-gray-400 capitalize mt-0.5">{(t.status || '').replace(/_/g, ' ')}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Projects List */}
        <div className="pt-1">
          <div className="flex items-center justify-between px-3 mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Projects</span>
            <button onClick={() => go('/projects')} className="text-gray-400 hover:text-blue-600 transition-colors p-0.5">
              <Plus size={13} />
            </button>
          </div>
          <button onClick={() => setProjsOpen(o => !o)}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition-colors">
            {projsOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            <span>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
          </button>
          {projsOpen && projects.map(p => (
            <button key={p.id} onClick={() => go(`/projects/${p.id}`)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-left transition-colors ${pathname === `/projects/${p.id}` ? 'bg-gray-50' : ''}`}>
              <Circle size={7} fill="currentColor" className={`shrink-0 ${STATUS_DOT[p.status] || 'text-gray-400'}`} />
              <span className="text-xs text-gray-600 truncate">{p.name}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* User Profile */}
      {user && (
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2.5 px-1 py-1">
            <Avatar user={user} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            <button onClick={() => { dispatch(logout()); navigate('/login') }}
             className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mt-1 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all">
            <LogOut size={16} />
              Sign Out
             </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Top Bar ────────────────────────────────────────────────────────────────────
function TopBar({ onMenuClick }) {
  const navigate  = useNavigate()
  const projects  = useSelector(s => s.projects.list)
  const myTasks   = useSelector(s => s.tasks.myTasks)
  const { user }  = useSelector(s => s.auth)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const results = q.trim().length > 1 ? [
    ...projects.filter(p => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 4).map(p => ({ ...p, _type: 'project' })),
    ...myTasks.filter(t  => t.title.toLowerCase().includes(q.toLowerCase())).slice(0, 4).map(t => ({ ...t, _type: 'task' })),
  ] : []

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 sm:px-6 gap-4 shrink-0 z-20">
      <button onClick={onMenuClick} className="lg:hidden p-2 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-md" ref={ref}>
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={q} onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search projects and tasks…"
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all"
        />
        {open && results.length > 0 && (
          <div className="absolute top-full mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-50">
            {results.map(r => (
              <button key={r.id} onClick={() => {
                setQ(''); setOpen(false)
                r._type === 'task' ? navigate(`/task/${r.id}?projectId=${r.project_id}`) : navigate(`/projects/${r.id}`)
              }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${r._type === 'task' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {r._type}
                </span>
                <span className="text-sm text-gray-800 truncate">{r.name || r.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Link to="/settings" className="hidden sm:flex">
          <Avatar user={user} size="sm" className="cursor-pointer hover:opacity-80 transition-opacity" />
        </Link>
      </div>
    </header>
  )
}

// ── App Layout ─────────────────────────────────────────────────────────────────
export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl z-50">
            <div className="absolute top-3 right-3">
              <button onClick={() => setMobileOpen(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <Sidebar mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
