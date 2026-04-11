import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/axios'

export const fetchWorkspaces = createAsyncThunk('ws/list',   async () => api.get('workspaces'))
export const createWorkspace = createAsyncThunk('ws/create', async (data) => api.post('workspaces', data))
export const updateWorkspace = createAsyncThunk('ws/update', async ({ id, data }) => api.put(`workspaces/${id}`, data))

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
export default wsSlice.reducer
