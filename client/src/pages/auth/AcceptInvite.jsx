import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { CheckCircle, XCircle, Loader, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchWorkspaces } from '../../store/store'
import api from '../../api/axios'

export default function AcceptInvite() {
  const [params]  = useSearchParams()
  const navigate  = useNavigate()
  const dispatch  = useDispatch()
  const token     = params.get('token')
  const { user }  = useSelector(s => s.auth)
  const [info,   setInfo]   = useState(null)
  const [status, setStatus] = useState('loading')
  const [msg,    setMsg]    = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setMsg('Invalid invitation link.'); return }
    api.get(`/invite/info?token=${token}`)
      .then(r => { setInfo(r.data); setStatus('ready') })
      .catch(e => { setStatus('error'); setMsg(e.message) })
  }, [token])

  const accept = async () => {
    setStatus('accepting')
    try {
      await api.post('/invite/accept', { token })
      await dispatch(fetchWorkspaces())
      toast.success('Welcome to the workspace!')
      setStatus('success')
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (e) {
      setStatus('error')
      setMsg(e.message)
    }
  }

  const Wrapper = ({ children }) => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
        {children}
      </div>
    </div>
  )

  if (status === 'loading') return <Wrapper><Loader size={36} className="animate-spin text-blue-600 mx-auto" /></Wrapper>

  if (status === 'error') return (
    <Wrapper>
      <XCircle size={52} className="text-red-400 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation Error</h2>
      <p className="text-gray-500 text-sm mb-6">{msg}</p>
      <Link to="/login" className="btn-primary mx-auto">Go to Login</Link>
    </Wrapper>
  )

  if (status === 'success') return (
    <Wrapper>
      <CheckCircle size={52} className="text-emerald-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">You're in! 🎉</h2>
      <p className="text-gray-500 text-sm">Welcome to <strong>{info?.workspaceName}</strong>. Redirecting…</p>
    </Wrapper>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Mail size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">TaskFlow</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">You're Invited! 🎉</h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            <strong>{info?.inviterName}</strong> invited you to join
            <span className="text-blue-600 font-bold ml-1">{info?.workspaceName}</span>
          </p>

          <div className={`rounded-xl px-5 py-4 mb-6 text-center ${info?.role === 'admin' ? 'bg-purple-50 border border-purple-200' : 'bg-blue-50 border border-blue-200'}`}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1 text-gray-500">Your Role</p>
            <p className={`text-base font-bold uppercase ${info?.role === 'admin' ? 'text-purple-700' : 'text-blue-700'}`}>{info?.role}</p>
            <p className="text-xs mt-1.5 text-gray-500">
              {info?.role === 'admin' ? 'Full admin access — manage projects, invite members, configure settings.' : 'Access to view projects, manage tasks, and collaborate with the team.'}
            </p>
          </div>

          {!user ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 text-center">Sign in or create an account to accept.</p>
              <Link to={`/login?redirect=/invite/accept?token=${token}`} className="btn-primary w-full justify-center">Sign In to Accept</Link>
              <Link to={`/register?redirect=/invite/accept?token=${token}`} className="btn-secondary w-full justify-center">Create Account</Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600 text-center">
                Accepting as <strong className="text-gray-900">{user.name}</strong>
              </div>
              <button onClick={accept} disabled={status === 'accepting'} className="btn-primary w-full justify-center py-3">
                {status === 'accepting' ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Accepting…
                  </span>
                ) : 'Accept Invitation'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
