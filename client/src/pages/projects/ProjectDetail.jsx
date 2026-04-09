// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT DETAIL
// ═══════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, Pencil, Trash2, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchTasks, createTask, updateTask, deleteTask, fetchWsUsers, patchProjectProgress } from '../../store/store'
import { StatusBadge, PriorityBadge, TypeBadge, Avatar, Modal, ProgressBar, PageSpinner, ConfirmDialog, EmptyState } from '../../components/ui'
import api from '../../api/axios'

const SO=[{v:'backlog',l:'Backlog'},{v:'todo',l:'Todo'},{v:'in_progress',l:'In Progress'},{v:'in_review',l:'In Review'},{v:'done',l:'Done'},{v:'cancelled',l:'Cancelled'}]
const PO=[{v:'critical',l:'Critical'},{v:'high',l:'High'},{v:'medium',l:'Medium'},{v:'low',l:'Low'}]
const TO=[{v:'task',l:'Task'},{v:'bug',l:'Bug'},{v:'feature',l:'Feature'},{v:'improvement',l:'Improvement'},{v:'story',l:'Story'},{v:'epic',l:'Epic'}]
const fmt = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'

function TaskForm({ members, initial, onSave, onClose }) {
  const [f, setF] = useState(initial ? { ...initial, due_date: initial.due_date?.slice(0,10)||'', assignee_id: initial.assignee_id||'' } : { title:'',description:'',status:'todo',priority:'medium',type:'task',assignee_id:'',due_date:'',estimated_hours:'' })
  const [busy, setBusy] = useState(false)
  const s = (k,v) => setF(p => ({...p,[k]:v}))
  const submit = async () => {
    if (!f.title.trim()) { toast.error('Title required.'); return }
    setBusy(true)
    try { await onSave({...f, assignee_id: f.assignee_id||null, due_date: f.due_date||null, estimated_hours: f.estimated_hours||null}); onClose(); toast.success(initial?'Task updated!':'Task created!') }
    catch(e) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label><input value={f.title} onChange={e=>s('title',e.target.value)} placeholder="Task title" className="input-field"/></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label><textarea value={f.description} onChange={e=>s('description',e.target.value)} rows={3} className="input-field resize-none" placeholder="Describe this task…"/></div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label><select value={f.status} onChange={e=>s('status',e.target.value)} className="input-field">{SO.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label><select value={f.priority} onChange={e=>s('priority',e.target.value)} className="input-field">{PO.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label><select value={f.type} onChange={e=>s('type',e.target.value)} className="input-field">{TO.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Assignee</label><select value={f.assignee_id} onChange={e=>s('assignee_id',e.target.value)} className="input-field"><option value="">Unassigned</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label><input type="date" value={f.due_date} onChange={e=>s('due_date',e.target.value)} className="input-field"/></div>
      </div>
      <div className="flex justify-end gap-3 pt-2"><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={submit} disabled={busy} className="btn-primary">{busy?'Saving…':initial?'Save Changes':'Create Task'}</button></div>
    </div>
  )
}

export function ProjectDetail() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { list: tasks, loading } = useSelector(s => s.tasks)
  const { wsUsers: members }    = useSelector(s => s.team)
  const { current: ws }         = useSelector(s => s.workspace)
  const [proj, setProj]   = useState(null)
  const [modal, setModal] = useState(null)
  const [delId, setDelId] = useState(null)

  useEffect(() => {
    dispatch(fetchTasks(id))
    if (ws?.id) dispatch(fetchWsUsers(ws.id))
    api.get(`/projects/${id}`).then(r => setProj(r.data)).catch(console.error)
  }, [id, ws?.id])

  const handleCreate = async form => { const r = await dispatch(createTask({pid:id,data:form})).unwrap(); dispatch(patchProjectProgress({id,progress:r.progress})) }
  const handleUpdate = async (tid,data) => { const r = await dispatch(updateTask({id:tid,data})).unwrap(); dispatch(patchProjectProgress({id,progress:r.progress})) }
  const handleDelete = async () => { try { const r = await dispatch(deleteTask(delId)).unwrap(); dispatch(patchProjectProgress({id,progress:r.progress})); toast.success('Task deleted.') } catch(e){toast.error(e.message)} }

  const GROUPS = {backlog:'Backlog',todo:'To Do',in_progress:'In Progress',in_review:'In Review',done:'Done',cancelled:'Cancelled'}
  const COLORS = {backlog:'bg-slate-100',todo:'bg-gray-100',in_progress:'bg-blue-100',in_review:'bg-violet-100',done:'bg-emerald-100',cancelled:'bg-red-100'}
  const PRIO_DOT = {critical:'#DC2626',high:'#EA580C',medium:'#D97706',low:'#16A34A'}

  if (loading && tasks.length === 0) return <PageSpinner />

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => navigate('/projects')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors font-medium"><ArrowLeft size={15}/>Projects</button>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-600 font-medium truncate">{proj?.name}</span>
      </div>
      <div className="flex items-start justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">{proj?.name||'Project'}</h1><p className="text-sm text-gray-500 mt-1">{proj?.description}</p></div>
        <button onClick={() => setModal('new')} className="btn-primary shrink-0 ml-4"><Plus size={16}/>Add Task</button>
      </div>

      {proj && (
        <div className="card p-4 mb-6 flex items-center gap-6">
          <div className="flex-1"><div className="flex justify-between text-sm mb-1.5"><span className="font-medium text-gray-700">Overall Progress</span><span className="font-bold text-blue-600">{proj.progress??0}%</span></div><ProgressBar value={proj.progress??0}/></div>
          <div className="hidden sm:flex items-center gap-4 shrink-0 text-sm text-gray-500">
            <StatusBadge value={proj.status}/><PriorityBadge value={proj.priority}/>
            {proj.end_date&&<span className="text-xs">{fmt(proj.end_date)}</span>}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(GROUPS).map(([status, label]) => {
          const gt = tasks.filter(t => t.status === status)
          return (
            <div key={status}>
              <div className="flex items-center gap-2.5 mb-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${COLORS[status]}`}>{label}</span>
                <span className="text-xs text-gray-400 font-medium">{gt.length}</span>
              </div>
              {gt.length === 0 ? <p className="text-xs text-gray-400 italic pl-2">No tasks</p> : gt.map(t => (
                <div key={t.id} onClick={() => navigate(`/task/${t.id}?projectId=${id}`)}
                  className="card p-4 mb-2 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:PRIO_DOT[t.priority]||'#9CA3AF'}}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{t.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap"><TypeBadge value={t.type}/>{t.due_date&&<span className="text-xs text-gray-400">{fmt(t.due_date)}</span>}</div>
                  </div>
                  {t.assignee_name&&<Avatar user={{name:t.assignee_name,avatar:t.assignee_avatar,color:t.assignee_color}} size="sm"/>}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>setModal(t)} className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600"><Pencil size={13}/></button>
                    <button onClick={()=>setDelId(t.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"><Trash2 size={13}/></button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal==='new'?'New Task':'Edit Task'} size="lg">
        <TaskForm members={members} initial={modal==='new'?null:modal} onSave={modal==='new'?handleCreate:data=>handleUpdate(modal.id,data)} onClose={()=>setModal(null)}/>
      </Modal>
      <ConfirmDialog isOpen={!!delId} onClose={()=>setDelId(null)} onConfirm={handleDelete} title="Delete Task" message="This will permanently delete this task and its comments." confirmLabel="Delete Task"/>
    </div>
  )
}

export default ProjectDetail
