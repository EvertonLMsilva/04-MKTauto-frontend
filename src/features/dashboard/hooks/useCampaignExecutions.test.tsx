import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { useCampaignExecutions } from './useCampaignExecutions'

const config = { status: 'configured', baseUrl: 'http://localhost:5173' } as const
const row = (id = 'execution_001') => ({ execution_id: id, campaign_id: 'campaign_001', campaign_revision: 1, run_id: 'run_001', version: 1, status: 'SCHEDULED' })
function deferred() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>(done => { resolve = done })
  return { promise, resolve }
}
test('configuration and same-origin gates prevent requests', () => {
  for (const value of [{ status: 'unconfigured', baseUrl: null }, { status: 'invalid', baseUrl: null }, { status: 'configured', baseUrl: 'http://localhost:3000' }] as const) {
    const { result, unmount } = renderHook(() => useCampaignExecutions(value, config.baseUrl))
    expect(result.current.status).toBe('unavailable')
    expect(result.current.data).toBeNull()
    unmount()
  }
  expect(fetch).not.toHaveBeenCalled()
})
test.each([true, false])('loads once and only calls an empty array empty: %s', async empty => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(empty ? [] : [row()])))
  const { result, rerender } = renderHook(() => useCampaignExecutions(config, config.baseUrl))
  await waitFor(() => expect(result.current.status).toBe(empty ? 'empty' : 'success'))
  rerender()
  expect(result.current.data).toHaveLength(empty ? 0 : 1)
  expect(fetch).toHaveBeenCalledTimes(1)
})
test.each([401, 403, 500])('classifies HTTP %i and retries only on request', async status => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status })).mockResolvedValueOnce(new Response('[]'))
  const { result } = renderHook(() => useCampaignExecutions(config, config.baseUrl))
  await waitFor(() => expect(result.current.status).toBe(status === 500 ? 'error' : 'unauthorized'))
  expect(result.current.data).toBeNull()
  expect(fetch).toHaveBeenCalledTimes(1)
  act(() => result.current.retry())
  await waitFor(() => expect(result.current.status).toBe('empty'))
  expect(fetch).toHaveBeenCalledTimes(2)
})
test.each(['{}', 'not-json'])('refuses incompatible responses: %s', async body => {
  vi.mocked(fetch).mockResolvedValue(new Response(body))
  const { result } = renderHook(() => useCampaignExecutions(config, config.baseUrl))
  await waitFor(() => expect(result.current.status).toBe('incompatible'))
  expect(result.current.data).toBeNull()
})
test('network errors never prove an empty list', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline'))
  const { result } = renderHook(() => useCampaignExecutions(config, config.baseUrl))
  await waitFor(() => expect(result.current.status).toBe('error'))
  expect(result.current.data).toBeNull()
})
test('retry aborts and ignores an obsolete response even when transport ignores cancellation', async () => {
  const old = deferred(), latest = deferred()
  vi.mocked(fetch).mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
  const { result, unmount } = renderHook(() => useCampaignExecutions(config, config.baseUrl))
  await waitFor(() => expect(result.current.status).toBe('loading'))
  const signal = vi.mocked(fetch).mock.calls[0]?.[1]?.signal
  act(() => result.current.retry())
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  expect(signal?.aborted).toBe(true)
  await act(async () => { latest.resolve(new Response(JSON.stringify([row('execution_new')])) ) })
  await waitFor(() => expect(result.current.data?.[0]?.execution_id).toBe('execution_new'))
  await act(async () => { old.resolve(new Response(JSON.stringify([row('execution_old')])) ) })
  expect(result.current.data?.[0]?.execution_id).toBe('execution_new')
  const currentSignal = vi.mocked(fetch).mock.calls[1]?.[1]?.signal
  unmount()
  expect(currentSignal?.aborted).toBe(true)
})
test('a configuration change clears data and aborts the previous read', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify([row()])))
  const { result, rerender } = renderHook(({ enabled }) => useCampaignExecutions(enabled ? config : { status: 'unconfigured', baseUrl: null }, config.baseUrl), { initialProps: { enabled: true } })
  await waitFor(() => expect(result.current.status).toBe('success'))
  const signal = vi.mocked(fetch).mock.calls[0]?.[1]?.signal
  rerender({ enabled: false })
  expect(result.current.data).toBeNull()
  expect(result.current.status).toBe('unavailable')
  expect(signal?.aborted).toBe(true)
})
