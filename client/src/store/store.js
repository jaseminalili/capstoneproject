import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

// ─────────────────────────────────────────────────────────────────────────────
// Auth Slice
// ─────────────────────────────────────────────────────────────────────────────
export const loginUser    = createAsyncThunk('auth/login',    async (body, { rejectWithValue }) => { try { return await api.post('/auth/login', body) } catch (e) { return rejectWithValue(e.message) } })
export const registerUser = createAsyncThunk('auth/register', async (body, { rejectWithValue }) => { try { return await api.post('/auth/register', body) } catch (e) { return rejectWithValue(e.message) } })
export const loadMe       = createAsyncThunk('auth/me',       async (_, { rejectWithValue })   => { try { return await api.get('/auth/me') }            catch (e) { return rejectWithValue(e.message) } })
export const updateProfile= createAsyncThunk('auth/profile',  async (body, { rejectWithValue }) => { try { return await api.put('/auth/profile', body) }  catch (e) { return rejectWithValue(e.message) } })

const hasToken = !!localStorage.getItem('tf_token')

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:    null,
    token:   localStorage.getItem('tf_token') || '',
    loading: hasToken, // only show loading spinner if we have a token to restore
    error:   '',
  },
  reducers: {
    logout(s) {
      s.user = null; s.token = ''; s.loading = false
      localStorage.removeItem('tf_token'); localStorage.removeItem('tf_workspace')
    },
    clearAuthError(s) { s.error = '' },
    setLoadingDone(s) { s.loading = false },
  },
  extraReducers: b => {
    const onLoginSuccess = (s, { payload }) => {
      s.loading = false; s.error = ''
      s.token = payload.data.token
      s.user  = payload.data.user
      localStorage.setItem('tf_token', payload.data.token)
    }
    b.addCase(loginUser.fulfilled,    onLoginSuccess)
    b.addCase(registerUser.fulfilled, onLoginSuccess)
    b.addCase(loginUser.rejected,    (s, a) => { s.loading = false; s.error = a.payload })
    b.addCase(registerUser.rejected, (s, a) => { s.loading = false; s.error = a.payload })
    b.addCase(loadMe.fulfilled,      (s, a) => { s.loading = false; s.user = a.payload.data.user })
    b.addCase(loadMe.rejected,       (s)    => { s.loading = false; s.token = ''; localStorage.removeItem('tf_token') })
    b.addCase(updateProfile.fulfilled,(s, a) => { if (s.user) s.user = { ...s.user, ...a.payload.data } })
    b.addMatcher(
      a => ['auth/login/pending', 'auth/register/pending'].includes(a.type),
      s => { s.loading = true; s.error = '' }
    )
  },
})
export const { logout, clearAuthError, setLoadingDone } = authSlice.actions

// ─────────────────────────────────────────────────────────────────────────────
// Workspace Slice
// ─────────────────────────────────────────────────────────────────────────────
export const fetchWorkspaces = createAsyncThunk('ws/list',   async () => api.get('/workspaces'))
export const createWorkspace = createAsyncThunk('ws/create', async (data) => api.post('/workspaces', data))
export const updateWorkspace = createAsyncThunk('ws/update', async ({ id, data }) => api.put(`/workspaces/${id}`, data))

const getSavedWorkspace = () => { try { return JSON.parse(localStorage.getItem('tf_workspace')) } catch { return null } }

const wsSlice = createSlice({
  name: 'workspace',
  initialState: { list: [], current: getSavedWorkspace(), loading: false },
  reducers: {
    setCurrentWorkspace(s, { payload }) {
      s.current = payload
      localStorage.setItem('tf_workspace', JSON.stringify(payload))
    },
  },
  extraReducers: b => {
    b.addCase(fetchWorkspaces.pending,   s => { s.loading = true })
    b.addCase(fetchWorkspaces.fulfilled, (s, a) => {
      s.loading = false
      s.list = a.payload.data
      // Auto-select first workspace if none selected or current no longer exists
      const stillExists = s.current && a.payload.data.find(w => w.id === s.current.id)
      if (!stillExists && a.payload.data.length) {
        s.current = a.payload.data[0]
        localStorage.setItem('tf_workspace', JSON.stringify(a.payload.data[0]))
      }
    })
    b.addCase(fetchWorkspaces.rejected, s => { s.loading = false })
    b.addCase(createWorkspace.fulfilled, (s, a) => { s.list.push(a.payload.data) })
    b.addCase(updateWorkspace.fulfilled, (s, a) => {
      s.list = s.list.map(w => w.id === a.payload.data.id ? a.payload.data : w)
      if (s.current?.id === a.payload.data.id) s.current = { ...s.current, ...a.payload.data }
    })
  },
})
export const { setCurrentWorkspace } = wsSlice.actions

// ─────────────────────────────────────────────────────────────────────────────
// Project Slice
// ─────────────────────────────────────────────────────────────────────────────
export const fetchProjects = createAsyncThunk('proj/list',   async (wsId) => api.get(`/workspaces/${wsId}/projects`))
export const createProject = createAsyncThunk('proj/create', async ({ wsId, data }) => api.post(`/workspaces/${wsId}/projects`, data))
export const updateProject = createAsyncThunk('proj/update', async ({ id, data }) => api.put(`/projects/${id}`, data))
export const deleteProject = createAsyncThunk('proj/delete', async id => { await api.delete(`/projects/${id}`); return id })

const projSlice = createSlice({
  name: 'projects',
  initialState: { list: [], loading: false, error: '' },
  reducers: {
    patchProjectProgress(s, { payload: { id, progress } }) {
      const p = s.list.find(x => x.id === id)
      if (p) p.progress = progress
    },
  },
  extraReducers: b => {
    b.addCase(fetchProjects.pending,   s => { s.loading = true; s.error = '' })
    b.addCase(fetchProjects.fulfilled, (s, a) => { s.loading = false; s.list = a.payload.data })
    b.addCase(fetchProjects.rejected,  (s, a) => { s.loading = false; s.error = a.payload })
    b.addCase(createProject.fulfilled, (s, a) => { s.list.unshift(a.payload.data) })
    b.addCase(updateProject.fulfilled, (s, a) => { s.list = s.list.map(p => p.id === a.payload.data.id ? a.payload.data : p) })
    b.addCase(deleteProject.fulfilled, (s, a) => { s.list = s.list.filter(p => p.id !== a.payload) })
  },
})
export const { patchProjectProgress } = projSlice.actions

// ─────────────────────────────────────────────────────────────────────────────
// Task Slice
// ─────────────────────────────────────────────────────────────────────────────
export const fetchTasks      = createAsyncThunk('tasks/list',    async pid          => api.get(`/projects/${pid}/tasks`))
export const fetchMyTasks    = createAsyncThunk('tasks/mine',    async ()           => api.get('/tasks/my'))
export const fetchTaskDetail = createAsyncThunk('tasks/detail',  async id           => api.get(`/tasks/${id}`))
export const createTask      = createAsyncThunk('tasks/create',  async ({ pid, data }) => api.post(`/projects/${pid}/tasks`, data))
export const updateTask      = createAsyncThunk('tasks/update',  async ({ id, data }) => api.put(`/tasks/${id}`, data))
export const deleteTask      = createAsyncThunk('tasks/delete',  async id => {
  const r = await api.delete(`/tasks/${id}`)
  return { id, progress: r.data?.progress }
})
export const addComment      = createAsyncThunk('tasks/comment', async ({ id, content }) => api.post(`/tasks/${id}/comments`, { content }))

const taskSlice = createSlice({
  name: 'tasks',
  initialState: { list: [], myTasks: [], current: null, loading: false },
  reducers: { clearCurrentTask(s) { s.current = null } },
  extraReducers: b => {
    b.addCase(fetchTasks.pending,        s => { s.loading = true })
    b.addCase(fetchTasks.fulfilled,      (s, a) => { s.loading = false; s.list = a.payload.data })
    b.addCase(fetchTasks.rejected,       s => { s.loading = false })
    b.addCase(fetchMyTasks.fulfilled,    (s, a) => { s.myTasks = a.payload.data })
    b.addCase(fetchTaskDetail.pending,   s => { s.loading = true; s.current = null })
    b.addCase(fetchTaskDetail.fulfilled, (s, a) => { s.loading = false; s.current = a.payload.data })
    b.addCase(fetchTaskDetail.rejected,  s => { s.loading = false })
    b.addCase(createTask.fulfilled,      (s, a) => { s.list.push(a.payload.data.task) })
    b.addCase(updateTask.fulfilled,      (s, a) => {
      const t = a.payload.data.task
      s.list = s.list.map(x => x.id === t.id ? t : x)
      if (s.current?.id === t.id) s.current = { ...s.current, ...t }
    })
    b.addCase(deleteTask.fulfilled, (s, a) => { s.list = s.list.filter(t => t.id !== a.payload.id) })
    b.addCase(addComment.fulfilled, (s, a) => {
      if (s.current) s.current.comments = [...(s.current.comments || []), a.payload.data]
    })
  },
})
export const { clearCurrentTask } = taskSlice.actions

// ─────────────────────────────────────────────────────────────────────────────
// Team Slice
// ─────────────────────────────────────────────────────────────────────────────
export const fetchTeam        = createAsyncThunk('team/list',   async wsId => api.get(`/workspaces/${wsId}/members`))
export const fetchWsUsers     = createAsyncThunk('team/users',  async wsId => api.get(`/workspaces/${wsId}/users`))
export const inviteMember     = createAsyncThunk('team/invite', async ({ wsId, data }, { rejectWithValue }) => {
  try { return await api.post(`/workspaces/${wsId}/invite`, data) }
  catch (e) { return rejectWithValue(e.message) }
})
export const removeMember     = createAsyncThunk('team/remove', async ({ wsId, userId }) => {
  await api.delete(`/workspaces/${wsId}/members/${userId}`); return userId
})
export const updateMemberRole = createAsyncThunk('team/role',   async ({ wsId, userId, role }) => {
  await api.patch(`/workspaces/${wsId}/members/${userId}/role`, { role }); return { userId, role }
})

const teamSlice = createSlice({
  name: 'team',
  initialState: { list: [], wsUsers: [], loading: false, inviteError: '', inviteSuccess: '' },
  reducers: { clearInviteStatus(s) { s.inviteError = ''; s.inviteSuccess = '' } },
  extraReducers: b => {
    b.addCase(fetchTeam.pending,          s => { s.loading = true })
    b.addCase(fetchTeam.fulfilled,        (s, a) => { s.loading = false; s.list = a.payload.data })
    b.addCase(fetchTeam.rejected,         s => { s.loading = false })
    b.addCase(fetchWsUsers.fulfilled,     (s, a) => { s.wsUsers = a.payload.data })
    b.addCase(inviteMember.fulfilled,     (s, a) => { s.inviteSuccess = a.payload.message; s.inviteError = '' })
    b.addCase(inviteMember.rejected,      (s, a) => { s.inviteError = a.payload; s.inviteSuccess = '' })
    b.addCase(removeMember.fulfilled,     (s, a) => { s.list = s.list.filter(m => m.id !== a.payload) })
    b.addCase(updateMemberRole.fulfilled, (s, a) => {
      const m = s.list.find(x => x.id === a.payload.userId)
      if (m) m.role = a.payload.role
    })
  },
})
export const { clearInviteStatus } = teamSlice.actions

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────
export default configureStore({
  reducer: {
    auth:      authSlice.reducer,
    workspace: wsSlice.reducer,
    projects:  projSlice.reducer,
    tasks:     taskSlice.reducer,
    team:      teamSlice.reducer,
  },
})
