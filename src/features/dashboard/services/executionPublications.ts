import type { ApiConfig } from '../../../config/env'
import { createHttpClient } from '../../../services/http/client'
import { parseExecutionPublications } from '../contracts/executionPublications'
import { dashboardAccess } from './dashboardMetrics'

export async function loadExecutionPublications(config: ApiConfig, origin: string, identity: string, signal?: AbortSignal) {
  if (dashboardAccess(config, origin) !== 'ready' || !/^[a-zA-Z0-9][a-zA-Z0-9_:.-]{2,199}$/.test(identity)) throw new Error('Origem ou identificador incompatível.')
  const response = await createHttpClient(config).request(`/publishing/executions/${encodeURIComponent(identity)}/destinations`, {
    method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'error', signal: signal ?? null,
  })
  return parseExecutionPublications(response)
}
