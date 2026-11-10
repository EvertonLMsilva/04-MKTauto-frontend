import { expect, test, vi } from 'vitest'
import { loadOperationalQueue } from './operationalQueue'
const config = { status: 'configured', baseUrl: 'http://localhost:5173' } as const
test('uses only the paginated GET and the existing same-origin QC cookie', async () => {
  const page = { total: 0, limit: 25, offset: 25, items: [] }
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(page)))
  const controller = new AbortController()
  expect(await loadOperationalQueue(config, config.baseUrl, 25, controller.signal)).toEqual(page)
  expect(fetch).toHaveBeenCalledExactlyOnceWith('http://localhost:5173/publishing/executions/queue?limit=25&offset=25', expect.objectContaining({ method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'error', signal: controller.signal }))
})
test.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])('refuses invalid offset before HTTP: %s', async offset => {
  await expect(loadOperationalQueue(config, config.baseUrl, offset)).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})
test('refuses cross-origin access without attempting authentication', async () => {
  await expect(loadOperationalQueue(config, 'http://localhost:3000')).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})
test.each([401, 403, 500])('preserves HTTP %s without retries or mutations', async status => {
  vi.mocked(fetch).mockResolvedValue(new Response('{}', { status }))
  await expect(loadOperationalQueue(config, config.baseUrl)).rejects.toMatchObject({ kind: 'http', status })
  expect(fetch).toHaveBeenCalledTimes(1)
})
test('refuses responses for a different page and malformed contracts', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ total: 0, limit: 25, offset: 25, items: [] }))).mockResolvedValueOnce(new Response('{}'))
  await expect(loadOperationalQueue(config, config.baseUrl)).rejects.toThrow('Contrato')
  await expect(loadOperationalQueue(config, config.baseUrl)).rejects.toThrow('Contrato')
})
