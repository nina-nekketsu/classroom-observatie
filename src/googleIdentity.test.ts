import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGoogleIdTokenProvider } from './googleIdentity'

type InitializeOptions = { client_id: string; callback: (response: { credential?: string }) => void }

describe('createGoogleIdTokenProvider', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.head.innerHTML = ''
    delete (window as typeof window & { google?: unknown }).google
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
    document.head.innerHTML = ''
    delete (window as typeof window & { google?: unknown }).google
  })

  it('renders a visible Google Sign-In fallback immediately even when One Tap does not report suppression', async () => {
    const renderButton = vi.fn()
    ;(window as unknown as { google: unknown }).google = {
      accounts: {
        id: {
          initialize: vi.fn(),
          prompt: vi.fn(),
          renderButton,
        },
      },
    } as unknown

    void createGoogleIdTokenProvider('client-for-test.apps.googleusercontent.com')()
    await Promise.resolve()

    const fallback = document.querySelector('[data-google-sign-in-fallback]')
    expect(fallback).toBeInstanceOf(HTMLElement)
    expect(fallback).toBeVisible()
    expect(renderButton).toHaveBeenCalledWith(fallback, expect.objectContaining({ type: 'standard' }))
  })

  it('renders a visible Google Sign-In fallback when One Tap is suppressed and resolves with the button credential', async () => {
    let callback: InitializeOptions['callback'] = () => undefined
    const renderButton = vi.fn()
    ;(window as unknown as { google: unknown }).google = {
      accounts: {
        id: {
          initialize: vi.fn((options: InitializeOptions) => { callback = options.callback }),
          prompt: vi.fn((notify: (notification: { isNotDisplayed(): boolean; isSkippedMoment(): boolean }) => void) => {
            notify({ isNotDisplayed: () => true, isSkippedMoment: () => false })
          }),
          renderButton,
        },
      },
    } as unknown

    const tokenPromise = createGoogleIdTokenProvider('client-for-test.apps.googleusercontent.com')()
    await Promise.resolve()

    const fallback = document.querySelector('[data-google-sign-in-fallback]')
    expect(fallback).toBeInstanceOf(HTMLElement)
    expect(fallback).toBeVisible()
    expect(renderButton).toHaveBeenCalledWith(fallback, expect.objectContaining({ type: 'standard' }))

    callback({ credential: 'button-id-token' })

    await expect(tokenPromise).resolves.toBe('button-id-token')
    expect(document.querySelector('[data-google-sign-in-fallback]')).not.toBeInTheDocument()
  })
})
