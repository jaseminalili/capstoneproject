import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus, User, Check, Trash2, AlertTriangle, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { createWorkspace, updateWorkspace, deleteWorkspace, setCurrentWorkspace, logout } from '../../store/store'
import { Avatar, RoleBadge } from '../../components/ui'

export default function Settings() {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const { current: ws, list: workspaces } = useSelector(s => s.workspace)
  const { user } = useSelector(s => s.auth)

  const [wsName,        setWsName]        = useState(ws?.name || '')
  const [wsDesc,        setWsDesc]        = useState(ws?.description || '')
  const [newWs,         setNewWs]         = useState('')
  const [saving,        setSaving]        = useState(false)
  const [creating,      setCreating]      = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [deletingAcct,  setDeletingAcct]  = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [confirmWs,     setConfirmWs]     = useState(false)
  const [confirmAcct,   setConfirmAcct]   = useState(false)

  useEffect(() => {
    setWsName(ws?.name || '')
    setWsDesc(ws?.description || '')
    setConfirmWs(false)
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

  const handleDeleteWorkspace = async () => {
    if (!confirmWs) { setConfirmWs(true); return }
    setDeleting(true)
    try {
      await dispatch(deleteWorkspace(ws.id)).unwrap()
      toast.success('Workspace deleted.')
      setConfirmWs(false)
      const remaining = workspaces.filter(w => w.id !== ws.id)
      if (remaining.length > 0) {
        dispatch(setCurrentWorkspace(remaining[0]))
        navigate('/dashboard')
      } else {
        dispatch(logout())
        navigate('/login')
      }
    } catch (e) {
      toast.error(e.message || 'Failed to delete workspace.')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirmAcct) { setConfirmAcct(true); return }
    setDeletingAcct(true)
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/auth/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('tf_token')}` }
      })
      dispatch(logout())
      navigate('/login')
      toast.success('Account deleted.')
    } catch (e) {
      toast.error('Failed to delete account.')
    } finally {
      setDeletingAcct(false)
    }
  }

  const isOwner = ws?.role === 'owner'

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
            <input
              value={wsName}
              onChange={e => setWsName(e.target.value)}
              className="input-field"
              disabled={!isOwner}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={wsDesc}
              onChange={e => setWsDesc(e.target.value)}
              rows={2}
              placeholder="What is this workspace for?"
              className="input-field resize-none"
              disabled={!isOwner}
            />
          </div>
          {isOwner && (
            <button onClick={saveWs} disabled={saving || !wsName.trim()} className="btn-primary">
              {saving ? 'Saving…' : saved ? <><Check size={15} /> Saved!</> : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {/* All Workspaces */}
      <div className="card p-6 mb-5">
        <h2 className="text-base font-bold text-gray-900 mb-4">Your Workspaces</h2>
        <div className="space-y-2.5">
          {workspaces.map(w => (
            <div
              key={w.id}
              onClick={() => {
                dispatch(setCurrentWorkspace(w))
                navigate('/dashboard')
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer ${
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
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={16} className="text-gray-500" />
          <h2 className="text-base font-bold text-gray-900">Create New Workspace</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Each workspace has its own projects, members, and settings.
        </p>
        <div className="flex gap-3">
          <input
            value={newWs}
            onChange={e => setNewWs(e.target.value)}
            placeholder="e.g. Marketing Team"
            className="input-field flex-1"
            onKeyDown={e => e.key === 'Enter' && addWs()}
          />
          <button onClick={addWs} disabled={!newWs.trim() || creating} className="btn-primary shrink-0">
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>

      {/* Delete Workspace — owner only */}
      {isOwner && (
        <div className="card p-6 mb-5 border border-red-100">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-500" />
            <h2 className="text-base font-bold text-red-600">Delete Workspace</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Permanently delete <strong>{ws?.name}</strong> and all its projects, tasks, and members.
            This action cannot be undone.
          </p>
          {confirmWs && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
              <p className="text-sm text-red-700 font-medium">
                Are you sure? Click the button again to confirm permanent deletion.
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleDeleteWorkspace}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all">
              <Trash2 size={15} />
              {deleting ? 'Deleting…' : confirmWs ? 'Yes, Delete Permanently' : 'Delete Workspace'}
            </button>
            {confirmWs && (
              <button
                onClick={() => setConfirmWs(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Account */}
      <div className="card p-6 border border-red-100">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-red-500" />
          <h2 className="text-base font-bold text-red-600">Delete Account</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Permanently delete your account, all your workspaces, and all associated data.
          This action cannot be undone.
        </p>
        {confirmAcct && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
            <p className="text-sm text-red-700 font-medium">
              This will delete everything. Click the button again to confirm.
            </p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleDeleteAccount}
            disabled={deletingAcct}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all">
            <Trash2 size={15} />
            {deletingAcct ? 'Deleting…' : confirmAcct ? 'Yes, Delete My Account' : 'Delete Account'}
          </button>
          {confirmAcct && (
            <button
              onClick={() => setConfirmAcct(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}