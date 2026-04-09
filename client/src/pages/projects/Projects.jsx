// ── Projects List ──────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronDown, Pencil, Trash2, FolderKanban } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchProjects, createProject, updateProject, deleteProject, fetchWsUsers } from '../../store/store'
import { StatusBadge, PriorityBadge, ProgressBar, Modal, Avatar, EmptyState, PageSpinner, ConfirmDialog } from '../../components/ui'

const SL = [{v:'active',l:'Active'},{v:'planning',l:'Planning'},{v:'completed',l:'Completed'},{v:'on_hold',l:'On Hold'},{v:'cancelled',l:'Cancelled'}]
const PL = [{v:'critical',l:'Critical'},{v:'high',l:'High'},{v:'medium',l:'Medium'},{v:'low',l:'Low'}]

function FilterDropdown({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const sel = options.find(o => o.v === value)
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="btn-secondary text-sm py-2 min-w-[130px] justify-between">
        <span>{sel ? sel.l : label}</span>
        <ChevronDown size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-30 min-w-full" onMouseLeave={() => setOpen(false)}>
          <button onClick={() => { onChange(''); setOpen(false) }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${!value ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>{label}</button>
          {options.map(o => (
            <button key={o.v} onClick={() => { onChange(o.v); setOpen(false) }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${value === o.v ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'}`}>{o.l}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectForm({ ws, members, initial, onSave, onClose }) {
  const [f, setF] = useState(initial
    ? { name: initial.name, description: initial.description||'', status: initial.status, priority: initial.priority, start_date: initial.start_date?.slice(0,10)||'', end_date: initial.end_date?.slice(0,10)||'', lead_id: initial.lead_id||'', member_ids: (initial.members||[]).map(m => m.id||m) }
    : { name:'', description:'', status:'planning', priority:'medium', start_date:'', end_date:'', lead_id:'', member_ids:[] })
  const [busy, setBusy] = useState(false)
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))
  const toggle = id => setF(p => ({ ...p, member_ids: p.member_ids.includes(id) ? p.member_ids.filter(x => x !== id) : [...p.member_ids, id] }))

  const submit = async () => {
    if (!f.name.trim()) { toast.error('Project name is required.'); return }
    setBusy(true)
    try { await onSave({ ...f, lead_id: f.lead_id || null }); onClose(); toast.success(initial ? 'Project updated!' : 'Project created!') }
    catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name <span className="text-red-500">*</span></label>
        <input value={f.name} onChange={e => s('name', e.target.value)} placeholder="e.g. Kubernetes Migration" className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
        <textarea value={f.description} onChange={e => s('description', e.target.value)} rows={3} placeholder="Brief description of the project…" className="input-field resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
          <select value={f.status} onChange={e => s('status', e.target.value)} className="input-field">
            {SL.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
          <select value={f.priority} onChange={e => s('priority', e.target.value)} className="input-field">
            {PL.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
          <input type="date" value={f.start_date} onChange={e => s('start_date', e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
          <input type="date" value={f.end_date} onChange={e => s('end_date', e.target.value)} className="input-field" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Lead</label>
        <select value={f.lead_id} onChange={e => s('lead_id', e.target.value)} className="input-field">
          <option value="">No lead</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Team Members</label>
        <div className="flex flex-wrap gap-2">
          {members.map(m => {
            const sel = f.member_ids.includes(m.id)
            return (
              <button key={m.id} type="button" onClick={() => toggle(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${sel ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                <Avatar user={m} size="xs" />
                {m.name}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={submit} disabled={busy} className="btn-primary">
          {busy ? 'Saving…' : initial ? 'Save Changes' : 'Create Project'}
        </button>
      </div>
    </div>
  )
}

export default function Projects() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { current: ws } = useSelector(s => s.workspace)
  const { list: projects, loading } = useSelector(s => s.projects)
  const { wsUsers: members } = useSelector(s => s.team)
  const [search, setSearch]   = useState('')
  const [sf, setSf]           = useState('')
  const [pf, setPf]           = useState('')
  const [modal, setModal]     = useState(null)
  const [delId, setDelId]     = useState(null)

  useEffect(() => {
    if (ws?.id) { dispatch(fetchProjects(ws.id)); dispatch(fetchWsUsers(ws.id)) }
  }, [ws?.id])

  const visible = projects
    .filter(p => (!sf || p.status === sf) && (!pf || p.priority === pf))
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  const handleSave = async form => {
    if (modal === 'new') await dispatch(createProject({ wsId: ws.id, data: form })).unwrap()
    else await dispatch(updateProject({ id: modal.id, data: form })).unwrap()
  }

  const handleDelete = async () => {
    try { await dispatch(deleteProject(delId)).unwrap(); toast.success('Project deleted.') }
    catch (e) { toast.error(e.message) }
  }

  if (loading && projects.length === 0) return <PageSpinner />

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track your workspace projects</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary">
          <Plus size={16} /> New Project
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…"
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-56" />
        </div>
        <FilterDropdown label="All Statuses"   options={SL} value={sf} onChange={setSf} />
        <FilterDropdown label="All Priorities" options={PL} value={pf} onChange={setPf} />
        {(sf || pf || search) && (
          <button onClick={() => { setSf(''); setPf(''); setSearch('') }} className="text-sm text-gray-500 hover:text-gray-700 underline">Clear filters</button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects found" description={search || sf || pf ? 'Try adjusting your filters.' : 'Create your first project to get started.'} action={<button onClick={() => setModal('new')} className="btn-primary"><Plus size={15}/>Create Project</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visible.map(p => (
            <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
              className="card p-5 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all duration-200 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 mr-2">
                  <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{p.name}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setModal(p)} className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"><Pencil size={13}/></button>
                  <button onClick={() => setDelId(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={13}/></button>
                </div>
              </div>

              <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed min-h-[2rem]">{p.description || 'No description provided.'}</p>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <StatusBadge value={p.status} />
                <PriorityBadge value={p.priority} />
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Progress</span><span className="font-semibold">{p.progress ?? 0}%</span>
                </div>
                <ProgressBar value={p.progress ?? 0} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex -space-x-1.5">
                  {(p.members || []).slice(0, 4).map((m, i) => (
                    <div key={m.id || i} style={{ zIndex: 10 - i }}>
                      <Avatar user={m} size="xs" className="ring-2 ring-white" />
                    </div>
                  ))}
                  {(p.members || []).length > 4 && (
                    <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[9px] font-bold text-gray-600">
                      +{(p.members||[]).length - 4}
                    </div>
                  )}
                </div>
                {p.end_date && (
                  <span className="text-xs text-gray-400">{new Date(p.end_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Create New Project' : 'Edit Project'} subtitle={`Workspace: ${ws?.name}`} size="lg">
        <ProjectForm ws={ws} members={members} initial={modal === 'new' ? null : modal} onSave={handleSave} onClose={() => setModal(null)} />
      </Modal>

      <ConfirmDialog isOpen={!!delId} onClose={() => setDelId(null)} onConfirm={handleDelete}
        title="Delete Project" message="This will permanently delete the project and all its tasks. This action cannot be undone." confirmLabel="Delete Project" />
    </div>
  )
}
