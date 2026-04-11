import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/axios'

export const fetchProjects = createAsyncThunk('proj/list',   async (wsId) => api.get(`workspaces/${wsId}/projects`))
export const createProject = createAsyncThunk('proj/create', async ({ wsId, data }) => api.post(`workspaces/${wsId}/projects`, data))
export const updateProject = createAsyncThunk('proj/update', async ({ id, data }) => api.put(`projects/${id}`, data))
export const deleteProject = createAsyncThunk('proj/delete', async id => { await api.delete(`projects/${id}`); return id })

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
export default projSlice.reducer
