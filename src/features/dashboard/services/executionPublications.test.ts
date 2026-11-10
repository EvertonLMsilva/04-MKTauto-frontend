import { expect, test, vi } from 'vitest'
import { loadExecutionPublications } from './executionPublications'
const config = { status: 'configured', baseUrl: 'http://localhost:5173' } as const

test('only requests the selected identity with safe GET options and abort signal', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('[]'))
  const controller = new AbortController()
  expect(await loadExecutionPublications(config, config.baseUrl, 'run:001', controller.signal)).toEqual([])
  const [url, options] = vi.mocked(fetch).mock.calls[0]!
  expect(String(url)).toBe(config.baseUrl + '/publishing/executions/run%3A001/destinations')
  expect(options).toMatchObject({ method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'error', signal: controller.signal })
})
test('blocks incompatible origin, missing config and unsafe identity without requests', async () => {
  await expect(loadExecutionPublications(config, 'http://localhost:3000', 'run_001')).rejects.toThrow()
  await expect(loadExecutionPublications({ status: 'unconfigured', baseUrl: null }, config.baseUrl, 'run_001')).rejects.toThrow()
  await expect(loadExecutionPublications(config, config.baseUrl, '../private')).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})
test('never converts HTTP failure or invalid JSON into empty data', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 503 })).mockResolvedValueOnce(new Response('<html>'))
  await expect(loadExecutionPublications(config, config.baseUrl, 'run_001')).rejects.toThrow()
  await expect(loadExecutionPublications(config, config.baseUrl, 'run_001')).rejects.toThrow()
})
