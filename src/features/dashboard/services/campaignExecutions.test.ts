import { expect, test, vi } from 'vitest'
import { ApiError } from '../../../services/http/client'
import { CampaignExecutionsContractError } from '../contracts/campaignExecutions'
import { loadCampaignExecutions } from './campaignExecutions'

const config = { status: 'configured', baseUrl: 'http://localhost:5173' } as const
test('reads only the documented endpoint with the existing local QC session', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('[]'))
  const controller = new AbortController()
  expect(await loadCampaignExecutions(config, config.baseUrl, controller.signal)).toEqual([])
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch).toHaveBeenCalledWith('http://localhost:5173/operations/executions', expect.objectContaining({ method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'error', signal: controller.signal }))
})
test.each([
  { status: 'unconfigured', baseUrl: null }, { status: 'invalid', baseUrl: null },
  { status: 'configured', baseUrl: 'http://localhost:3000' },
  { status: 'configured', baseUrl: 'https://external.example' },
] as const)('does not request data for incompatible access %#', async value => {
  await expect(loadCampaignExecutions(value, config.baseUrl)).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})
test.each([401, 403, 500])('preserves HTTP %i errors without a login mutation', async status => {
  vi.mocked(fetch).mockResolvedValue(new Response('{}', { status }))
  await expect(loadCampaignExecutions(config, config.baseUrl)).rejects.toMatchObject({ kind: 'http', status })
  expect(fetch).toHaveBeenCalledTimes(1)
})
test('rejects incompatible JSON and malformed response bodies', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response('{}')).mockResolvedValueOnce(new Response('not-json'))
  await expect(loadCampaignExecutions(config, config.baseUrl)).rejects.toBeInstanceOf(CampaignExecutionsContractError)
  await expect(loadCampaignExecutions(config, config.baseUrl)).rejects.toMatchObject({ kind: 'response' })
})
test('preserves network failure and cancellation from the shared transport', async () => {
  vi.mocked(fetch).mockRejectedValueOnce(new Error('offline')).mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))
  await expect(loadCampaignExecutions(config, config.baseUrl)).rejects.toBeInstanceOf(ApiError)
  await expect(loadCampaignExecutions(config, config.baseUrl)).rejects.toMatchObject({ kind: 'aborted' })
})
