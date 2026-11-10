import { expect, test, vi } from 'vitest'
import { campaignFixture, executionFixture } from '../test/fixtures'
import { loadCampaign, loadRecentActivity } from './campaigns'

const config = { status: 'configured' as const, baseUrl: 'http://localhost:5187' }
test('only reads the official revision and recent execution endpoints with the existing session', async () => {
  const transport = vi.mocked(fetch).mockResolvedValueOnce(Response.json(campaignFixture)).mockResolvedValueOnce(Response.json([executionFixture]))
  const signal = new AbortController().signal
  expect(await loadCampaign({ id: 'campaign_test', revision: 1 }, config, config.baseUrl, signal)).toEqual(campaignFixture)
  expect(await loadRecentActivity(config, config.baseUrl, signal)).toHaveLength(1)
  expect(transport.mock.calls.map(call => call[0])).toEqual([
    `${config.baseUrl}/affiliate/campaigns/campaign_test/revisions/1`, `${config.baseUrl}/operations/executions`,
  ])
  for (const [, options] of transport.mock.calls) {
    expect(options).toMatchObject({ method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'error', signal })
    expect(options?.body).toBeUndefined()
    expect(new Headers(options?.headers).has('Authorization')).toBe(false)
    expect(new Headers(options?.headers).has('x-qc-csrf')).toBe(false)
  }
})
test.each([
  { status: 'unconfigured' as const, baseUrl: null },
  { status: 'configured' as const, baseUrl: 'https://api.example.com' },
  { status: 'configured' as const, baseUrl: 'http://localhost:9999' },
])('refuses unavailable or cross-origin configuration before transport', async other => {
  await expect(loadRecentActivity(other, config.baseUrl)).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})
test('refuses invalid lookup input before transport', async () => {
  await expect(loadCampaign({ id: '../invalid', revision: 1 }, config, config.baseUrl)).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})
