/** Projection of CampaignAdministration.list(), not a global campaign total. */
export const executionStates = ['SCHEDULED', 'RUNNING', 'WAITING_INPUT', 'WAITING_RECONCILIATION', 'SUCCEEDED', 'FAILED', 'CANCELLED'] as const
export type ExecutionStatus = typeof executionStates[number]
export const executionListLimit = 100
export const executionLabels: Record<ExecutionStatus, string> = {
  SCHEDULED: 'Agendada', RUNNING: 'Em execução', WAITING_INPUT: 'Aguardando insumo',
  WAITING_RECONCILIATION: 'Aguardando reconciliação', SUCCEEDED: 'Concluída', FAILED: 'Falhou', CANCELLED: 'Cancelada',
}
export interface CampaignExecution {
  execution_id: string
  campaign_id: string
  campaign_revision: number
  run_id: string
  status: ExecutionStatus
  version: number
  production_date: string | null
  scheduled_at: string | null
  created_at: string | null
  updated_at: string | null
  pending: { code: string | null; message: string | null } | null
}
export class CampaignExecutionsContractError extends Error {
  constructor() { super('Contrato de execuções incompatível.'); this.name = 'CampaignExecutionsContractError' }
}
function fail(): never { throw new CampaignExecutionsContractError() }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail()
  return value as Record<string, unknown>
}
function identifier(value: unknown): string {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_:.-]{2,199}$/.test(value) ? value : fail()
}
function positive(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : fail()
}
function text(value: unknown, max: number): string | null {
  if (value === null || value === undefined) return null
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max ? value : fail()
}
function timestamp(value: unknown, dateOnly = false): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string' || !(dateOnly ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/).test(value) || !Number.isFinite(Date.parse(value))) return fail()
  if (new Date(`${value.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) !== value.slice(0, 10)) return fail()
  return value
}
export function parseCampaignExecutions(value: unknown): CampaignExecution[] {
  if (!Array.isArray(value) || value.length > executionListLimit) return fail()
  const seen = new Set<string>()
  return value.map(item => {
    const row = record(item), id = identifier(row.execution_id)
    if (seen.has(id)) return fail()
    seen.add(id)
    if (!executionStates.some(state => state === row.status)) return fail()
    const finalization = row.finalization == null ? null : record(row.finalization)
    const pending = finalization?.pending == null ? null : record(finalization.pending)
    return {
      execution_id: id, campaign_id: identifier(row.campaign_id), run_id: identifier(row.run_id),
      campaign_revision: positive(row.campaign_revision), version: positive(row.version),
      status: row.status as ExecutionStatus,
      production_date: timestamp(row.production_date, true), scheduled_at: timestamp(row.scheduled_at),
      created_at: timestamp(row.created_at), updated_at: timestamp(row.updated_at),
      pending: pending ? { code: text(pending.code, 200), message: text(pending.message, 2000) } : null,
    }
  })
}
