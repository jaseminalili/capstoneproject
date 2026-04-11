import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/axios'

export const fetchTeam        = createAsyncThunk('team/list',   async wsId => api.get(`workspaces/${wsId}/members`))
export const fetchWsUsers     = createAsyncThunk('team/users',  async wsId => api.get(`workspaces/${wsId}/users`))
export const inviteMember     = createAsyncThunk('team/invite', async ({ wsId, data }, { rejectWithValue }) => {
  try { return await api.post(`workspaces/${wsId}/invite`, data) }
  catch (e) { return rejectWithValue(e.message) }
})
export const removeMember     = createAsyncThunk('team/remove', async ({ wsId, userId }) => {
  await api.delete(`workspaces/${wsId}/members/${userId}`); return userId
})
export const updateMemberRole = createAsyncThunk('team/role',   async ({ wsId, userId, role }) => {
  await api.patch(`workspaces/${wsId}/members/${userId}/role`, { role }); return { userId, role }
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
export default teamSlice.reducer
