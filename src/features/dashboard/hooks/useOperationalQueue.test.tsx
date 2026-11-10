import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { useOperationalQueue } from './useOperationalQueue'
const config = { status: 'configured', baseUrl: 'http://localhost:5173' } as const
function page(offset = 0) { return { total: 50, limit: 25, offset, items: [{ projectId: null, campaignId: 'campaign_001', campaignRevision: 1, occurrenceDate: null, executionId: `execution_${offset}`, runId: null, campaignStatus: 'SUCCEEDED', blockingCode: null, publicationComplete: false, latestCampaignEvent: null, destinations: [] }] } }
function response(value: unknown) { return new Response(JSON.stringify(value)) }
test('configuration and origin gates make no request', () => {
  for (const c of [{ status: 'unconfigured', baseUrl: null }, { status: 'invalid', baseUrl: null }, { status: 'configured', baseUrl: 'http://localhost:3000' }] as const) {
    const { result, unmount } = renderHook(() => useOperationalQueue(c, config.baseUrl))
    expect(result.current.status).toBe('unavailable'); expect(result.current.data).toBeNull(); unmount()
  }
  expect(fetch).not.toHaveBeenCalled()
})
test('loads once, paginates manually and refreshes only the current page', async () => {
  vi.mocked(fetch).mockImplementation(input => Promise.resolve(response(page(new URL(String(input)).searchParams.get('offset') === '25' ? 25 : 0))))
  const { result, rerender } = renderHook(() => useOperationalQueue(config, config.baseUrl))
  await waitFor(() => expect(result.current.status).toBe('success'))
  rerender(); expect(fetch).toHaveBeenCalledTimes(1)
  vi.useFakeTimers()
  try { act(() => vi.advanceTimersByTime(60000)); expect(fetch).toHaveBeenCalledTimes(1) } finally { vi.useRealTimers() }
  act(() => result.current.next())
  await waitFor(() => expect(result.current.data?.offset).toBe(25))
  act(() => { result.current.retry(); result.current.retry() })
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3))
  await waitFor(() => expect(result.current.status).toBe('success'))
  expect(result.current.offset).toBe(25)
  act(() => result.current.previous())
  await waitFor(() => expect(result.current.data?.offset).toBe(0))
  expect(fetch).toHaveBeenCalledTimes(4)
})
test.each([401, 403, 500])('HTTP %s clears data without automatic retry', async status => {
  vi.mocked(fetch).mockResolvedValue(new Response('{}', { status }))
  const { result } = renderHook(() => useOperationalQueue(config, config.baseUrl))
  await waitFor(() => expect(result.current.status).toBe(status === 500 ? 'error' : 'unauthorized'))
  expect(result.current.data).toBeNull(); expect(fetch).toHaveBeenCalledTimes(1)
  vi.mocked(fetch).mockResolvedValue(response({ total: 0, limit: 25, offset: 0, items: [] }))
  act(() => result.current.retry())
  await waitFor(() => expect(result.current.status).toBe('empty'))
})
test.each(['{}', 'not-json'])('incompatible response is not an empty queue: %s', async body => {
  vi.mocked(fetch).mockResolvedValue(new Response(body))
  const { result } = renderHook(() => useOperationalQueue(config, config.baseUrl))
  await waitFor(() => expect(result.current.status).toBe('incompatible'))
  expect(result.current.data).toBeNull()
})
test('loading blocks repeated refresh and unmount aborts the request', async () => {
  vi.mocked(fetch).mockReturnValue(new Promise(() => {}))
  const { result, unmount } = renderHook(() => useOperationalQueue(config, config.baseUrl))
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  act(() => { result.current.retry(); result.current.next() })
  expect(fetch).toHaveBeenCalledTimes(1)
  const signal = vi.mocked(fetch).mock.calls[0]?.[1]?.signal
  unmount(); expect(signal?.aborted).toBe(true)
})
test('ignores an obsolete response after access changes, even if transport ignores abort', async () => {
  let complete!: (value: Response) => void
  vi.mocked(fetch).mockReturnValueOnce(new Promise(resolve => { complete = resolve })).mockResolvedValue(response(page()))
  const { result, rerender } = renderHook(({ enabled }) => useOperationalQueue(enabled ? config : { status: 'unconfigured', baseUrl: null }, config.baseUrl), { initialProps: { enabled: true } })
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  const signal = vi.mocked(fetch).mock.calls[0]?.[1]?.signal
  rerender({ enabled: false }); expect(result.current.data).toBeNull(); expect(signal?.aborted).toBe(true)
  rerender({ enabled: true })
  await waitFor(() => expect(result.current.status).toBe('success'))
  await act(async () => { complete(response({ total: 0, limit: 25, offset: 0, items: [] })) })
  expect(result.current.data?.total).toBe(50)
})
test('network failure never becomes confirmed emptiness', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline'))
  const { result } = renderHook(() => useOperationalQueue(config, config.baseUrl))
  await waitFor(() => expect(result.current.status).toBe('error'))
  expect(result.current.data).toBeNull()
})
