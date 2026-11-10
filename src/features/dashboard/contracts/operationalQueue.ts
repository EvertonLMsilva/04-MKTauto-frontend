/** Read-only projection of the backend operational queue. No publication decisions here. */
export const operationalQueueLimit = 25
export interface QueueDestination {
  network: 'INSTAGRAM' | 'FACEBOOK_REELS'
  accountId: string
  required: boolean
  operationId: string | null
  originalOperationId: string | null
  state: string | null
  executionMode: 'fake' | 'live' | null
  simulated: boolean
  activeClaim: boolean
  version: number | null
  supersessionRevision: number
  packageHash: string | null
  packageRevision: number | null
  approval: { decision: string | null; revoked: boolean; pending: boolean }
  authorizationExpiresAt: string | null
  authorizationExpired: boolean
  requiresReconciliation: boolean
  pendingCode: string | null
  nextAction: string
  lastEvidence: { at: string; version: number; state: string; errorCode: string | null; providerStatus: string | null; uncertainStage: string | null } | null
  receipt: { mediaId: string } | null
}
export interface OperationalQueueItem {
  projectId: string | null
  campaignId: string
  campaignRevision: number
  occurrenceDate: string | null
  executionId: string
  runId: string | null
  campaignStatus: string
  blockingCode: string | null
  publicationComplete: boolean
  latestCampaignEvent: { type: string; at: string; code: string | null; step: string | null } | null
  destinations: QueueDestination[]
}
export interface OperationalQueuePage { total: number; limit: number; offset: number; items: OperationalQueueItem[] }
export class OperationalQueueContractError extends Error {
  constructor() { super('Contrato da fila operacional incompatível.'); this.name = 'OperationalQueueContractError' }
}
function fail(): never { throw new OperationalQueueContractError() }
function record(v: unknown): Record<string, unknown> { return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : fail() }
function text(v: unknown): string { return typeof v === 'string' && v.trim().length > 0 && v.length <= 2000 ? v : fail() }
function token(v: unknown): string { const s = text(v); return /^[A-Z][A-Z0-9_]{0,199}$/.test(s) ? s : fail() }
function bool(v: unknown): boolean { return typeof v === 'boolean' ? v : fail() }
function integer(v: unknown, min = 0): number { return typeof v === 'number' && Number.isSafeInteger(v) && v >= min ? v : fail() }
function nullable<T>(v: unknown, parse: (value: unknown) => T): T | null { return v === null ? null : parse(v) }
function date(v: unknown, dayOnly = false): string {
  const s = text(v)
  if (!(dayOnly ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/).test(s) || !Number.isFinite(Date.parse(s))) return fail()
  if (new Date(`${s.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) !== s.slice(0, 10)) return fail()
  return s
}
function destination(value: unknown): QueueDestination {
  const r = record(value), approval = record(r.approval)
  if (r.network !== 'INSTAGRAM' && r.network !== 'FACEBOOK_REELS') return fail()
  if (r.executionMode !== null && r.executionMode !== 'fake' && r.executionMode !== 'live') return fail()
  const e = r.lastEvidence === null ? null : record(r.lastEvidence)
  const receipt = r.receipt === null ? null : record(r.receipt)
  const d: QueueDestination = {
    network: r.network, accountId: text(r.accountId), required: bool(r.required),
    operationId: nullable(r.operationId, text), originalOperationId: nullable(r.originalOperationId, text),
    state: nullable(r.state, token), executionMode: r.executionMode,
    simulated: bool(r.simulated), activeClaim: bool(r.activeClaim), version: nullable(r.version, v => integer(v, 1)),
    supersessionRevision: integer(r.supersessionRevision),
    packageHash: nullable(r.packageHash, v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v) ? v : fail()),
    packageRevision: nullable(r.packageRevision, v => integer(v, 1)),
    approval: { decision: nullable(approval.decision, token), revoked: bool(approval.revoked), pending: bool(approval.pending) },
    authorizationExpiresAt: nullable(r.authorizationExpiresAt, date), authorizationExpired: bool(r.authorizationExpired),
    requiresReconciliation: bool(r.requiresReconciliation), pendingCode: nullable(r.pendingCode, token), nextAction: token(r.nextAction),
    lastEvidence: e ? { at: date(e.at), version: integer(e.version, 1), state: token(e.state), errorCode: nullable(e.errorCode, text), providerStatus: nullable(e.providerStatus, text), uncertainStage: nullable(e.uncertainStage, text) } : null,
    receipt: receipt ? { mediaId: text(receipt.mediaId) } : null,
  }
  if (d.simulated !== (d.executionMode === 'fake')) return fail()
  if (d.receipt && (d.state !== 'PUBLISHED' || d.requiresReconciliation || d.lastEvidence?.uncertainStage)) return fail()
  return d
}
export function parseOperationalQueue(value: unknown): OperationalQueuePage {
  const r = record(value), total = integer(r.total), limit = integer(r.limit, 1), offset = integer(r.offset)
  if (limit > 100 || !Array.isArray(r.items) || r.items.length > limit || (r.items.length > 0 && offset + r.items.length > total)) return fail()
  const seen = new Set<string>()
  const items = r.items.map(value => {
    const row = record(value), id = text(row.executionId)
    if (seen.has(id) || !Array.isArray(row.destinations)) return fail()
    seen.add(id)
    const targets = new Set<string>()
    const destinations = row.destinations.map(value => {
      const d = destination(value), key = `${d.network}:${d.accountId}`
      if (targets.has(key)) return fail()
      targets.add(key); return d
    })
    const e = row.latestCampaignEvent === null ? null : record(row.latestCampaignEvent)
    const publicationComplete = bool(row.publicationComplete)
    if (publicationComplete !== (destinations.some(d => d.required) && destinations.every(d => !d.required || d.receipt !== null))) return fail()
    return {
      projectId: nullable(row.projectId, text), campaignId: text(row.campaignId), campaignRevision: integer(row.campaignRevision, 1),
      occurrenceDate: nullable(row.occurrenceDate, v => date(v, true)), executionId: id, runId: nullable(row.runId, text),
      campaignStatus: token(row.campaignStatus), blockingCode: nullable(row.blockingCode, token), publicationComplete,
      latestCampaignEvent: e ? { type: text(e.type), at: date(e.at), code: nullable(e.code, text), step: nullable(e.step, text) } : null,
      destinations,
    }
  })
  return { total, limit, offset, items }
}
