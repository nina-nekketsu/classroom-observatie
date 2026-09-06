export type RuntimeMode = 'public-prototype' | 'secure-sync'

export type RuntimeConfig = {
  mode: RuntimeMode
  syncEnabled: boolean
  authEnabled: boolean
  syncEndpoint: string | null
  googleClientId: string | null
}

type RuntimeEnv = Record<string, string | undefined>

export function resolveRuntimeConfig(env: RuntimeEnv = import.meta.env): RuntimeConfig {
  const syncEndpoint = env.VITE_SYNC_ENDPOINT?.trim() || null
  const googleClientId = env.VITE_GOOGLE_CLIENT_ID?.trim() || null
  const secureRequested = env.VITE_RUNTIME_MODE === 'secure-sync'
  const sameOriginEndpoint = Boolean(syncEndpoint?.startsWith('/') && !syncEndpoint.startsWith('//'))
  const secureConfigured = secureRequested && sameOriginEndpoint && Boolean(googleClientId)

  if (!secureConfigured) {
    return {
      mode: 'public-prototype',
      syncEnabled: false,
      authEnabled: false,
      syncEndpoint: null,
      googleClientId: null,
    }
  }

  return {
    mode: 'secure-sync',
    syncEnabled: true,
    authEnabled: true,
    syncEndpoint,
    googleClientId,
  }
}
