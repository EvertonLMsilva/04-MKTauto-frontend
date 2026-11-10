export interface CampaignQuery { id: string; revision: number }
export interface Campaign {
  schemaVersion: 'affiliate-campaign/1.0.0'
  campaignId: string
  revision: number
  projectId: string
  productId: string
  productRevision: number
  affiliateUrl: string
  cta: string
  disclosure: string
}
export class CampaignContractError extends Error {
  constructor() { super('Contrato de campanha incompatível.'); this.name = 'CampaignContractError' }
}
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{2,79}$/.test(value)
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= max
export function parseCampaignQuery(id: string, revision: string): CampaignQuery | null {
  return identifier(id) && /^[1-9]\d*$/.test(revision) && positive(Number(revision)) ? { id, revision: Number(revision) } : null
}
export function parseCampaign(value: unknown, query: CampaignQuery): Campaign {
  const fail = (): never => { throw new CampaignContractError() }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail()
  const row = value as Record<string, unknown>
  if (row.schemaVersion !== 'affiliate-campaign/1.0.0' || !identifier(row.campaignId) || !identifier(row.projectId) || !identifier(row.productId)
    || !positive(row.revision) || !positive(row.productRevision) || !text(row.cta, 500) || !text(row.disclosure, 500) || !text(row.affiliateUrl, 4000)
    || row.campaignId !== query.id || row.revision !== query.revision) return fail()
  try {
    const url = new URL(row.affiliateUrl)
    if (!row.affiliateUrl.startsWith('https://') || url.protocol !== 'https:' || !url.hostname || url.username || url.password) return fail()
  } catch { return fail() }
  return {
    schemaVersion: row.schemaVersion, campaignId: row.campaignId, revision: row.revision,
    projectId: row.projectId, productId: row.productId, productRevision: row.productRevision,
    affiliateUrl: row.affiliateUrl, cta: row.cta, disclosure: row.disclosure,
  }
}
