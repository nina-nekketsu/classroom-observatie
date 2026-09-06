import { z } from 'zod'
import { canonicalHash, type SyncRepository } from './syncRepository'

const maxPayloadBytes = 256 * 1024

const actionPoints = {
  correct: 1, incorrect: 0, almostCorrect: 0, unanswered: 0,
  focused: 1, offTask: -1, refusesWork: -2, device: -1,
  slowTempo: -1, normalTempo: 0, highTempo: 1,
  workFinished: 1, workUnfinished: -1, helps: 1, disrupts: -1,
  talking: -1, daydreaming: -1, warning: 0, warningFollowed: 1,
  warningIgnored: -1,
} as const

const actionIds = Object.keys(actionPoints) as [keyof typeof actionPoints, ...(keyof typeof actionPoints)[]]
const actionIdSchema = z.enum(actionIds)

const operationSchema = z.object({
  id: z.string().min(1).max(200),
  entity: z.literal('observation'),
  entityId: z.string().min(1).max(200),
  action: z.literal('create'),
  createdAt: z.string().datetime(),
  payload: z.object({
    id: z.string().min(1).max(200),
    studentId: z.string().min(1).max(200),
    classId: z.string().min(1).max(200).optional(),
    sessionId: z.string().min(1).max(300).optional(),
    actionId: actionIdSchema,
    points: z.number().int().min(-10).max(10),
    createdAt: z.string().datetime(),
    synced: z.boolean(),
  }).strict(),
  attemptCount: z.number().int().min(0).max(1_000),
  status: z.enum(['pending', 'failed', 'conflict']),
  lastError: z.string().max(500).optional(),
}).strict().superRefine((operation, context) => {
  if (operation.entityId !== operation.payload.id) {
    context.addIssue({ code: 'custom', path: ['entityId'], message: 'entityId must equal payload.id' })
  }
  if (operation.id !== `observation:${operation.payload.id}`) {
    context.addIssue({ code: 'custom', path: ['id'], message: 'operation id must identify payload observation' })
  }
  const expectedPayloadId = `${operation.payload.studentId}-${operation.payload.createdAt}-${operation.payload.actionId}`
  if (operation.payload.id !== expectedPayloadId) {
    context.addIssue({ code: 'custom', path: ['payload', 'id'], message: 'observation id must derive from student, timestamp, and action' })
  }
  if (operation.createdAt !== operation.payload.createdAt) {
    context.addIssue({ code: 'custom', path: ['createdAt'], message: 'operation and payload timestamps must agree' })
  }
  if (operation.payload.points !== actionPoints[operation.payload.actionId]) {
    context.addIssue({ code: 'custom', path: ['payload', 'points'], message: 'points must match action' })
  }
})

const syncSchema = z.object({ operations: z.array(operationSchema).min(1).max(100) }).strict()

type SyncBody = z.infer<typeof syncSchema>

export type VerifiedToken = { email: string }
export type TokenVerifier = { verify(idToken: string): Promise<VerifiedToken | null> }
export type InjectRequest = { method: 'POST' | string, url: string, headers?: Record<string, string>, body?: unknown }
export type InjectResponse = { status: number, body: Record<string, unknown> }

export function createSyncApp({ verifier, repository, allowedEmails }: { verifier: TokenVerifier, repository: SyncRepository, allowedEmails: string[] }) {
  const allowlist = new Set(allowedEmails.map(normalizeEmail))
  return {
    async inject(request: InjectRequest): Promise<InjectResponse> {
      if (request.method !== 'POST' || request.url !== '/api/sync') return json(404, { error: 'not found' })
      const authorization = request.headers?.authorization ?? request.headers?.Authorization
      const match = authorization?.match(/^Bearer (.+)$/)
      if (!match) return json(401, { error: 'missing bearer token' })

      let verified: VerifiedToken | null
      try {
        verified = await verifier.verify(match[1])
      } catch {
        verified = null
      }
      if (!verified?.email) return json(401, { error: 'invalid Google ID token' })
      if (!allowlist.has(normalizeEmail(verified.email))) return json(403, { error: 'email not allowed' })

      const raw = JSON.stringify(request.body ?? {})
      if (Buffer.byteLength(raw, 'utf8') > maxPayloadBytes) return json(413, { error: 'payload too large' })
      const parsed = syncSchema.safeParse(request.body)
      if (!parsed.success) return json(400, { error: 'invalid sync payload' })

      return storeSyncBody(repository, verified.email, parsed.data)
    },
  }
}

function storeSyncBody(repository: SyncRepository, ownerEmail: string, body: SyncBody): InjectResponse {
  const results = body.operations.map((operation) => {
    const payloadJson = JSON.stringify(operation)
    const stored = repository.store({
      operationId: operation.id,
      ownerEmail,
      contentHash: canonicalHash({
        entity: operation.entity,
        entityId: operation.entityId,
        action: operation.action,
        createdAt: operation.createdAt,
        payload: operation.payload,
      }),
      payloadJson,
      createdAt: operation.createdAt,
    })
    return { operationId: operation.id, status: stored }
  })
  return json(200, { results })
}

function normalizeEmail(email: string): string {
  return email.trim().toLocaleLowerCase('en-US')
}

function json(status: number, body: Record<string, unknown>): InjectResponse {
  return { status, body }
}
