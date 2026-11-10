import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { dashboardScope, metricKeys } from '../contracts/dashboardMetrics'
import { useDashboardMetrics } from './useDashboardMetrics'

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

test('unconfigured, invalid and cross-origin access never issue HTTP', () => {
  for (const config of [{status:'unconfigured',baseUrl:null}, {status:'invalid',baseUrl:null}, {status:'configured',baseUrl:'https://external.example'}] as const) {
    const {result,unmount}=renderHook(()=>useDashboardMetrics(config,'http://localhost:5173'))
    expect(result.current.status).toBe('unavailable'); unmount()
  }
  expect(fetch).not.toHaveBeenCalled()
})
test('loads once, preserves fake/live and only retries manually', async () => {
  vi.mocked(fetch).mockImplementation(async()=>new Response(JSON.stringify(summary())))
  const {result}=renderHook(()=>useDashboardMetrics(config,config.baseUrl))
  await waitFor(()=>expect(result.current.status).toBe('success'))
  expect(result.current.data?.socialPublicationsLive).toBeNull()
  expect(fetch).toHaveBeenCalledTimes(1)
  act(()=>result.current.retry())
  await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(2))
  await waitFor(()=>expect(result.current.status).toBe('success'))
  expect(vi.mocked(fetch).mock.calls.every(([,options])=>options?.method==='GET')).toBe(true)
})
test.each([401,403])('unauthorized HTTP %i has no invented login or data', async status=>{
  vi.mocked(fetch).mockResolvedValue(new Response('{}',{status}))
  const {result}=renderHook(()=>useDashboardMetrics(config,config.baseUrl))
  await waitFor(()=>expect(result.current.status).toBe('error'))
  expect(result.current.unauthorized).toBe(true); expect(result.current.data).toBeNull()
})
test('rejects malformed JSON contracts',async()=>{
  vi.mocked(fetch).mockResolvedValue(new Response('{}'))
  const {result}=renderHook(()=>useDashboardMetrics(config,config.baseUrl))
  await waitFor(()=>expect(result.current.message).toMatch(/Contrato.*incompatível/))
  expect(result.current.data).toBeNull()
})
test('a valid response with unavailable sources remains unavailable rather than becoming zero',async()=>{
  const value=summary()
  for(const key of metricKeys) {
    if (!['activeCampaigns','completedPublications'].includes(key)) {
      Object.assign(value,{[key]:null})
      value.availability[key]={status:'UNAVAILABLE',reason:'DATABASE_UNAVAILABLE'}
    }
  }
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(value)))
  const {result}=renderHook(()=>useDashboardMetrics(config,config.baseUrl))
  await waitFor(()=>expect(result.current.data).not.toBeNull())
  expect(result.current.status).toBe('unavailable')
  expect(result.current.data?.runningExecutions).toBeNull()
})
test('aborts on unmount without rendering an error',async()=>{
  vi.mocked(fetch).mockImplementation(()=>new Promise(()=>{}))
  const {unmount}=renderHook(()=>useDashboardMetrics(config,config.baseUrl))
  await waitFor(()=>expect(fetch).toHaveBeenCalledOnce())
  const signal=vi.mocked(fetch).mock.calls[0]?.[1]?.signal
  unmount(); expect(signal?.aborted).toBe(true)
})
test('an obsolete response cannot replace a more recent retry',async()=>{
  let resolveOld!:(response:Response)=>void
  vi.mocked(fetch).mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve}))
  const {result}=renderHook(()=>useDashboardMetrics(config,config.baseUrl))
  await waitFor(()=>expect(result.current.status).toBe('loading'))
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(summary())))
  act(()=>result.current.retry())
  await waitFor(()=>expect(result.current.status).toBe('success'))
  const old=summary();old.runningExecutions=999
  await act(async()=>resolveOld(new Response(JSON.stringify(old))))
  expect(result.current.data?.runningExecutions).toBe(0)
})
