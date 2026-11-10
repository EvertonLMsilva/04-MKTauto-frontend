import type { ApiConfig } from '../../../config/env'
import { createHttpClient } from '../../../services/http/client'
import { parseCampaignExecutions } from '../../dashboard/contracts/campaignExecutions'
import { dashboardAccess } from '../../dashboard/services/dashboardMetrics'
import { parseCampaign, parseCampaignQuery, type CampaignQuery } from '../contracts/campaign'

// Reuse the established read projection and same-origin session policy, without
// treating executions as a complete campaign catalog or deriving campaign state.
function read(config: ApiConfig, origin: string, path: string, signal?: AbortSignal) {
  if (dashboardAccess(config, origin) !== 'ready') throw new Error('Origem local compatível necessária.')
  return createHttpClient(config).request(path, {
    method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'error', signal: signal ?? null,
  })
}
export async function loadRecentActivity(config: ApiConfig, origin: string, signal?: AbortSignal) {
  return parseCampaignExecutions(await read(config, origin, '/operations/executions', signal))
}
export async function loadCampaign(query: CampaignQuery, config: ApiConfig, origin: string, signal?: AbortSignal) {
  if (!parseCampaignQuery(query.id, String(query.revision))) throw new Error('Identificador ou revisão inválidos.')
  const path = `/affiliate/campaigns/${encodeURIComponent(query.id)}/revisions/${query.revision}`
  return parseCampaign(await read(config, origin, path, signal), query)
}
