import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, Users, CheckSquare, TrendingUp, ArrowRight, Clock } from 'lucide-react'
import { fetchProjects } from '../../store/store'
import { fetchMyTasks }  from '../../store/store'
import { fetchTeam }     from '../../store/store'
import { Avatar, StatusBadge, PriorityBadge, ProgressBar, PageSpinner } from '../../components/ui'
 
const PRIORITY_COLORS = { critical: '#DC2626', high: '#EA580C', medium: '#D97706', low: '#16A34A' }
 
export default function Dashboard() {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const { user }  = useSelector(s => s.auth)
  const { current: ws } = useSelector(s => s.workspace)
  const { list: projects, loading } = useSelector(s => s.projects)
  const { myTasks }     = useSelector(s => s.tasks)
  const { list: team }  = useSelector(s => s.team)
 
  useEffect(() => {
    if (ws?.id) {
      dispatch(fetchProjects(ws.id))
      dispatch(fetchTeam(ws.id))
    }
    dispatch(fetchMyTasks())
  }, [ws?.id])
 
  const activeProjects = projects.filter(p => p.status === 'active').length
  const stats = [
    { label: 'Total Projects',  value: projects.length, icon: FolderKanban, bg: 'bg-blue-50 dark:bg-blue-900/30',    txt: 'text-blue-600',   border: 'border-blue-100 dark:border-blue-800' },
    { label: 'Active Projects', value: activeProjects,  icon: TrendingUp,   bg: 'bg-emerald-50 dark:bg-emerald-900/30', txt: 'text-emerald-600',border: 'border-emerald-100 dark:border-emerald-800' },
    { label: 'Team Members',    value: team.length,     icon: Users,        bg: 'bg-violet-50 dark:bg-violet-900/30',  txt: 'text-violet-600', border: 'border-violet-100 dark:border-violet-800' },
    { label: 'Open Tasks',      value: myTasks.length,  icon: CheckSquare,  bg: 'bg-amber-50 dark:bg-amber-900/30',   txt: 'text-amber-600',  border: 'border-amber-100 dark:border-amber-800' },
  ]
 
  if (loading && projects.length === 0) return <PageSpinner />
 
  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{ws?.name} · {new Date().toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}</p>
      </div>
 
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, bg, txt, border }) => (
          <div key={label} className={`card p-5 border ${border}`}>
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={20} className={txt} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{label}</div>
          </div>
        ))}
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Recent Projects</h2>
            <button onClick={() => navigate('/projects')}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
              View all <ArrowRight size={14} />
            </button>
          </div>
 
          {projects.length === 0 ? (
            <div className="text-center py-10">
              <FolderKanban size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No projects yet</p>
              <button onClick={() => navigate('/projects')} className="btn-primary mt-3 text-xs py-2">Create Project</button>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 5).map(p => (
                <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                  className="flex items-center gap-4 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 cursor-pointer transition-all group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">{p.name}</span>
                      <StatusBadge value={p.status} />
                    </div>
                    <div className="flex items-center gap-2.5">
                      <ProgressBar value={p.progress} color={PRIORITY_COLORS[p.priority]} height={4} />
                      <span className="text-xs text-gray-400 font-medium shrink-0">{p.progress}%</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right hidden sm:block">
                    <PriorityBadge value={p.priority} />
                    {p.end_date && <p className="text-xs text-gray-400 mt-1">{new Date(p.end_date).toLocaleDateString('en-GB', {day:'2-digit',month:'short'})}</p>}
                  </div>
                  <ArrowRight size={15} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-400 transition-colors shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
 
        {/* My Tasks */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">My Tasks</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full font-medium">{myTasks.length} open</span>
          </div>
 
          {myTasks.length === 0 ? (
            <div className="text-center py-10">
              <CheckSquare size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">All caught up! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myTasks.slice(0, 8).map(t => (
                <button key={t.id} onClick={() => navigate(`/task/${t.id}?projectId=${t.project_id}`)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors group border border-transparent hover:border-gray-200 dark:hover:border-gray-600">
                  <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: PRIORITY_COLORS[t.priority] || '#9CA3AF' }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-gray-900 dark:group-hover:text-white">{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400 capitalize">{(t.status || '').replace(/_/g, ' ')}</p>
                      {t.due_date && (
                        <span className="flex items-center gap-0.5 text-xs text-gray-400">
                          <Clock size={10} />
                          {new Date(t.due_date).toLocaleDateString('en-GB', {day:'2-digit',month:'short'})}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
 
      {/* Team */}
      {team.length > 0 && (
        <div className="card p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Team Members</h2>
            <button onClick={() => navigate('/team')} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
              Manage <ArrowRight size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {team.slice(0, 10).map(m => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-full border border-gray-100 dark:border-gray-600">
                <Avatar user={m} size="xs" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{m.name}</span>
              </div>
            ))}
            {team.length > 10 && <span className="text-xs text-gray-400 px-2">+{team.length - 10} more</span>}
          </div>
        </div>
      )}
    </div>
  )
}