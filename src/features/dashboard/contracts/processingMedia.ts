export interface ProcessingMedia {
  mediaAssetId: string
  pipelineRunId: string
  assetType: 'IMAGE' | 'VIDEO'
  origin: 'OPERATOR_OWNED' | 'AUTHORIZED_THIRD_PARTY' | 'PROVIDER_GENERATED' | 'PROVIDER_LICENSED'
  createdAt: string
  revision: number
  supersedesMediaAssetId: string | null
}
export class ProcessingMediaContractError extends Error {
  constructor() { super('Contrato de mídias incompatível.'); this.name = 'ProcessingMediaContractError' }
}
export function parseProcessingMedia(value: unknown, pipelineRunId: string): ProcessingMedia[] {
  const fail = (): never => { throw new ProcessingMediaContractError() }
  if (!Array.isArray(value)) return fail()
  const seen = new Set<string>()
  return value.map(raw => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail()
    const row = raw as Record<string, unknown>
    const id = row.mediaAssetId
    if (typeof id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_:.-]{2,199}$/.test(id) || seen.has(id)) return fail()
    seen.add(id)
    if (typeof row.schemaVersion !== 'string' || !['media-asset/1.0.0', 'media-asset/2.0.0'].includes(row.schemaVersion) || row.pipelineRunId !== pipelineRunId) return fail()
    if (typeof row.assetType !== 'string' || !['IMAGE', 'VIDEO'].includes(row.assetType) || typeof row.origin !== 'string' || !['OPERATOR_OWNED', 'AUTHORIZED_THIRD_PARTY', 'PROVIDER_GENERATED', 'PROVIDER_LICENSED'].includes(row.origin)) return fail()
    if (typeof row.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(row.createdAt) || !Number.isFinite(Date.parse(row.createdAt))) return fail()
    if (new Date(`${row.createdAt.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) !== row.createdAt.slice(0, 10)) return fail()
    if (typeof row.revision !== 'number' || !Number.isSafeInteger(row.revision) || row.revision < 1) return fail()
    if (row.supersedesMediaAssetId !== null && (typeof row.supersedesMediaAssetId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_:.-]{2,199}$/.test(row.supersedesMediaAssetId))) return fail()
    // No mediaReference, private paths, rights evidence or remote URLs reach the view.
    return { mediaAssetId: id, pipelineRunId, assetType: row.assetType as ProcessingMedia['assetType'], origin: row.origin as ProcessingMedia['origin'], createdAt: row.createdAt, revision: row.revision, supersedesMediaAssetId: row.supersedesMediaAssetId as string | null }
  })
}
