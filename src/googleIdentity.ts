import type { TokenProvider } from './syncTransport'

type CredentialResponse = { credential?: string }
type GoogleIdentity = {
  accounts: {
    id: {
      initialize(options: { client_id: string; callback: (response: CredentialResponse) => void }): void
      prompt(callback: (notification: { isNotDisplayed(): boolean; isSkippedMoment(): boolean }) => void): void
    }
  }
}

declare global {
  interface Window { google?: GoogleIdentity }
}

let scriptPromise: Promise<void> | null = null

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Google Identity Services failed to load')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleIdentity = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Identity Services failed to load'))
    document.head.append(script)
  })
  return scriptPromise
}

export function createGoogleIdTokenProvider(clientId: string): TokenProvider {
  let cachedToken: string | null = null
  let pending: Promise<string | null> | null = null
  const provider: TokenProvider = async () => {
    if (cachedToken) return cachedToken
    if (pending) return pending
    pending = (async () => {
      await loadGoogleIdentityScript()
      const identity = window.google?.accounts.id
      if (!identity) throw new Error('Google Identity Services unavailable')
      return await new Promise<string | null>((resolve) => {
        let settled = false
        const finish = (token: string | null) => {
          if (settled) return
          settled = true
          cachedToken = token
          resolve(token)
        }
        identity.initialize({ client_id: clientId, callback: (response) => finish(response.credential ?? null) })
        identity.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) finish(null)
        })
      })
    })().finally(() => { pending = null })
    return pending
  }
  provider.invalidate = () => { cachedToken = null }
  return provider
}
