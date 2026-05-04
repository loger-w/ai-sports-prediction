import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signInWithEmail: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/lib/auth/authClient', () => ({
  authClient: {
    signInWithEmail: (email: string, password: string) =>
      mocks.signInWithEmail(email, password),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    signUpWithEmail: vi.fn(),
  },
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: Record<string, unknown>) => (
    <a href={to as string} {...rest}>
      {children as React.ReactNode}
    </a>
  ),
  useNavigate: () => mocks.navigate,
}))

vi.mock('sonner', () => ({
  toast: {
    success: (msg: string) => mocks.toastSuccess(msg),
    error: (msg: string) => mocks.toastError(msg),
    info: vi.fn(),
  },
}))

import { LoginForm } from '@/components/auth/LoginForm'

describe('LoginForm', () => {
  beforeEach(() => {
    mocks.navigate.mockClear()
    mocks.signInWithEmail.mockClear()
    mocks.toastSuccess.mockClear()
    mocks.toastError.mockClear()
    mocks.signInWithEmail.mockResolvedValue({ data: {}, error: null })
  })

  it('renders email + password fields and a submit button', () => {
    render(<LoginForm />)
    expect(screen.getByPlaceholderText('信箱')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('密碼')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登入' })).toBeInTheDocument()
  })

  it('does not render a Google sign-in button', () => {
    render(<LoginForm />)
    expect(screen.queryByRole('button', { name: /Google/ })).not.toBeInTheDocument()
  })

  it('renders a link to /signup', () => {
    render(<LoginForm />)
    const link = screen.getByText('註冊')
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toBe('/signup')
  })

  it('submitting calls authClient.signInWithEmail with form values', async () => {
    render(<LoginForm />)
    fireEvent.change(screen.getByPlaceholderText('信箱'), {
      target: { value: 'a@b.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('密碼'), {
      target: { value: 'pw123' },
    })
    fireEvent.click(screen.getByRole('button', { name: '登入' }))

    await waitFor(() => {
      expect(mocks.signInWithEmail).toHaveBeenCalledWith('a@b.com', 'pw123')
    })
  })

  it('successful sign-in navigates to / and shows success toast', async () => {
    mocks.signInWithEmail.mockResolvedValueOnce({ data: { user: {} }, error: null })
    render(<LoginForm />)
    fireEvent.change(screen.getByPlaceholderText('信箱'), {
      target: { value: 'a@b.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('密碼'), {
      target: { value: 'pw123' },
    })
    fireEvent.click(screen.getByRole('button', { name: '登入' }))

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalled()
      expect(mocks.navigate).toHaveBeenCalledWith({ to: '/' })
    })
  })

  it('failed sign-in shows error toast and does not navigate', async () => {
    mocks.signInWithEmail.mockResolvedValueOnce({
      data: null,
      error: { message: '帳號或密碼錯誤' },
    })
    render(<LoginForm />)
    fireEvent.change(screen.getByPlaceholderText('信箱'), {
      target: { value: 'a@b.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('密碼'), {
      target: { value: 'badpw' },
    })
    fireEvent.click(screen.getByRole('button', { name: '登入' }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('帳號或密碼錯誤')
    })
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

})
