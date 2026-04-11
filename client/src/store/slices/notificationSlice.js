import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/axios'

export const fetchNotifications = createAsyncThunk('notify/list', async () => api.get('/notifications'))
export const markAsRead       = createAsyncThunk('notify/read',  async id => api.patch(`/notifications/${id}/read`))
export const markAllRead      = createAsyncThunk('notify/allRead', async () => api.patch('/notifications/read'))

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { list: [], loading: false },
  reducers: {},
  extraReducers: b => {
    b.addCase(fetchNotifications.pending,   s => { s.loading = true })
    b.addCase(fetchNotifications.fulfilled, (s, a) => { s.loading = false; s.list = a.payload.data })
    b.addCase(fetchNotifications.rejected,  s => { s.loading = false })
    b.addCase(markAsRead.fulfilled,  (s, a) => {
      const n = s.list.find(x => x.id === a.meta.arg)
      if (n) n.is_read = true
    })
    b.addCase(markAllRead.fulfilled, (s) => {
      s.list.forEach(n => n.is_read = true)
    })
  },
})

export default notificationSlice.reducer
