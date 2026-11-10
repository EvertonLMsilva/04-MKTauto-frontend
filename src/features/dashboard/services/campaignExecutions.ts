import type { ApiConfig } from '../../../config/env'
import { createHttpClient } from '../../../services/http/client'
import { parseCampaignExecutions } from '../contracts/campaignExecutions'
import { dashboardAccess } from './dashboardMetrics'

export async function loadCampaignExecutions(config: ApiConfig, origin: string, signal?: AbortSignal) {
  if (dashboardAccess(config, origin) !== 'ready') throw new Error('Origem local compatível necessária.')
  const response = await createHttpClient(config).request('/operations/executions', {
    method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'error', signal: signal ?? null,
  })
  return parseCampaignExecutions(response)
}
