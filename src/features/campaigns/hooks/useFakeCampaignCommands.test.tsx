import { act, renderHook } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { useFakeCampaignCommands } from './useFakeCampaignCommands'
import { campaignFixture } from '../test/fixtures'
import { registrationFixture, sessionFixture } from '../test/fakeCommandFixtures'
const config = { status: 'configured' as const, baseUrl: 'http://localhost:5187' }
test('does not read sessions or issue commands on mount; verifies manually and keeps CSRF off the public state', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json(sessionFixture))
  const { result } = renderHook(() => useFakeCampaignCommands(config, config.baseUrl))
  expect(fetch).not.toHaveBeenCalled()
  await act(async () => { await result.current.verifySession() })
  expect(result.current.operator).toBe(sessionFixture.operatorId)
  expect(JSON.stringify(result.current)).not.toContain(sessionFixture.csrfToken)
})
test('blocks double submissions synchronously, rechecks the session and sends exactly one POST', async () => {
  let resolve!: (value: Response) => void
  vi.mocked(fetch).mockReturnValueOnce(new Promise(yes => { resolve = yes })).mockResolvedValueOnce(Response.json(registrationFixture))
  const { result } = renderHook(() => useFakeCampaignCommands(config, config.baseUrl))
  await act(async () => {
    const first = result.current.register(campaignFixture, 'fc_reg_test', true)
    const second = await result.current.register(campaignFixture, 'fc_reg_test', true)
    expect(second.ok).toBe(false)
    resolve(Response.json(sessionFixture)); expect((await first).ok).toBe(true)
  })
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(vi.mocked(fetch).mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1)
})
test.each(['QC_AUTHENTICATION_REQUIRED', 'QC_SESSION_EXPIRED'])('never POSTs when session preflight fails: %s', async code => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ code }, { status: 401 }))
  const { result } = renderHook(() => useFakeCampaignCommands(config, config.baseUrl))
  await act(async () => { expect((await result.current.register(campaignFixture, 'fc_reg_test', true)).ok).toBe(false) })
  expect(result.current.operator).toBeNull(); expect(result.current.problem?.kind).toBe('blocked')
  expect(fetch).toHaveBeenCalledTimes(1)
})
test('invalid CSRF invalidates the visible session and does not resend the mutation', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(sessionFixture)).mockResolvedValueOnce(Response.json({ code: 'QC_CSRF_REQUIRED' }, { status: 403 }))
  const { result } = renderHook(() => useFakeCampaignCommands(config, config.baseUrl))
  await act(async () => { await result.current.register(campaignFixture, 'fc_reg_test', true) })
  expect(result.current.operator).toBeNull(); expect(result.current.problem?.message).toContain('CSRF')
  expect(fetch).toHaveBeenCalledTimes(2)
})
test('ambiguous mutations block other commands until reconciliation, without generating retries', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(sessionFixture)).mockRejectedValueOnce(new TypeError('timeout'))
  const { result } = renderHook(() => useFakeCampaignCommands(config, config.baseUrl))
  await act(async () => { await result.current.register(campaignFixture, 'fc_reg_test', true) })
  expect(result.current.reconciliationRequired).toBe(true)
  await act(async () => { expect((await result.current.register(campaignFixture, 'fc_reg_other', true)).ok).toBe(false) })
  expect(fetch).toHaveBeenCalledTimes(2)
  act(() => result.current.resolveReconciliation('prepare'))
  expect(result.current.reconciliationRequired).toBe(true)
  act(() => result.current.resolveReconciliation('register'))
  expect(result.current.reconciliationRequired).toBe(false)
})
