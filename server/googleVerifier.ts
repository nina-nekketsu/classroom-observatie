import { OAuth2Client } from 'google-auth-library'
import type { TokenVerifier, VerifiedToken } from './syncApp'

export class GoogleIdTokenVerifier implements TokenVerifier {
  private readonly client: OAuth2Client
  private readonly audience: string

  constructor(audience: string) {
    this.client = new OAuth2Client(audience)
    this.audience = audience
  }

  async verify(idToken: string): Promise<VerifiedToken | null> {
    const ticket = await this.client.verifyIdToken({ idToken, audience: this.audience })
    const payload = ticket.getPayload()
    return payload?.email && payload.email_verified === true ? { email: payload.email } : null
  }
}
