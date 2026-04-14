import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { CheckSquare, Check, Eye, EyeOff } from 'lucide-react'
import api from '../../api/axios'

const PASSWORD_RULES = [
  { test: p => p.length >= 8,           label: 'At least 8 characters' },
  { test: p => /[A-Z]/.test(p),         label: 'One uppercase letter' },
  { test: p => /[a-z]/.test(p),         label: 'One lowercase letter' },
  { test: p => /[0-9]/.test(p),         label: 'One number' },
  { test: p => /[^A-Za-z0-9]/.test(p), label: 'One special character (!@#$...)' },
]

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const token          = searchParams.get('token')

  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showPwd,     setShowPwd]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [verifying,   setVerifying]   = useState(true)
  const [tokenValid,  setTokenValid]  = useState(false)
  const [done,        setDone]        = useState(false)
  const [error,       setError]       = useState('')

  const allRulesPassed = PASSWORD_RULES.every(r => r.test(password))

  // Verify token on mount
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    if (!token) { setError('Invalid reset link.'); setVerifying(false); return }
    api.get(`/auth/verify-reset-token?token=${token}`)
      .then(() => { setTokenValid(true); setVerifying(false) })
      .catch(() => { setError('This reset link is invalid or has expired. Please request a new one.'); setVerifying(false) })
  }, [token])

  const submit = async e => {
    e.preventDefault()
    if (!allRulesPassed) { setError('Please meet all password requirements.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/reset-password', { token, password })
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <CheckSquare size={26} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">TaskFlow</h1>
          <p className="text-blue-300 mt-1.5 text-sm">Professional Project Management</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            {verifying ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">Verifying your reset link…</p>
              </div>
            ) : done ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={28} className="text-emerald-500" strokeWidth={2.5} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Password reset!</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Your password has been changed successfully. Redirecting to login…
                </p>
                <Link to="/login" className="btn-primary justify-center py-2.5 text-sm inline-flex">
                  Sign In Now
                </Link>
              </div>
            ) : !tokenValid ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚠</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Link expired</h2>
                <p className="text-sm text-gray-500 mb-6">{error}</p>
                <Link to="/forgot-password" className="btn-primary justify-center py-2.5 text-sm inline-flex">
                  Request New Link
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Create new password</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Your new password must meet the security requirements below.
                </p>

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError('') }}
                        placeholder="Create a strong password"
                        className="input-field pr-12"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPwd(s => !s)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {password && (
                      <div className="mt-2.5 space-y-1.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                        {PASSWORD_RULES.map(({ test, label }) => {
                          const passed = test(password)
                          return (
                            <div key={label} className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${passed ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                                {passed && <Check size={9} className="text-white" strokeWidth={3} />}
                              </div>
                              <span className={`text-xs ${passed ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>{label}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirm}
                        onChange={e => { setConfirm(e.target.value); setError('') }}
                        placeholder="Repeat your password"
                        className="input-field pr-12"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowConfirm(s => !s)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {confirm && password !== confirm && (
                      <p className="text-xs text-red-500 mt-1.5">Passwords do not match</p>
                    )}
                    {confirm && password === confirm && allRulesPassed && (
                      <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                        <Check size={11} strokeWidth={3} /> Passwords match
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                      <span>⚠</span> {error}
                    </div>
                  )}

                  <button type="submit"
                    disabled={loading || !allRulesPassed || password !== confirm}
                    className="w-full btn-primary justify-center py-3 text-sm font-semibold disabled:opacity-50">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Resetting…
                      </span>
                    ) : 'Reset Password'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-blue-400/60 mt-6">
          TaskFlow — Professional Project Management Platform
        </p>
      </div>
    </div>
  )
}