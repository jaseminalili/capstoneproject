import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus, User, Check, Trash2, AlertTriangle, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { createWorkspace, updateWorkspace, deleteWorkspace, setCurrentWorkspace, logout, updateProfile } from '../../store/store'
import { Avatar, RoleBadge } from '../../components/ui'
import api from '../../api/axios'
 
const AVATAR_COLORS = ['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#F97316','#EC4899']
 
const validatePassword = (pwd) => {
  if (pwd.length < 8)             return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(pwd))         return 'Password must contain at least one uppercase letter'
  if (!/[a-z]/.test(pwd))         return 'Password must contain at least one lowercase letter'
  if (!/[0-9]/.test(pwd))         return 'Password must contain at least one number'
  if (!/[^A-Za-z0-9]/.test(pwd)) return 'Password must contain at least one special character'
  return null
}
 
const PASSWORD_RULES = [
  { test: p => p.length >= 8,           label: 'At least 8 characters' },
  { test: p => /[A-Z]/.test(p),         label: 'One uppercase letter' },
  { test: p => /[a-z]/.test(p),         label: 'One lowercase letter' },
  { test: p => /[0-9]/.test(p),         label: 'One number' },
  { test: p => /[^A-Za-z0-9]/.test(p), label: 'One special character (!@#$...)' },
]
 
export default function Settings() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { current: ws, list: workspaces } = useSelector(s => s.workspace)
  const { user } = useSelector(s => s.auth)
 
  // Profile
  const [profileName,   setProfileName]   = useState(user?.name || '')
  const [previewColor,  setPreviewColor]  = useState(user?.color || '#3B82F6')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved,  setProfileSaved]  = useState(false)
 
  // Password
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd,     setNewPwd]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [savingPwd,  setSavingPwd]  = useState(false)
 
  // Workspace settings
  const [wsName,   setWsName]   = useState(ws?.name || '')
  const [wsDesc,   setWsDesc]   = useState(ws?.description || '')
  const [newWs,    setNewWs]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [creating, setCreating] = useState(false)
  const [saved,    setSaved]    = useState(false)
 
  // Delete
  const [deleting,         setDeleting]         = useState(false)
  const [deletingAcct,     setDeletingAcct]     = useState(false)
  const [wsConfirmText,    setWsConfirmText]    = useState('')
  const [acctConfirmText,  setAcctConfirmText]  = useState('')
 
  useEffect(() => {
    setWsName(ws?.name || '')
    setWsDesc(ws?.description || '')
    setWsConfirmText('')
  }, [ws?.id])
 
  useEffect(() => {
    setProfileName(user?.name || '')
    setPreviewColor(user?.color || '#3B82F6')
  }, [user?.id])
 
  // ── Handlers ──────────────────────────────────────────────────────────────
 
  const saveProfile = async () => {
    if (!profileName.trim()) return
    setSavingProfile(true)
    try {
      await dispatch(updateProfile({ name: profileName.trim(), color: previewColor })).unwrap()
      toast.success('Profile updated.')
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    } catch (e) { toast.error(e.message) }
    finally { setSavingProfile(false) }
  }
 
  const savePassword = async () => {
    const pwdError = validatePassword(newPwd)
    if (pwdError) { toast.error(pwdError); return }
    if (newPwd !== confirmPwd) { toast.error('Passwords do not match.'); return }
    setSavingPwd(true)
    try {
      await api.put('/auth/password', { currentPassword: currentPwd, newPassword: newPwd })
      toast.success('Password changed successfully.')
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } catch (e) { toast.error(e.message || 'Current password is incorrect.') }
    finally { setSavingPwd(false) }
  }
 
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
    setDeleting(true)
    try {
      await dispatch(deleteWorkspace(ws.id)).unwrap()
      toast.success('Workspace deleted.')
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
    } finally { setDeleting(false) }
  }
 
  const handleDeleteAccount = async () => {
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
    } finally { setDeletingAcct(false) }
  }
 
  const isOwner = ws?.role === 'owner'
  const newPwdValid = PASSWORD_RULES.every(r => r.test(newPwd))
 
  return (
    <div className="p-6 sm:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your profile, workspace and account</p>
      </div>
 
      {/* ── Profile Card ─────────────────────────────────────────────────── */}
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-2 mb-5">
          <User size={16} className="text-gray-500 dark:text-gray-400" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Your Profile</h2>
        </div>
 
        {/* Avatar preview */}
        <div className="flex items-center gap-4 mb-5">
          <Avatar user={{ ...user, name: profileName, color: previewColor }} size="xl" />
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{profileName || user?.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Member since{' '}
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                : '—'}
            </p>
          </div>
        </div>
 
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Display Name</label>
            <input
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder="Your full name"
              className="input-field"
            />
          </div>
 
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Avatar Color</label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setPreviewColor(c)}
                  className={`w-8 h-8 rounded-full transition-all duration-150 ${
                    previewColor === c
                      ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
 
          <button
            onClick={saveProfile}
            disabled={savingProfile || !profileName.trim()}
            className="btn-primary">
            {savingProfile ? 'Saving…' : profileSaved ? <><Check size={15} /> Saved!</> : 'Update Profile'}
          </button>
        </div>
      </div>
 
      {/* ── Change Password ───────────────────────────────────────────────── */}
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-2 mb-5">
          <Lock size={16} className="text-gray-500 dark:text-gray-400" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Change Password</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
            <input
              type="password"
              value={currentPwd}
              onChange={e => setCurrentPwd(e.target.value)}
              placeholder="Enter current password"
              className="input-field"
            />
          </div>
 
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
            <input
              type="password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              placeholder="Create a strong password"
              className="input-field"
            />
            {/* Password strength indicator */}
            {newPwd && (
              <div className="mt-2.5 space-y-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-gray-100 dark:border-gray-600">
                {PASSWORD_RULES.map(({ test, label }) => {
                  const passed = test(newPwd)
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${passed ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-600'}`}>
                        {passed && <Check size={9} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className={`text-xs transition-colors ${passed ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
 
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              placeholder="Repeat new password"
              className="input-field"
            />
            {confirmPwd && newPwd !== confirmPwd && (
              <p className="text-xs text-red-500 mt-1.5">Passwords do not match</p>
            )}
            {confirmPwd && newPwd === confirmPwd && newPwdValid && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                <Check size={11} strokeWidth={3} /> Passwords match
              </p>
            )}
          </div>
 
          <button
            onClick={savePassword}
            disabled={savingPwd || !currentPwd || !newPwdValid || newPwd !== confirmPwd}
            className="btn-primary disabled:opacity-50">
            {savingPwd ? 'Saving…' : 'Change Password'}
          </button>
        </div>
      </div>
 
      {/* ── Workspace Settings ────────────────────────────────────────────── */}
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-2 mb-5">
          <Building2 size={16} className="text-gray-500 dark:text-gray-400" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Current Workspace</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Workspace Name</label>
            <input value={wsName} onChange={e => setWsName(e.target.value)} className="input-field" disabled={!isOwner} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea value={wsDesc} onChange={e => setWsDesc(e.target.value)}
              rows={2} placeholder="What is this workspace for?"
              className="input-field resize-none" disabled={!isOwner} />
          </div>
          {isOwner && (
            <button onClick={saveWs} disabled={saving || !wsName.trim()} className="btn-primary">
              {saving ? 'Saving…' : saved ? <><Check size={15} /> Saved!</> : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
 
      {/* ── All Workspaces ────────────────────────────────────────────────── */}
      <div className="card p-6 mb-5">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Your Workspaces</h2>
        <div className="space-y-2.5">
          {workspaces.map(w => (
            <div
              key={w.id}
              onClick={() => { dispatch(setCurrentWorkspace(w)); navigate('/dashboard') }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                ws?.id === w.id
                  ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600'
              }`}>
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
                {w.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{w.name}</p>
                {ws?.id === w.id && <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Current</p>}
              </div>
              <RoleBadge value={w.role} />
            </div>
          ))}
        </div>
      </div>
 
      {/* ── Create New Workspace ──────────────────────────────────────────── */}
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={16} className="text-gray-500 dark:text-gray-400" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Create New Workspace</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
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
 
      {/* ── Delete Workspace — owner only ─────────────────────────────────── */}
      {isOwner && (
        <div className="card p-6 mb-5 border border-red-100 dark:border-red-900">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-500" />
            <h2 className="text-base font-bold text-red-600 dark:text-red-400">Delete Workspace</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Permanently delete{' '}
            <strong className="text-gray-700 dark:text-gray-300">{ws?.name}</strong>{' '}
            and all its projects, tasks, and members. This action cannot be undone.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Type{' '}
            <strong className="text-gray-900 dark:text-white font-mono">{ws?.name}</strong>{' '}
            to confirm:
          </p>
          <input
            value={wsConfirmText}
            onChange={e => setWsConfirmText(e.target.value)}
            placeholder={ws?.name}
            className="input-field mb-3"
          />
          <button
            onClick={handleDeleteWorkspace}
            disabled={deleting || wsConfirmText !== ws?.name}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <Trash2 size={15} />
            {deleting ? 'Deleting…' : 'Delete Workspace'}
          </button>
        </div>
      )}
 
      {/* ── Delete Account ────────────────────────────────────────────────── */}
      <div className="card p-6 border border-red-100 dark:border-red-900">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-red-500" />
          <h2 className="text-base font-bold text-red-600 dark:text-red-400">Delete Account</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Permanently delete your account, all your workspaces, and all associated data.
          This action cannot be undone.
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Type your email{' '}
          <strong className="text-gray-900 dark:text-white font-mono">{user?.email}</strong>{' '}
          to confirm:
        </p>
        <input
          value={acctConfirmText}
          onChange={e => setAcctConfirmText(e.target.value)}
          placeholder={user?.email}
          className="input-field mb-3"
        />
        <button
          onClick={handleDeleteAccount}
          disabled={deletingAcct || acctConfirmText !== user?.email}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          <Trash2 size={15} />
          {deletingAcct ? 'Deleting…' : 'Delete Account'}
        </button>
      </div>
    </div>
  )
}