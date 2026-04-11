import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/axios'

export const loginUser    = createAsyncThunk('auth/login',    async (body, { rejectWithValue }) => { try { return await api.post('auth/login', body) } catch (e) { return rejectWithValue(e.message) } })
export const registerUser = createAsyncThunk('auth/register', async (body, { rejectWithValue }) => { try { return await api.post('auth/register', body) } catch (e) { return rejectWithValue(e.message) } })
export const loadMe       = createAsyncThunk('auth/me',       async (_, { rejectWithValue })   => { try { return await api.get('auth/me') }            catch (e) { return rejectWithValue(e.message) } })
export const updateProfile= createAsyncThunk('auth/profile',  async (body, { rejectWithValue }) => { try { return await api.put('auth/profile', body) }  catch (e) { return rejectWithValue(e.message) } })

const hasToken = !!localStorage.getItem('tf_token')

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:    null,
    token:   localStorage.getItem('tf_token') || '',
    loading: hasToken,
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
export default authSlice.reducer
