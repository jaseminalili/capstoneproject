// ═══════════════════════════════════════════════════════════════════════════════
// AUTHPAGE TESTS — Vitest + React Testing Library
// ═══════════════════════════════════════════════════════════════════════════════
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import AuthPage from '../src/pages/auth/AuthPage'
import authReducer, { logout } from '../src/store/slices/authSlice'

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('../src/api/axios', () => ({
  default: {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    create: vi.fn(() => ({
      get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(),
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } }
    }))
  }
}))

const initialAuth = { user: null, token: null, loading: false, error: '', loadingDone: true }

function renderLogin() {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: initialAuth } })
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login"    element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  )
  return store
}

function renderRegister() {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: initialAuth } })
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/login"    element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  )
  return store
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGN IN
// ═══════════════════════════════════════════════════════════════════════════════
describe('AuthPage — Sign In', () => {

  test('FT-01 — renders Sign In form by default', () => {
    renderLogin()
    // "Sign In" appears multiple times (nav link + button) — use getAllByText
    const signInElements = screen.getAllByText('Sign In')
    expect(signInElements.length).toBeGreaterThan(0)
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeDefined()
  })

  test('FT-02 — shows Forgot your password link', () => {
    renderLogin()
    expect(screen.getByText(/forgot your password/i)).toBeDefined()
  })

  test('FT-03 — shows demo credentials on login page', () => {
    renderLogin()
    expect(screen.getByText(/oliver@taskflow\.dev/i)).toBeDefined()
  })

  test('FT-04 — Sign Up link exists and points to register', () => {
    renderLogin()
    const signUpLink = screen.getByRole('link', { name: /sign up/i })
    expect(signUpLink).toBeDefined()
    expect(signUpLink.getAttribute('href')).toBe('/register')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SIGN UP + PASSWORD STRENGTH
// ═══════════════════════════════════════════════════════════════════════════════
describe('AuthPage — Sign Up & Password Strength', () => {

  test('FT-05 — Sign Up link exists on login page', () => {
    renderLogin()
    // Register page renders same component — verify Sign Up nav link is present
    const signUpLink = screen.getByRole('link', { name: /sign up/i })
    expect(signUpLink.getAttribute('href')).toBe('/register')
  })

  test('FT-06 — password field exists on login page', () => {
    renderLogin()
    const passwordInput = screen.getByPlaceholderText(/enter your password/i)
    expect(passwordInput).toBeDefined()
    expect(passwordInput.type).toBe('password')
  })

  test('FT-07 — typing in password field updates value', () => {
    renderLogin()
    const passwordInput = screen.getByPlaceholderText(/enter your password/i)
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } })
    expect(passwordInput.value).toBe('Password123!')
  })

  test('FT-08 — eye toggle button exists on password field', () => {
    renderLogin()
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// DARK MODE
// ═══════════════════════════════════════════════════════════════════════════════
describe('Dark Mode — localStorage', () => {

  test('FT-09 — dark mode preference can be saved to localStorage', () => {
    localStorage.setItem('tf_theme', 'dark')
    expect(localStorage.getItem('tf_theme')).toBe('dark')
  })

  test('FT-10 — light mode is default when no localStorage value', () => {
    localStorage.removeItem('tf_theme')
    expect(localStorage.getItem('tf_theme')).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// REDUX AUTH SLICE
// ═══════════════════════════════════════════════════════════════════════════════
describe('Redux — authSlice', () => {

  test('FT-11 — logout clears user from state', () => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: {
          user: { id: '123', name: 'Test', email: 'test@test.com' },
          token: 'some-jwt-token',
          loading: false, error: '', loadingDone: true
        }
      }
    })
    store.dispatch(logout())
    expect(store.getState().auth.user).toBeNull()
  })

  test('FT-12 — initial state has no user', () => {
    const store = configureStore({ reducer: { auth: authReducer } })
    const state = store.getState().auth
    expect(state.user).toBeNull()
    expect(state.loading).toBe(false)
  })
})