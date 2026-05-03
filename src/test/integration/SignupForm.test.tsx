import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  signUpWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/lib/auth/authClient', () => ({
  authClient: {
    signUpWithEmail: (e: string, p: string) => mocks.signUpWithEmail(e, p),
    signInWithGoogle: () => mocks.signInWithGoogle(),
    signOut: vi.fn(),
    signInWithEmail: vi.fn(),
  },
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: Record<string, unknown>) => (
    <a href={to as string} {...rest}>
      {children as React.ReactNode}
    </a>
  ),
  useNavigate: () => vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (msg: string) => mocks.toastSuccess(msg),
    error: (msg: string) => mocks.toastError(msg),
    info: vi.fn(),
  },
}))

import { SignupForm } from '@/components/auth/SignupForm'

describe('SignupForm', () => {
  beforeEach(() => {
    mocks.signUpWithEmail.mockClear()
    mocks.signInWithGoogle.mockClear()
    mocks.toastSuccess.mockClear()
    mocks.toastError.mockClear()
    mocks.signUpWithEmail.mockResolvedValue({ data: {}, error: null })
    mocks.signInWithGoogle.mockResolvedValue({ data: {}, error: null })
  })

  it('renders email + password fields and a submit button', () => {
    render(<SignupForm />)
    expect(screen.getByPlaceholderText('信箱')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('密碼')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '註冊' })).toBeInTheDocument()
  })

  it('renders a link back to /login', () => {
    render(<SignupForm />)
    const link = screen.getByText('登入')
    expect(link.getAttribute('href')).toBe('/login')
  })

  it('submitting calls authClient.signUpWithEmail with form values', async () => {
    render(<SignupForm />)
    fireEvent.change(screen.getByPlaceholderText('信箱'), {
      target: { value: 'new@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('密碼'), {
      target: { value: 'pw123' },
    })
    fireEvent.click(screen.getByRole('button', { name: '註冊' }))

    await waitFor(() => {
      expect(mocks.signUpWithEmail).toHaveBeenCalledWith('new@example.com', 'pw123')
    })
  })

  it('after successful sign-up, replaces form with verification-sent message', async () => {
    mocks.signUpWithEmail.mockResolvedValueOnce({ data: { user: {} }, error: null })
    render(<SignupForm />)
    fireEvent.change(screen.getByPlaceholderText('信箱'), {
      target: { value: 'new@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('密碼'), {
      target: { value: 'pw123' },
    })
    fireEvent.click(screen.getByRole('button', { name: '註冊' }))

    await waitFor(() => {
      expect(screen.getByText(/驗證信/)).toBeInTheDocument()
    })
  })

  it('failed sign-up shows error toast', async () => {
    mocks.signUpWithEmail.mockResolvedValueOnce({
      data: null,
      error: { message: '此信箱已被註冊' },
    })
    render(<SignupForm />)
    fireEvent.change(screen.getByPlaceholderText('信箱'), {
      target: { value: 'taken@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('密碼'), {
      target: { value: 'pw' },
    })
    fireEvent.click(screen.getByRole('button', { name: '註冊' }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('此信箱已被註冊')
    })
  })
})
