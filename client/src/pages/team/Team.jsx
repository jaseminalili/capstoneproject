import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { UserPlus, Users, Activity, CheckSquare, Search, Trash2, Crown, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  fetchTeam, inviteMember, removeMember, updateMemberRole,
  clearInviteStatus, fetchProjects
} from '../../store/store'
import { Avatar, RoleBadge, Modal, ConfirmDialog } from '../../components/ui'

function InviteModal({ ws, onClose }) {
  const dispatch = useDispatch()
  const { inviteSuccess, inviteError } = useSelector(s => s.team)
  const [email, setEmail] = useState('')
  const [role,  setRole]  = useState('member')
  const [busy,  setBusy]  = useState(false)

  useEffect(() => () => dispatch(clearInviteStatus()), [])

  const submit = async e => {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    await dispatch(inviteMember({ wsId: ws.id, data: { email: email.trim(), role } }))
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Email Address <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            required placeholder="colleague@example.com"
            disabled={!!inviteSuccess}
            className="input-field pl-10 disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Role <span className="text-red-500">*</span></label>
        <select value={role} onChange={e => setRole(e.target.value)}
          disabled={!!inviteSuccess} className="input-field disabled:bg-gray-50">
          <option value="member">Member — Can view and manage projects &amp; tasks</option>
          <option value="admin">Admin — Full access including workspace settings</option>
        </select>
      </div>

      <div className={`rounded-xl px-4 py-3 text-xs font-medium leading-relaxed ${
        role === 'admin'
          ? 'bg-purple-50 border border-purple-200 text-purple-700'
          : 'bg-blue-50 border border-blue-200 text-blue-700'
      }`}>
        {role === 'admin'
          ? '⚡ Admins can invite/remove members, manage all projects, and configure workspace settings.'
          : '👥 Members can view and contribute to projects, manage tasks, and collaborate with the team.'}
      </div>

      {inviteError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <span>⚠</span> {inviteError}
        </div>
      )}

      {inviteSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
          <p className="font-semibold mb-0.5">✓ Invitation sent successfully!</p>
          <p className="text-xs text-emerald-600">
            A professional email with workspace and project details has been delivered to{' '}
            <strong>{email}</strong>.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="btn-secondary">
          {inviteSuccess ? 'Close' : 'Cancel'}
        </button>
        {!inviteSuccess && (
          <button onClick={submit} disabled={busy || !email.trim()} className="btn-primary">
            {busy ? 'Sending…' : 'Send Invitation'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Team() {
  const dispatch = useDispatch()
  const { current: ws }            = useSelector(s => s.workspace)
  const { list: members, loading } = useSelector(s => s.team)
  const { list: projects }         = useSelector(s => s.projects)
  const { user: me }               = useSelector(s => s.auth)
  const [search, setSearch]        = useState('')
  const [showInvite, setShowInvite]= useState(false)
  const [removeId, setRemoveId]    = useState(null)

  const myRole = members.find(m => m.id === me?.id)?.role
  const activeProjects = projects.filter(p => p.status === 'active').length

  useEffect(() => {
    if (ws?.id) {
      dispatch(fetchTeam(ws.id))
      dispatch(fetchProjects(ws.id))
    }
  }, [ws?.id])

  const visible = members.filter(m =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleRemove = async () => {
    try {
      await dispatch(removeMember({ wsId: ws.id, userId: removeId })).unwrap()
      toast.success('Member removed from workspace.')
    } catch (e) { toast.error(e.message) }
  }

  const handleRoleToggle = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin'
    try {
      await dispatch(updateMemberRole({ wsId: ws.id, userId, role: newRole })).unwrap()
      toast.success(`Role changed to ${newRole}.`)
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-1">Manage workspace members and their access roles</p>
        </div>
        {myRole && myRole !== 'member' && (
          <button onClick={() => setShowInvite(true)} className="btn-primary">
            <UserPlus size={16} /> Invite Member
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Members',   value: members.length, icon: Users,       bg: 'bg-blue-50',    txt: 'text-blue-600',    border: 'border-blue-100'    },
          { label: 'Active Projects', value: activeProjects, icon: Activity,    bg: 'bg-emerald-50', txt: 'text-emerald-600', border: 'border-emerald-100' },
          { label: 'Total Projects',  value: projects.length,icon: CheckSquare, bg: 'bg-violet-50',  txt: 'text-violet-600',  border: 'border-violet-100'  },
        ].map(({ label, value, icon: Icon, bg, txt, border }) => (
          <div key={label} className={`card p-5 border ${border} flex items-center justify-between`}>
            <div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500 mt-0.5 font-medium">{label}</div>
            </div>
            <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center`}>
              <Icon size={20} className={txt} />
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search team members…" className="input-field pl-10" />
      </div>

      {/* Members Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70">
              <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3.5">Name</th>
              <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3.5 hidden sm:table-cell">Email</th>
              <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3.5">Role</th>
              {myRole && myRole !== 'member' && <th className="px-6 py-3.5 w-24" />}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="text-center py-12">
                <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </td></tr>
            )}
            {!loading && visible.length === 0 && (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400 text-sm">No members found</td></tr>
            )}
            {!loading && visible.map(m => (
              <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar user={m} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {m.name}
                        {m.id === me?.id && <span className="ml-1.5 text-xs text-gray-400 font-normal">(you)</span>}
                      </p>
                      <p className="text-xs text-gray-400 sm:hidden">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">{m.email}</td>
                <td className="px-6 py-4"><RoleBadge value={m.role} /></td>
                {myRole && myRole !== 'member' && (
                  <td className="px-6 py-4">
                    {m.id !== me?.id && (
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => handleRoleToggle(m.id, m.role)}
                          title={`Make ${m.role === 'admin' ? 'member' : 'admin'}`}
                          className="p-1.5 hover:bg-purple-50 rounded-lg text-gray-400 hover:text-purple-600 transition-colors"
                        >
                          <Crown size={14} />
                        </button>
                        <button
                          onClick={() => setRemoveId(m.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showInvite}
        onClose={() => { setShowInvite(false); dispatch(clearInviteStatus()) }}
        title="Invite Team Member"
        subtitle={`Inviting to: ${ws?.name}`}
      >
        <InviteModal ws={ws} onClose={() => { setShowInvite(false); dispatch(clearInviteStatus()) }} />
      </Modal>

      <ConfirmDialog
        isOpen={!!removeId}
        onClose={() => setRemoveId(null)}
        onConfirm={handleRemove}
        title="Remove Team Member"
        message="This will remove the member from the workspace. They will lose access to all projects. This action cannot be undone."
        confirmLabel="Remove Member"
      />
    </div>
  )
}
