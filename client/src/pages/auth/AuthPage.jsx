import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, CheckSquare, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { loginUser, registerUser, clearAuthError, fetchWorkspaces, fetchMyTasks } from '../../store/store'
 
const validatePassword = (pwd) => {
  if (pwd.length < 8)             return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(pwd))         return 'Password must contain at least one uppercase letter'
  if (!/[a-z]/.test(pwd))         return 'Password must contain at least one lowercase letter'
  if (!/[0-9]/.test(pwd))         return 'Password must contain at least one number'
  if (!/[^A-Za-z0-9]/.test(pwd)) return 'Password must contain at least one special character (!@#$...)'
  return null
}
 
const PASSWORD_RULES = [
  { test: p => p.length >= 8,           label: 'At least 8 characters' },
  { test: p => /[A-Z]/.test(p),         label: 'One uppercase letter' },
  { test: p => /[a-z]/.test(p),         label: 'One lowercase letter' },
  { test: p => /[0-9]/.test(p),         label: 'One number' },
  { test: p => /[^A-Za-z0-9]/.test(p), label: 'One special character (!@#$...)' },
]
 
export default function AuthPage({ mode = 'login' }) {
  const dispatch       = useDispatch()
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()
  const { loading, error, user } = useSelector(s => s.auth)
  const [show,        setShow]        = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const isLogin = mode === 'login'
 
  // Force light mode on auth pages
  useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])
 
  // If already logged in redirect
  useEffect(() => {
    if (user) {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme === 'dark') document.documentElement.classList.add('dark')
      const redirect = searchParams.get('redirect') || '/dashboard'
      navigate(redirect, { replace: true })
    }
  }, [user])
 
  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    if (error) dispatch(clearAuthError())
  }
 
  const validate = () => {
    if (!isLogin && !form.name.trim()) { toast.error('Full name is required.'); return false }
    if (!form.email.includes('@'))     { toast.error('Enter a valid email address.'); return false }
    if (!isLogin) {
      const pwdError = validatePassword(form.password)
      if (pwdError) { toast.error(pwdError); return false }
      if (form.password !== form.confirmPassword) { toast.error('Passwords do not match.'); return false }
    } else {
      if (!form.password) { toast.error('Password is required.'); return false }
    }
    return true
  }
 
  const submit = async e => {
    e.preventDefault()
    if (!validate()) return
    const action = isLogin
      ? loginUser({ email: form.email.trim(), password: form.password })
      : registerUser({ name: form.name.trim(), email: form.email.trim(), password: form.password })
    const res = await dispatch(action)
    if (!res.error) {
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!')
      dispatch(fetchWorkspaces())
      dispatch(fetchMyTasks())
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme === 'dark') document.documentElement.classList.add('dark')
      const redirect = searchParams.get('redirect') || '/dashboard'
      navigate(redirect, { replace: true })
    }
  }
 
  const allRulesPassed = PASSWORD_RULES.every(r => r.test(form.password))
 
  const displayError = error === 'Session expired. Please log in again.'
    ? 'Invalid email or password. Please try again.'
    : error
 
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background glows */}
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
 
        {/* Card — always white */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-gray-100">
            {[['login', 'Sign In'], ['register', 'Sign Up']].map(([m, label]) => (
              <Link key={m} to={`/${m}`}
                className={`flex-1 py-4 text-sm font-semibold text-center transition-all duration-200 ${
                  mode === m
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
                {label}
              </Link>
            ))}
          </div>
 
          <form onSubmit={submit} className="p-8 space-y-4">
            {/* Full Name */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Your full name" className="input-field"
                  autoComplete="name" required
                />
              </div>
            )}
 
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="you@example.com" className="input-field"
                autoComplete="email" required
              />
            </div>
 
            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Password <span className="text-red-500">*</span>
                </label>
                {/* Forgot password — navigates to dedicated page */}
                {isLogin && (
                  <Link
                    to="/forgot-password"
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
                    Forgot your password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'} value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
                  className="input-field pr-12"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
 
              {/* Password strength indicator — only on register */}
              {!isLogin && form.password && (
                <div className="mt-2.5 space-y-1.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  {PASSWORD_RULES.map(({ test, label }) => {
                    const passed = test(form.password)
                    return (
                      <div key={label} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${passed ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                          {passed && <Check size={9} className="text-white" strokeWidth={3} />}
                        </div>
                        <span className={`text-xs transition-colors ${passed ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
 
            {/* Confirm Password */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'} value={form.confirmPassword}
                    onChange={e => set('confirmPassword', e.target.value)}
                    placeholder="Repeat your password" className="input-field pr-12"
                    autoComplete="new-password" required
                  />
                  <button type="button" onClick={() => setShowConfirm(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1.5">Passwords do not match</p>
                )}
                {form.confirmPassword && form.password === form.confirmPassword && (
                  <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                    <Check size={11} strokeWidth={3} /> Passwords match
                  </p>
                )}
              </div>
            )}
 
            {/* Error */}
            {displayError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <span className="shrink-0">⚠</span> {displayError}
              </div>
            )}
 
            {/* Submit */}
            <button type="submit"
              disabled={loading || (!isLogin && !allRulesPassed)}
              className="w-full btn-primary justify-center py-3 text-sm font-semibold mt-2 disabled:opacity-50">
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Please wait…
                </span>
              ) : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
 
            {/* Demo credentials */}
            {isLogin && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 mt-2">
                <p className="text-xs font-semibold text-slate-500 mb-1.5">Demo credentials</p>
                <div className="space-y-0.5 text-xs font-mono text-slate-600">
                  <p>oliver@taskflow.dev / Password123!</p>
                  <p>alex@taskflow.dev &nbsp;/ Password123!</p>
                </div>
              </div>
            )}
          </form>
        </div>
 
        <p className="text-center text-xs text-blue-400/60 mt-6">
          TaskFlow — Professional Project Management Platform
        </p>
      </div>
    </div>
  )
}