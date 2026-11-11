import { parseCampaign, type Campaign } from './campaign'

export class FakeCommandContractError extends Error {
  constructor() { super('Contrato de comando FAKE incompatível.'); this.name = 'FakeCommandContractError' }
}
const fail = (): never => { throw new FakeCommandContractError() }
const row = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : fail()
const id = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9][a-z0-9_-]{2,79}$/.test(v)
const commandId = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_:.-]{2,199}$/.test(v)
const text = (v: unknown, max: number): v is string => typeof v === 'string' && !!v.length && v.trim() === v && v.length <= max && !/bearer\s|sk-[a-z0-9]/i.test(v)
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0
const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v)
const date = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(v) && Number.isFinite(Date.parse(v))
export const validExecutionId = (v: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v)
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).every(k => keys.includes(k))
export interface QcSession { operatorId: string; csrfToken: string }
export function parseQcSession(value: unknown): QcSession {
  const v = row(value)
  if (typeof v.operatorId !== 'string' || !/^[a-z][a-z0-9_]{2,63}$/.test(v.operatorId) || typeof v.csrfToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(v.csrfToken)) return fail()
  return { operatorId: v.operatorId, csrfToken: v.csrfToken }
}
export function parseRegistration(value: unknown, expected: Campaign): Campaign {
  const v = row(value)
  if (v.schemaVersion !== 'fake-campaign-command-result/1.0.0' || v.mode !== 'FAKE' || v.result !== 'CAMPAIGN_REGISTERED') return fail()
  const campaign = parseCampaign(v.campaign, { id: expected.campaignId, revision: expected.revision })
  if (Object.keys(expected).some(k => campaign[k as keyof Campaign] !== expected[k as keyof Campaign])) return fail()
  return campaign
}
export interface ExecutionRequest {
  campaignId: string; campaignRevision: number; projectVersion: number; requestId: string; requestedAt: string
  localImage: { mediaReference: string; contentHash: string; origin: 'OPERATOR_OWNED' | 'AUTHORIZED_THIRD_PARTY'; provider: null
    rights: { usageBasis: 'OWNED' | 'LICENSED' | 'EXPLICIT_PERMISSION'; commercialUseAllowed: true; evidence: unknown[] } }
}
export type ExecutionStatus = 'SCHEDULED' | 'RUNNING' | 'WAITING_INPUT' | 'WAITING_RECONCILIATION' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
export interface ControlledExecution {
  schemaVersion: 'fake-campaign-command-result/1.0.0'; mode: 'FAKE'; result: 'EXECUTION_ACCEPTED' | 'EXECUTION_STATE'
  execution: { executionId: string; campaignId: string; campaignRevision: number; runId: string; status: ExecutionStatus; version: number; scheduledAt: string; createdAt: string; updatedAt: string }
  policy: { schemaVersion: 'campaign-fake-policy/1.0.0'; mode: 'FAKE'; commandId: string; actorId: string; campaignId: string; campaignRevision: number; runId: string; scheduledAt: string; requestHash: string; providers: 'LOCAL_ONLY'; publication: 'DISABLED' }
}
export function parseControlledExecution(value: unknown, result: ControlledExecution['result'], expected: { executionId?: string; request?: ExecutionRequest; actorId?: string } = {}): ControlledExecution {
  const v = row(value), e = row(v.execution), p = row(v.policy)
  if (v.schemaVersion !== 'fake-campaign-command-result/1.0.0' || v.mode !== 'FAKE' || v.result !== result
    || typeof e.executionId !== 'string' || !validExecutionId(e.executionId) || !id(e.campaignId) || !positive(e.campaignRevision)
    || !commandId(e.runId) || !String(e.runId).startsWith('run_controlled_fake_v1_') || !positive(e.version)
    || !['SCHEDULED', 'RUNNING', 'WAITING_INPUT', 'WAITING_RECONCILIATION', 'SUCCEEDED', 'FAILED', 'CANCELLED'].includes(String(e.status))
    || !date(e.scheduledAt) || !date(e.createdAt) || !date(e.updatedAt)
    || p.schemaVersion !== 'campaign-fake-policy/1.0.0' || p.mode !== 'FAKE' || p.providers !== 'LOCAL_ONLY' || p.publication !== 'DISABLED'
    || !commandId(p.commandId) || typeof p.actorId !== 'string' || !/^[a-z][a-z0-9_]{2,63}$/.test(p.actorId) || !hash(p.requestHash)
    || p.campaignId !== e.campaignId || p.campaignRevision !== e.campaignRevision || p.runId !== e.runId || p.scheduledAt !== e.scheduledAt
    || (expected.executionId !== undefined && e.executionId !== expected.executionId) || (expected.actorId !== undefined && p.actorId !== expected.actorId)) return fail()
  const r = expected.request
  if (r && (p.commandId !== r.requestId || p.campaignId !== r.campaignId || p.campaignRevision !== r.campaignRevision || Date.parse(String(p.scheduledAt)) !== Date.parse(r.requestedAt))) return fail()
  // Only validated, documented fields reach the UI.
  return { schemaVersion: v.schemaVersion, mode: v.mode, result,
    execution: { executionId: e.executionId, campaignId: e.campaignId, campaignRevision: e.campaignRevision, runId: e.runId, status: e.status as ExecutionStatus, version: e.version, scheduledAt: e.scheduledAt, createdAt: e.createdAt, updatedAt: e.updatedAt },
    policy: { schemaVersion: p.schemaVersion, mode: p.mode, commandId: p.commandId, actorId: p.actorId, campaignId: e.campaignId, campaignRevision: e.campaignRevision, runId: e.runId, scheduledAt: e.scheduledAt, requestHash: p.requestHash, providers: p.providers, publication: p.publication } }
}
export type Draft = Record<string, string>
export interface Validation<T> { data: T | null; errors: Record<string, string> }
export function validateCampaignDraft(draft: Draft): Validation<Campaign> {
  const errors: Record<string, string> = {}
  for (const key of ['campaignId', 'projectId', 'productId']) if (!id(draft[key])) errors[key] = 'Use 3–80 letras minúsculas, números, _ ou -.'
  for (const key of ['revision', 'productRevision']) if (!/^[1-9]\d*$/.test(draft[key] ?? '') || !positive(Number(draft[key]))) errors[key] = 'Informe um inteiro positivo.'
  for (const key of ['cta', 'disclosure']) if (!text(draft[key], 500)) errors[key] = 'Informe um texto de até 500 caracteres, sem credenciais.'
  try { const u = new URL(draft.affiliateUrl ?? ''); if (!text(draft.affiliateUrl, 4000) || !draft.affiliateUrl.startsWith('https://') || u.protocol !== 'https:' || !u.hostname || u.username || u.password) throw new Error() } catch { errors.affiliateUrl = 'Informe um link HTTPS sem credenciais.' }
  if (Object.keys(errors).length) return { data: null, errors }
  return { data: { schemaVersion: 'affiliate-campaign/1.0.0', campaignId: draft.campaignId!, revision: Number(draft.revision), projectId: draft.projectId!, productId: draft.productId!, productRevision: Number(draft.productRevision), affiliateUrl: draft.affiliateUrl!, cta: draft.cta!, disclosure: draft.disclosure! }, errors }
}
function evidenceValid(value: unknown, mediaReference: string, contentHash: string): value is unknown[] {
  if (!Array.isArray(value) || !value.length) return false
  let matching = 0
  try {
    for (const item of value) {
      const e = row(item)
      if (!exact(e, ['id', 'kind', 'sourceRef', 'recordedAt', 'mediaAuthorization']) || !id(e.id) || !['PRODUCT_SPECIFICATION', 'MEDIA_USAGE_RIGHT'].includes(String(e.kind)) || !text(e.sourceRef, 4000) || !date(e.recordedAt)) return false
      if (e.mediaAuthorization === undefined) continue
      const a = row(e.mediaAuthorization)
      if (!exact(a, ['mediaRef', 'contentHash', 'commercialUse', 'processing', 'localProcessing', 'externalProviders', 'operationScope', 'campaignId', 'purpose']) || !text(a.mediaRef, 250) || !hash(a.contentHash) || !['GRANTED', 'DENIED', 'UNCONFIRMED'].includes(String(a.commercialUse)) || !['GRANTED', 'DENIED', 'UNCONFIRMED'].includes(String(a.processing)) || typeof a.localProcessing !== 'boolean' || !Array.isArray(a.externalProviders) || a.externalProviders.length > 100 || !a.externalProviders.every(id) || new Set(a.externalProviders).size !== a.externalProviders.length) return false
      if (a.operationScope !== undefined && !id(a.operationScope)) return false
      if ((a.campaignId !== undefined || a.purpose !== undefined) && (!id(a.campaignId) || a.purpose !== 'HUMAN_QC_REVIEW' || !id(a.operationScope))) return false
      if (a.mediaRef === mediaReference && a.contentHash === contentHash) {
        matching++
        if (a.commercialUse !== 'GRANTED' || a.processing !== 'GRANTED' || a.localProcessing !== true || a.operationScope !== undefined || a.campaignId !== undefined) return false
      }
    }
    return matching > 0
  } catch { return false }
}
export function validateExecutionDraft(draft: Draft, rightsConfirmed: boolean): Validation<Omit<ExecutionRequest, 'requestId' | 'requestedAt'>> {
  const errors: Record<string, string> = {}
  if (!id(draft.campaignId)) errors.campaignId = 'Informe o identificador oficial da campanha.'
  for (const k of ['campaignRevision', 'projectVersion']) if (!/^[1-9]\d*$/.test(draft[k] ?? '') || !positive(Number(draft[k]))) errors[k] = 'Informe um inteiro positivo.'
  if (!text(draft.mediaReference, 250)) errors.mediaReference = 'Informe a referência real da imagem autorizada (até 250 caracteres).'
  if (!hash(draft.contentHash)) errors.contentHash = 'Informe o SHA-256 real: 64 caracteres hexadecimais minúsculos.'
  if (!['OPERATOR_OWNED', 'AUTHORIZED_THIRD_PARTY'].includes(draft.origin ?? '')) errors.origin = 'Selecione uma origem permitida.'
  if (!['OWNED', 'LICENSED', 'EXPLICIT_PERMISSION'].includes(draft.usageBasis ?? '')) errors.usageBasis = 'Selecione a base documental dos direitos.'
  let evidence: unknown
  try { evidence = JSON.parse(draft.evidence ?? '') } catch { /* The field error explains the expected evidence. */ }
  if (!evidenceValid(evidence, draft.mediaReference ?? '', draft.contentHash ?? '')) errors.evidence = 'Forneça o array de evidências oficiais com autorizações comerciais e de processamento local para esta referência e hash.'
  if (!rightsConfirmed) errors.rights = 'Confirme os direitos somente após conferir a documentação.'
  if (Object.keys(errors).length || !Array.isArray(evidence)) return { data: null, errors }
  return { data: { campaignId: draft.campaignId!, campaignRevision: Number(draft.campaignRevision), projectVersion: Number(draft.projectVersion), localImage: { mediaReference: draft.mediaReference!, contentHash: draft.contentHash!, origin: draft.origin as ExecutionRequest['localImage']['origin'], provider: null, rights: { usageBasis: draft.usageBasis as ExecutionRequest['localImage']['rights']['usageBasis'], commercialUseAllowed: true, evidence } } }, errors }
}
export const canResume = (value: ControlledExecution) => ['WAITING_INPUT', 'WAITING_RECONCILIATION', 'FAILED'].includes(value.execution.status)
