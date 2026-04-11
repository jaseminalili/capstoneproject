import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/axios'

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
export default taskSlice.reducer
