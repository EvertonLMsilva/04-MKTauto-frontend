import type { ApiConfig } from '../../../config/env'
import { createHttpClient } from '../../../services/http/client'
import { parseDashboardSummary } from '../contracts/dashboardMetrics'

export function dashboardAccess(config: ApiConfig, origin: string): 'ready' | 'unconfigured' | 'invalid' | 'origin' {
  if (config.status !== 'configured') return config.status
  try {
    const api = new URL(config.baseUrl), browser = new URL(origin)
    if (!['http:', 'https:'].includes(api.protocol) || api.username || api.password || api.search || api.hash) return 'invalid'
    return api.origin === browser.origin && api.pathname === '/' && ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname) ? 'ready' : 'origin'
  } catch { return 'invalid' }
}

export async function loadDashboardMetrics(config: ApiConfig, origin: string, signal?: AbortSignal) {
  if (dashboardAccess(config, origin) !== 'ready') throw new Error('Origem local compatível necessária.')
  const result = await createHttpClient(config).request('/operations/dashboard/summary', {
    method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'error', signal: signal ?? null,
  })
  return parseDashboardSummary(result)
}
