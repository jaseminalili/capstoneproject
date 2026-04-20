import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Send, Calendar, Pencil, Check, X, Clock, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  fetchTaskDetail, updateTask, addComment, editComment, deleteComment, clearCurrentTask, patchProjectProgress
} from '../../store/store'
import { Avatar, StatusBadge, PriorityBadge, TypeBadge, ProgressBar, PageSpinner } from '../../components/ui'
 
const STATUS_OPTS   = [{v:'backlog',l:'Backlog'},{v:'todo',l:'Todo'},{v:'in_progress',l:'In Progress'},{v:'in_review',l:'In Review'},{v:'done',l:'Done'},{v:'cancelled',l:'Cancelled'}]
const PRIORITY_OPTS = [{v:'critical',l:'Critical'},{v:'high',l:'High'},{v:'medium',l:'Medium'},{v:'low',l:'Low'}]
const TYPE_OPTS     = [{v:'task',l:'Task'},{v:'bug',l:'Bug'},{v:'feature',l:'Feature'},{v:'improvement',l:'Improvement'},{v:'story',l:'Story'},{v:'epic',l:'Epic'}]
 
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'
const fmtTime = d => d ? new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : ''
 
function InlineSelect({ value, options, onChange, renderBadge }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen(o => !o)} className="hover:opacity-75 transition-opacity">
        {renderBadge(value)}
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 z-40 min-w-[140px]"
          onMouseLeave={() => setOpen(false)}>
          {options.map(o => (
            <button key={o.v} onClick={() => { onChange(o.v); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors ${value === o.v ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
              {o.l}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
 
export function TaskDetail() {
  const { id }       = useParams()
  const [params]     = useSearchParams()
  const navigate     = useNavigate()
  const dispatch     = useDispatch()
  const { current: task, loading } = useSelector(s => s.tasks)
  const { user }     = useSelector(s => s.auth)
  const [comment, setComment]     = useState('')
  const [posting, setPosting]     = useState(false)
  const [editTitle, setEditTitle] = useState(false)
  const [newTitle,  setNewTitle]  = useState('')
 
  // Edit comment state
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingContent,   setEditingContent]   = useState('')
  const [savingComment,    setSavingComment]     = useState(false)
 
  useEffect(() => {
    if (id) dispatch(fetchTaskDetail(id))
    return () => dispatch(clearCurrentTask())
  }, [id])
 
  const patch = async data => {
    if (!task) return
    try {
      const res = await dispatch(updateTask({ id: task.id, data })).unwrap()
      if (res.data?.progress !== undefined) {
        dispatch(patchProjectProgress({ id: task.project_id, progress: res.data.progress }))
      }
    } catch (e) { toast.error(e.message) }
  }
 
  const postComment = async e => {
    e.preventDefault()
    if (!comment.trim()) return
    setPosting(true)
    try {
      await dispatch(addComment({ id: task.id, content: comment.trim() })).unwrap()
      setComment('')
    } catch (e) { toast.error(e.message) }
    finally { setPosting(false) }
  }
 
  // Start editing a comment
  const startEdit = (c) => {
    setEditingCommentId(c.id)
    setEditingContent(c.content)
  }
 
  // Cancel editing
  const cancelEdit = () => {
    setEditingCommentId(null)
    setEditingContent('')
  }
 
  // Save edited comment
  const saveEdit = async (commentId) => {
    if (!editingContent.trim()) return
    setSavingComment(true)
    try {
      await dispatch(editComment({ taskId: task.id, commentId, content: editingContent.trim() })).unwrap()
      setEditingCommentId(null)
      setEditingContent('')
      toast.success('Comment updated!')
    } catch (e) { toast.error(e.message) }
    finally { setSavingComment(false) }
  }
 
  // Delete comment
  const handleDeleteComment = async (commentId) => {
    try {
      await dispatch(deleteComment({ taskId: task.id, commentId })).unwrap()
      toast.success('Comment deleted.')
    } catch (e) { toast.error(e.message) }
  }
 
  const backUrl = params.get('projectId') ? `/projects/${params.get('projectId')}` : '/projects'
 
  if (loading || !task) return <PageSpinner />
 
  const proj = task.project
 
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Back bar */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0 flex items-center gap-3">
        <button onClick={() => navigate(backUrl)}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">
          <ArrowLeft size={16} /> Back to Project
        </button>
        <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">·</span>
        <span className="text-sm text-gray-500 dark:text-gray-400 truncate hidden sm:inline">{task.title}</span>
      </div>
 
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Discussion ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-100 dark:border-gray-700 min-w-0">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare size={18} className="text-gray-400 dark:text-gray-500" />
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                Task Discussion ({task.comments?.length || 0})
              </h3>
            </div>
 
            {(!task.comments || task.comments.length === 0) ? (
              <div className="text-center py-16">
                <MessageSquare size={36} className="mx-auto text-gray-200 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">No comments yet.</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Be the first to start the discussion.</p>
              </div>
            ) : task.comments.map(c => (
              <div key={c.id} className="flex gap-3.5 mb-6 group">
                <Avatar user={{ name: c.user_name, avatar: c.user_avatar, color: c.user_color }} size="sm" className="shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{c.user_name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{fmtTime(c.created_at)}</span>
                    {c.is_edited && <span className="text-xs text-gray-400 dark:text-gray-500 italic">(edited)</span>}
 
                    {/* Edit / Delete buttons — only for comment author */}
                    {user?.id === c.user_id && editingCommentId !== c.id && (
                      <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(c)}
                          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDeleteComment(c.id)}
                          className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
 
                  {/* Edit mode */}
                  {editingCommentId === c.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingContent}
                        onChange={e => setEditingContent(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(c.id) }
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        autoFocus
                        rows={3}
                        className="input-field resize-none text-sm leading-relaxed w-full"
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={() => saveEdit(c.id)} disabled={savingComment || !editingContent.trim()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                          <Check size={12} /> {savingComment ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={cancelEdit}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-lg transition-colors">
                          <X size={12} /> Cancel
                        </button>
                        <span className="text-xs text-gray-400">Esc to cancel</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {c.content}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
 
          {/* Comment input */}
          <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
            <form onSubmit={postComment} className="flex gap-3">
              <Avatar user={user} size="sm" className="shrink-0 mt-0.5" />
              <div className="flex-1 relative">
                <textarea
                  value={comment} onChange={e => setComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment(e) } }}
                  placeholder="Write a comment… (Enter to send, Shift+Enter for new line)"
                  rows={3}
                  className="input-field resize-none pr-20 text-sm leading-relaxed"
                />
                <button type="submit" disabled={posting || !comment.trim()}
                  className="absolute right-3 bottom-3 btn-primary py-1.5 px-3 text-xs gap-1">
                  <Send size={12} /> Post
                </button>
              </div>
            </form>
          </div>
        </div>
 
        {/* ── Right: Task Info ──────────────────────────────────────────────── */}
        <div className="w-80 shrink-0 overflow-y-auto bg-white dark:bg-gray-800 p-5 space-y-4">
          {/* Title */}
          <div>
            {editTitle ? (
              <div className="flex gap-2 items-start">
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus
                  className="input-field text-base font-bold flex-1" />
                <button onClick={() => { if (newTitle.trim()) patch({ title: newTitle.trim() }); setEditTitle(false) }}
                  className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 mt-0.5 shrink-0">
                  <Check size={14} />
                </button>
                <button onClick={() => setEditTitle(false)}
                  className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 mt-0.5 shrink-0">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2 group">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white flex-1 leading-snug">{task.title}</h1>
                <button onClick={() => { setNewTitle(task.title); setEditTitle(true) }}
                  className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-all shrink-0">
                  <Pencil size={13} />
                </button>
              </div>
            )}
          </div>
 
          {/* Clickable badges */}
          <div className="flex flex-wrap gap-2">
            <InlineSelect value={task.status}   options={STATUS_OPTS}   onChange={v => patch({ status: v })}   renderBadge={v => <StatusBadge value={v} />} />
            <InlineSelect value={task.type}     options={TYPE_OPTS}     onChange={v => patch({ type: v })}     renderBadge={v => <TypeBadge value={v} />} />
            <InlineSelect value={task.priority} options={PRIORITY_OPTS} onChange={v => patch({ priority: v })} renderBadge={v => <PriorityBadge value={v} />} />
          </div>
 
          {/* Description */}
          {task.description && (
            <div className="bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl p-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {task.description}
            </div>
          )}
 
          {/* Assignee */}
          {task.assignee_name && (
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-gray-600">
              <Avatar user={{ name: task.assignee_name, avatar: task.assignee_avatar, color: task.assignee_color }} size="sm" />
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">Assignee</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{task.assignee_name}</p>
              </div>
            </div>
          )}
 
          {/* Reporter */}
          {task.reporter_name && (
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-gray-600">
              <Avatar user={{ name: task.reporter_name, avatar: task.reporter_avatar, color: task.reporter_color }} size="sm" />
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">Reporter</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{task.reporter_name}</p>
              </div>
            </div>
          )}
 
          {/* Due date */}
          {task.due_date && (
            <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-gray-600">
              <Calendar size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
              <span>Due: <strong>{fmtDate(task.due_date)}</strong></span>
            </div>
          )}
 
          {/* Hours */}
          {(task.estimated_hours || task.actual_hours) && (
            <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-gray-600">
              <Clock size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
              <span>
                Est: <strong>{task.estimated_hours || 0}h</strong>
                {task.actual_hours ? <> · Actual: <strong>{task.actual_hours}h</strong></> : null}
              </span>
            </div>
          )}
 
          {/* Project Details */}
          {proj && (
            <>
              <hr className="border-gray-100 dark:border-gray-700" />
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Project Details</h3>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Pencil size={12} className="text-gray-400 dark:text-gray-500 shrink-0" />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{proj.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge value={proj.status} />
                    <PriorityBadge value={proj.priority} />
                  </div>
                  <div className="text-xs text-gray-500">
                    Progress: <strong className="text-gray-700 dark:text-gray-300">{proj.progress || 0}%</strong>
                  </div>
                  <ProgressBar value={proj.progress || 0} height={4} />
                  {proj.end_date && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">Due: {fmtDate(proj.end_date)}</p>
                  )}
                </div>
              </div>
            </>
          )}
 
          {/* Activity Log */}
          {task.activities?.length > 0 && (
            <>
              <hr className="border-gray-100 dark:border-gray-700" />
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Recent Activity</h3>
                <div className="space-y-2.5">
                  {task.activities.map(a => (
                    <div key={a.id} className="flex items-start gap-2">
                      <Avatar user={{ name: a.user_name, avatar: a.user_avatar }} size="xs" className="shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-600">
                          <strong>{a.user_name}</strong> {a.action}
                          {a.field && <span className="text-gray-400 dark:text-gray-500"> · {a.field}</span>}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{fmtTime(a.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
 
export default TaskDetail