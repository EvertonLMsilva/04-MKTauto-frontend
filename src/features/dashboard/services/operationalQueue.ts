import type { ApiConfig } from '../../../config/env'
import { createHttpClient } from '../../../services/http/client'
import { operationalQueueLimit, OperationalQueueContractError, parseOperationalQueue } from '../contracts/operationalQueue'
import { dashboardAccess } from './dashboardMetrics'

export async function loadOperationalQueue(config: ApiConfig, origin: string, offset = 0, signal?: AbortSignal) {
  if (dashboardAccess(config, origin) !== 'ready' || !Number.isSafeInteger(offset) || offset < 0) throw new Error('Origem ou paginação incompatível.')
  const response = await createHttpClient(config).request(`/publishing/executions/queue?limit=${operationalQueueLimit}&offset=${offset}`, {
    method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'error', signal: signal ?? null,
  })
  const page = parseOperationalQueue(response)
  if (page.limit !== operationalQueueLimit || page.offset !== offset) throw new OperationalQueueContractError()
  return page
}
