import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, ArrowLeft, Mail } from 'lucide-react'
import api from '../../api/axios'

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  const submit = async e => {
    e.preventDefault()
    if (!email.includes('@')) { setError('Enter a valid email address.'); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/forgot-password', { email: email.trim() })
      setSent(true)
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
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <CheckSquare size={26} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">TaskFlow</h1>
          <p className="text-blue-300 mt-1.5 text-sm">Professional Project Management</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <Link to="/login" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium mb-6 transition-colors">
              <ArrowLeft size={15} /> Back to Sign In
            </Link>

            {!sent ? (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Forgot your password?</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Enter your email address and we will send you a link to reset your password.
                </p>

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError('') }}
                        placeholder="you@example.com"
                        className="input-field pl-10"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                      <span>⚠</span> {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading || !email.trim()}
                    className="w-full btn-primary justify-center py-3 text-sm font-semibold">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Sending…
                      </span>
                    ) : 'Send Reset Link'}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail size={28} className="text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
                <p className="text-sm text-gray-500 mb-2">
                  If <strong>{email}</strong> is registered, you will receive a reset link shortly.
                </p>
                <p className="text-xs text-gray-400 mb-6">
                  The link expires in 1 hour. Check your spam folder if you don't see it.
                </p>
                <Link to="/login"
                  className="btn-primary justify-center py-2.5 text-sm inline-flex">
                  Back to Sign In
                </Link>
              </div>
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