import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import viteConfig from '../../../../vite.config'
import { dashboardScope, metricKeys, parseDashboardSummary } from '../contracts/dashboardMetrics'
import { dashboardAccess, loadDashboardMetrics } from './dashboardMetrics'

function summary() {
  return {
    schemaVersion: 'operations-dashboard-summary/1.0.0', generatedAt: '2026-11-10T12:00:00.000Z',
    scope: { ...dashboardScope, publicationMode: 'fake' },
    runningExecutions: 0, generatedMedia: null, activeCampaigns: null, completedPublications: null,
    socialPublicationsFake: 2, socialPublicationsLive: null, qcApproved: 1, qcEvaluated: 2, qcApprovalRate: 50,
    availability: Object.fromEntries(metricKeys.map(key => [key, {
      status: ['activeCampaigns', 'generatedMedia', 'completedPublications', 'socialPublicationsLive'].includes(key) ? 'UNAVAILABLE' : 'AVAILABLE',
      reason: ({ activeCampaigns: 'ACTIVE_CAMPAIGN_DEFINITION_REQUIRED', generatedMedia: 'MEDIA_MATERIALIZATION_NOT_PROVEN', completedPublications: 'COMBINED_PUBLICATIONS_UNDEFINED', socialPublicationsLive: 'PUBLICATION_MODE_NOT_IN_SOURCE' } as Record<string, string>)[key] ?? null,
    }])),
  }
}
const config = { status: 'configured', baseUrl: 'http://localhost:5173' } as const
beforeEach(() => { vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(summary()))) })
afterEach(() => { vi.unstubAllEnvs() })

test('validates the exact version, scope, units, nulls, and a measured zero', () => {
  const parsed = parseDashboardSummary(summary())
  expect(parsed.runningExecutions).toBe(0)
  expect(parsed.generatedMedia).toBeNull()
  expect(parsed.socialPublicationsFake).toBe(2)
  expect(parsed.socialPublicationsLive).toBeNull()
  expect(parsed.qcApprovalRate).toBe(50)
})
test.each([
  (x: ReturnType<typeof summary>) => { x.schemaVersion = 'future' },
  (x: ReturnType<typeof summary>) => { x.runningExecutions = -1 },
  (x: ReturnType<typeof summary>) => { x.availability.runningExecutions!.status = 'UNAVAILABLE' },
  (x: ReturnType<typeof summary>) => { x.scope = { ...x.scope, source: 'OTHER' } as never },
  (x: ReturnType<typeof summary>) => { x.generatedAt = 'yesterday' },
  (x: ReturnType<typeof summary>) => { x.qcEvaluated = 0 },
  (x: ReturnType<typeof summary>) => { x.qcApprovalRate = 101 },
  (x: ReturnType<typeof summary>) => { x.runningExecutions = Number.MAX_SAFE_INTEGER + 1 },
  (x: ReturnType<typeof summary>) => { x.scope = { ...x.scope, units: { ...x.scope.units, runningExecutions: 'campaign' } } as never },
  (x: ReturnType<typeof summary>) => { Object.assign(x, { generatedMedia: 1 }); x.availability.generatedMedia = { status: 'AVAILABLE', reason: null } },
])('rejects incompatible contracts without coercion (%#)', mutate => {
  const value = summary(); mutate(value)
  expect(() => parseDashboardSummary(value)).toThrow('Contrato de indicadores incompatível.')
})
test('accepts no QC evaluations with a null rate, never substituting zero percent', () => {
  const value = summary(); value.qcApproved = 0; value.qcEvaluated = 0
  Object.assign(value, { qcApprovalRate: null })
  value.availability.qcApprovalRate = { status: 'UNAVAILABLE', reason: 'NO_QC_EVALUATIONS' }
  expect(parseDashboardSummary(value).qcApprovalRate).toBeNull()
})
test('only GETs the true endpoint using the existing HTTP transport and local session', async () => {
  const controller = new AbortController()
  await loadDashboardMetrics(config, 'http://localhost:5173', controller.signal)
  expect(fetch).toHaveBeenCalledExactlyOnceWith('http://localhost:5173/operations/dashboard/summary', expect.objectContaining({ method: 'GET', credentials: 'include', cache: 'no-store', signal: controller.signal }))
})
test.each(['https://remote.example', 'http://localhost:3000', 'http://127.0.0.1:5173'])('refuses a different origin before transmitting a session: %s', async baseUrl => {
  expect(dashboardAccess({ status: 'configured', baseUrl }, 'http://localhost:5173')).toBe('origin')
  await expect(loadDashboardMetrics({ status: 'configured', baseUrl }, 'http://localhost:5173')).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})
test.each([401, 403, 503])('preserves HTTP %i for safe presentation', async status => {
  vi.mocked(fetch).mockResolvedValue(new Response('{}', { status }))
  await expect(loadDashboardMetrics(config, config.baseUrl)).rejects.toMatchObject({ kind: 'http', status })
})
test('preserves network and cancellation errors', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline'))
  await expect(loadDashboardMetrics(config, config.baseUrl)).rejects.toMatchObject({ kind: 'network' })
  const controller = new AbortController(); controller.abort()
  vi.mocked(fetch).mockRejectedValue(new Error('cancelled'))
  await expect(loadDashboardMetrics(config, config.baseUrl, controller.signal)).rejects.toMatchObject({ kind: 'aborted' })
})
test('the optional dev proxy preserves origin and host without exposing credentials or enabling redirects', async () => {
  vi.stubEnv('MKTAUTO_API_PROXY_TARGET', 'http://127.0.0.1:3000')
  const resolved = await viteConfig({ command: 'serve', mode: 'test' })
  expect(resolved.server?.proxy).toEqual({ '/operations': {
    target: 'http://127.0.0.1:3000', changeOrigin: false, ws: false, followRedirects: false, proxyTimeout: 5000,
  } })
})
test.each(['https://external.example', 'http://user:secret@localhost:3000', 'http://127.0.0.1:3000/path'])('proxy rejects an incompatible target (%s)', target => {
  vi.stubEnv('MKTAUTO_API_PROXY_TARGET', target)
  expect(() => viteConfig({ command: 'serve', mode: 'test' })).toThrow()
})
