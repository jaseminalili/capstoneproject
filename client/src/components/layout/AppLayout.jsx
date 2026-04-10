import { useState, useRef, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  LayoutDashboard, FolderKanban, Users, Settings, CheckSquare,
  ChevronDown, ChevronRight, Plus, LogOut, Search, Bell, Circle, Menu, X
} from 'lucide-react'
import {
  logout, setCurrentWorkspace, fetchProjects, fetchMyTasks, fetchTeam,
  fetchNotifications, markAsRead, markAllRead
} from '../../store/store'
import api from '../../api/axios'
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
  const dispatch  = useDispatch()
  const { current: ws } = useSelector(s => s.workspace)
  const { user }  = useSelector(s => s.auth)
  const { list: notifications } = useSelector(s => s.notifications)
  
  const [q, setQ] = useState('')
  const [results, setResults] = useState({ projects: [], tasks: [] })
  const [open, setOpen] = useState(false)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  
  const searchRef = useRef(null)
  const notifyRef = useRef(null)

  useEffect(() => {
    const h = e => { 
      if (searchRef.current && !searchRef.current.contains(e.target)) setOpen(false)
      if (notifyRef.current && !notifyRef.current.contains(e.target)) setNotifyOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults({ projects: [], tasks: [] })
      return
    }
    const delay = setTimeout(async () => {
      if (!ws) return
      setSearching(true)
      try {
        const res = await api.get(`/workspaces/${ws.id}/search?q=${q}`)
        setResults(res.data)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(delay)
  }, [q, ws])

  useEffect(() => {
    dispatch(fetchNotifications())
  }, [dispatch])

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 sm:px-6 gap-4 shrink-0 z-20">
      <button onClick={onMenuClick} className="lg:hidden p-2 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-lg" ref={searchRef}>
        <div className="relative group">
          <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${searching ? 'text-blue-500 animate-pulse' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
          <input
            value={q} onChange={e => { setQ(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Search projects and tasks…"
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all placeholder:text-gray-400"
          />
        </div>
        
        {open && q.trim().length > 1 && (
          <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-2xl shadow-2xl py-2 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-200">
            {searching ? (
               <div className="px-4 py-3 text-xs text-gray-400 italic">Searching...</div>
            ) : results.projects.length === 0 && results.tasks.length === 0 ? (
               <div className="px-4 py-3 text-xs text-gray-400 italic">No results found for "{q}"</div>
            ) : (
              <>
                {results.projects.length > 0 && (
                  <div className="mb-1">
                    <p className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">Projects</p>
                    {results.projects.map(p => (
                      <button key={p.id} onClick={() => { setQ(''); setOpen(false); navigate(`/projects/${p.id}`) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left transition-colors group">
                        <FolderKanban size={14} className="text-gray-400 group-hover:text-blue-500" />
                        <span className="text-sm text-gray-700 font-medium truncate group-hover:text-blue-700">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {results.tasks.length > 0 && (
                  <div>
                    <p className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">Tasks</p>
                    {results.tasks.map(t => (
                      <button key={t.id} onClick={() => { setQ(''); setOpen(false); navigate(`/task/${t.id}?projectId=${t.project_id}`) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left transition-colors group">
                        <CheckSquare size={14} className="text-gray-400 group-hover:text-blue-500" />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-700 font-medium truncate group-hover:text-blue-700">{t.title}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t.project_name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Notifications */}
        <div className="relative" ref={notifyRef}>
          <button onClick={() => setNotifyOpen(!notifyOpen)}
            className={`p-2 rounded-xl transition-all duration-200 relative ${notifyOpen ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}>
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifyOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <span className="text-sm font-bold text-gray-900">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={() => dispatch(markAllRead())} className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bell size={20} className="text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <button key={n.id} onClick={() => { 
                      if (!n.is_read) dispatch(markAsRead(n.id))
                      if (n.link) navigate(n.link)
                      setNotifyOpen(false)
                    }}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 relative ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                      {!n.is_read && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-full" />}
                      <p className="text-sm font-semibold text-gray-900 mb-0.5">{n.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{n.body}</p>
                      <p className="text-[10px] text-gray-400 mt-2 font-medium">{new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </button>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <div className="p-2 bg-gray-50/50 border-t border-gray-100">
                  <button className="w-full py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">
                    View full history
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

        <Link to="/settings" className="flex items-center gap-3 p-1 rounded-xl hover:bg-gray-100 transition-colors group">
          <Avatar user={user} size="sm" border />
          <div className="hidden sm:block text-left mr-1">
            <p className="text-xs font-bold text-gray-900 leading-none mb-1 group-hover:text-blue-600 transition-colors">{user.name}</p>
            <p className="text-[10px] text-gray-400 font-medium leading-none">View Profile</p>
          </div>
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
