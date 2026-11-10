export const publicationStates = ['PREPARED', 'CREATING_CONTAINER', 'PROCESSING', 'READY', 'PUBLISHING', 'UNCERTAIN', 'PUBLISHED', 'FAILED', 'EXPIRED'] as const
export const publicationLabels: Record<typeof publicationStates[number], string> = {
  PREPARED: 'Preparada', CREATING_CONTAINER: 'Criando contêiner', PROCESSING: 'Processando', READY: 'Pronta', PUBLISHING: 'Publicando', UNCERTAIN: 'Incerta · requer verificação', PUBLISHED: 'Concluída', FAILED: 'Falhou', EXPIRED: 'Expirada',
}
export interface ExecutionPublication {
  operationId: string
  network: 'INSTAGRAM' | 'FACEBOOK_REELS'
  accountId: string
  operation: { state: typeof publicationStates[number]; executionMode: 'fake' | 'live'; updatedAt: string; packageHash: string } | null
}
export class ExecutionPublicationsContractError extends Error {
  constructor() { super('Contrato de publicações incompatível.'); this.name = 'ExecutionPublicationsContractError' }
}
export function parseExecutionPublications(value: unknown): ExecutionPublication[] {
  const fail = (): never => { throw new ExecutionPublicationsContractError() }
  const object = (v: unknown): Record<string, unknown> => !v || typeof v !== 'object' || Array.isArray(v) ? fail() : v as Record<string, unknown>
  if (!Array.isArray(value)) return fail()
  const seen = new Map<string, ExecutionPublication>()
  for (const raw of value) {
    const row = object(raw)
    if (typeof row.operationId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_:.-]{2,199}$/.test(row.operationId) || typeof row.network !== 'string' || !['INSTAGRAM', 'FACEBOOK_REELS'].includes(row.network) || typeof row.accountId !== 'string' || !/^\d{5,64}$/.test(row.accountId)) return fail()
    let operation: ExecutionPublication['operation'] = null
    if (row.operation !== null) {
      const op = object(row.operation)
      if (op.operationId !== row.operationId || op.accountId !== (row.network === 'FACEBOOK_REELS' ? `facebook_reels:${row.accountId}` : row.accountId)) return fail()
      if (!publicationStates.some(state => state === op.state) || typeof op.executionMode !== 'string' || !['fake', 'live'].includes(op.executionMode) || (op.network !== undefined && op.network !== row.network)) return fail()
      if (typeof op.packageHash !== 'string' || !/^[a-f0-9]{64}$/.test(op.packageHash) || typeof op.updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(op.updatedAt) || !Number.isFinite(Date.parse(op.updatedAt))) return fail()
      if (new Date(`${op.updatedAt.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) !== op.updatedAt.slice(0, 10)) return fail()
      operation = { state: op.state as typeof publicationStates[number], executionMode: op.executionMode as 'fake' | 'live', packageHash: op.packageHash, updatedAt: op.updatedAt }
    }
    const item: ExecutionPublication = { operationId: row.operationId, network: row.network as ExecutionPublication['network'], accountId: row.accountId, operation }
    const prior = seen.get(item.operationId)
    // The canonical reader may return legacy/current reservations for the same operation.
    if (prior && JSON.stringify(prior) !== JSON.stringify(item)) return fail()
    seen.set(item.operationId, item)
  }
  return [...seen.values()]
}
