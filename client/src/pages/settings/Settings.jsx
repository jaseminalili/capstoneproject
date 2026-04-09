import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Building2, Plus, User, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { createWorkspace, updateWorkspace } from '../../store/store'
import { Avatar, RoleBadge } from '../../components/ui'

export default function Settings() {
  const dispatch = useDispatch()
  const { current: ws, list: workspaces } = useSelector(s => s.workspace)
  const { user } = useSelector(s => s.auth)
  const [wsName, setWsName]     = useState(ws?.name || '')
  const [wsDesc, setWsDesc]     = useState(ws?.description || '')
  const [newWs,  setNewWs]      = useState('')
  const [saving,   setSaving]   = useState(false)
  const [creating, setCreating] = useState(false)
  const [saved, setSaved]       = useState(false)

  useEffect(() => {
    setWsName(ws?.name || '')
    setWsDesc(ws?.description || '')
  }, [ws?.id])

  const saveWs = async () => {
    if (!wsName.trim()) return
    setSaving(true)
    try {
      await dispatch(updateWorkspace({ id: ws.id, data: { name: wsName.trim(), description: wsDesc } })).unwrap()
      toast.success('Workspace updated successfully.')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const addWs = async () => {
    if (!newWs.trim()) return
    setCreating(true)
    try {
      await dispatch(createWorkspace({ name: newWs.trim() })).unwrap()
      setNewWs('')
      toast.success('New workspace created.')
    } catch (e) { toast.error(e.message) }
    finally { setCreating(false) }
  }

  return (
    <div className="p-6 sm:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage workspace settings and your account</p>
      </div>

      {/* Profile Card */}
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-gray-500" />
          <h2 className="text-base font-bold text-gray-900">Your Profile</h2>
        </div>
        <div className="flex items-center gap-4">
          <Avatar user={user} size="xl" />
          <div>
            <p className="text-lg font-bold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <p className="text-xs text-gray-400 mt-1">
              Member since{' '}
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Workspace Settings */}
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-2 mb-5">
          <Building2 size={16} className="text-gray-500" />
          <h2 className="text-base font-bold text-gray-900">Current Workspace</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Workspace Name</label>
            <input value={wsName} onChange={e => setWsName(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea value={wsDesc} onChange={e => setWsDesc(e.target.value)}
              rows={2} placeholder="What is this workspace for?"
              className="input-field resize-none" />
          </div>
          <button onClick={saveWs} disabled={saving || !wsName.trim()} className="btn-primary">
            {saving ? 'Saving…' : saved ? <><Check size={15} /> Saved!</> : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* All Workspaces */}
      <div className="card p-6 mb-5">
        <h2 className="text-base font-bold text-gray-900 mb-4">Your Workspaces</h2>
        <div className="space-y-2.5">
          {workspaces.map(w => (
            <div key={w.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                ws?.id === w.id
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200'
              }`}>
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
                {w.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{w.name}</p>
                {ws?.id === w.id && <p className="text-xs text-blue-600 font-medium">Current</p>}
              </div>
              <RoleBadge value={w.role} />
            </div>
          ))}
        </div>
      </div>

      {/* Create New Workspace */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={16} className="text-gray-500" />
          <h2 className="text-base font-bold text-gray-900">Create New Workspace</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Each workspace has its own projects, members, and settings.
        </p>
        <div className="flex gap-3">
          <input
            value={newWs} onChange={e => setNewWs(e.target.value)}
            placeholder="e.g. Marketing Team"
            className="input-field flex-1"
            onKeyDown={e => e.key === 'Enter' && addWs()}
          />
          <button onClick={addWs} disabled={!newWs.trim() || creating} className="btn-primary shrink-0">
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
