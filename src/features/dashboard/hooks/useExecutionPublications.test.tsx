import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { useExecutionPublications } from './useExecutionPublications'
const config = { status: 'configured', baseUrl: 'http://localhost:5173' } as const
function deferred() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>(done => { resolve = done })
  return { promise, resolve }
}
test('does not query without selection or a compatible local origin', () => {
  for (const [id, value] of [[null, config], ['run_001', { status: 'unconfigured', baseUrl: null }], ['run_001', { status: 'configured', baseUrl: 'http://localhost:3000' }]] as const) {
    const { result, unmount } = renderHook(() => useExecutionPublications(id, value, config.baseUrl))
    expect(result.current.data).toBeNull()
    unmount()
  }
  expect(fetch).not.toHaveBeenCalled()
})
test('loads on selection without polling and only accepts a verified empty response', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('[]'))
  const { result, rerender } = renderHook(() => useExecutionPublications('run_001', config, config.baseUrl))
  await waitFor(() => expect(result.current.status).toBe('empty'))
  expect(result.current.data).toEqual([])
  rerender()
  expect(fetch).toHaveBeenCalledTimes(1)
})
test.each([401, 403, 404, 503])('HTTP %i remains unavailable until manual retry', async status => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status })).mockResolvedValueOnce(new Response('[]'))
  const { result } = renderHook(() => useExecutionPublications('run_001', config, config.baseUrl))
  await waitFor(() => expect(result.current.status).toBe([401, 403].includes(status) ? 'unauthorized' : 'error'))
  expect(result.current.data).toBeNull()
  expect(fetch).toHaveBeenCalledTimes(1)
  act(() => result.current.retry())
  await waitFor(() => expect(result.current.status).toBe('empty'))
  expect(fetch).toHaveBeenCalledTimes(2)
})
test.each(['{}', '<html>'])('rejects incompatible responses and HTML from an unconfigured proxy: %s', async body => {
  vi.mocked(fetch).mockResolvedValue(new Response(body))
  const { result } = renderHook(() => useExecutionPublications('run_001', config, config.baseUrl))
  await waitFor(() => expect(result.current.status).toBe('incompatible'))
  expect(result.current.data).toBeNull()
})
test('network errors never prove an empty list', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline'))
  const { result } = renderHook(() => useExecutionPublications('run_001', config, config.baseUrl))
  await waitFor(() => expect(result.current.status).toBe('error'))
  expect(result.current.data).toBeNull()
})
test('selection change cancels and ignores late responses, including transport ignoring abort', async () => {
  const old = deferred(), latest = deferred()
  vi.mocked(fetch).mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
  const { result, rerender, unmount } = renderHook(({ id }: { id: string | null }) => useExecutionPublications(id, config, config.baseUrl), { initialProps: { id: 'run_old' as string | null } })
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  const oldSignal = vi.mocked(fetch).mock.calls[0]?.[1]?.signal
  rerender({ id: 'run_new' })
  expect(result.current.data).toBeNull()
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  expect(oldSignal?.aborted).toBe(true)
  await act(async () => { latest.resolve(new Response('[]')) })
  await waitFor(() => expect(result.current.status).toBe('empty'))
  await act(async () => { old.resolve(new Response('{}', { status: 403 })) })
  expect(result.current.status).toBe('empty')
  const currentSignal = vi.mocked(fetch).mock.calls[1]?.[1]?.signal
  rerender({ id: null })
  expect(result.current.data).toBeNull()
  expect(currentSignal?.aborted).toBe(true)
  expect(fetch).toHaveBeenCalledTimes(2)
  unmount()
})
test('unmount aborts an in-flight request', async () => {
  vi.mocked(fetch).mockReturnValue(new Promise(() => {}))
  const { unmount } = renderHook(() => useExecutionPublications('run_001', config, config.baseUrl))
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  const signal = vi.mocked(fetch).mock.calls[0]?.[1]?.signal
  unmount()
  expect(signal?.aborted).toBe(true)
})
