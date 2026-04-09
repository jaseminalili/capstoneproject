import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadMe, fetchWorkspaces, fetchMyTasks, setLoadingDone } from './store/store'

import AppLayout     from './components/layout/AppLayout'
import AuthPage      from './pages/auth/AuthPage'
import AcceptInvite  from './pages/auth/AcceptInvite'
import Dashboard     from './pages/dashboard/Dashboard'
import Projects      from './pages/projects/Projects'
import ProjectDetail from './pages/projects/ProjectDetail'
import Team          from './pages/team/Team'
import { TaskDetail } from './pages/tasks/TaskDetail'
import Settings      from './pages/settings/Settings'

function AuthGuard({ children }) {
  const { user, token, loading } = useSelector(s => s.auth)
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading TaskFlow…</p>
        </div>
      </div>
    )
  }

  if (!user && !token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

function AppInit() {
  const dispatch = useDispatch()
  const { token } = useSelector(s => s.auth)

  useEffect(() => {
    if (token) {
      // Restore session from stored token
      dispatch(loadMe())
        .unwrap()
        .then(() => {
          dispatch(fetchWorkspaces())
          dispatch(fetchMyTasks())
        })
        .catch(() => {
          // loadMe.rejected will clear the token and set loading=false
        })
    } else {
      // No token — mark loading done immediately (no spinner needed)
      dispatch(setLoadingDone())
    }
  }, [])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit />
      <Routes>
        {/* Public routes */}
        <Route path="/login"         element={<AuthPage mode="login" />} />
        <Route path="/register"      element={<AuthPage mode="register" />} />
        <Route path="/invite/accept" element={<AcceptInvite />} />

        {/* Protected routes */}
        <Route path="/" element={<AuthGuard><AppLayout /></AuthGuard>}>
          <Route index              element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"   element={<Dashboard />} />
          <Route path="projects"    element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="task/:id"    element={<TaskDetail />} />
          <Route path="team"        element={<Team />} />
          <Route path="settings"    element={<Settings />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
