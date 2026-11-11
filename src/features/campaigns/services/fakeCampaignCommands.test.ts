import { expect, test, vi } from 'vitest'
import { ApiError } from '../../../services/http/client'
import { campaignFixture } from '../test/fixtures'
import { controlledExecutionFixture, executionIdFixture, fakeRequestFixture, registrationFixture, sessionFixture } from '../test/fakeCommandFixtures'
import { commandProblem, fakeCampaignCommands } from './fakeCampaignCommands'

const config = { status: 'configured' as const, baseUrl: 'http://localhost:5187' }
const api = () => fakeCampaignCommands(config, config.baseUrl)
test('validates QC session and sends cookies without storing credentials or forging Origin', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json(sessionFixture))
  expect(await api().session()).toEqual(sessionFixture)
  expect(fetch).toHaveBeenCalledWith(`${config.baseUrl}/operations/session`, expect.objectContaining({ method: 'GET', credentials: 'include', redirect: 'error', cache: 'no-store' }))
  expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0)
  expect(new Headers(vi.mocked(fetch).mock.calls[0]?.[1]?.headers).has('Origin')).toBe(false)
})
test('registers the exact Affiliate DTO and stable key, with FAKE confirmation and CSRF', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json(registrationFixture))
  await api().register(campaignFixture, 'fc_reg_test', true, sessionFixture.csrfToken)
  const [url, options] = vi.mocked(fetch).mock.calls[0]!
  expect(url).toBe(`${config.baseUrl}/operations/campaign-commands/campaigns`)
  expect(JSON.parse(String(options?.body))).toEqual({ mode: 'FAKE', confirmation: true, idempotencyKey: 'fc_reg_test', campaign: campaignFixture })
  expect(new Headers(options?.headers).get('x-qc-csrf')).toBe(sessionFixture.csrfToken)
})
test('prepares only the local FAKE payload and validates the persisted policy in the response', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json(controlledExecutionFixture('EXECUTION_ACCEPTED')))
  const result = await api().prepare(fakeRequestFixture, true, sessionFixture.csrfToken, sessionFixture.operatorId)
  expect(result.policy.publication).toBe('DISABLED'); expect(result.policy.providers).toBe('LOCAL_ONLY')
  expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body))).toEqual({ mode: 'FAKE', confirmation: true, request: fakeRequestFixture })
})
test('reads the exact execution and resumes with its actual version', async () => {
  vi.mocked(fetch).mockImplementation(async () => Response.json(controlledExecutionFixture()))
  const state = await api().read(executionIdFixture)
  await api().resume(state, true, sessionFixture.csrfToken)
  expect(JSON.parse(String(vi.mocked(fetch).mock.calls[1]?.[1]?.body))).toEqual({ mode: 'FAKE', confirmation: true, expectedVersion: 3 })
  expect(vi.mocked(fetch).mock.calls[1]?.[0]).toBe(`${config.baseUrl}/operations/campaign-commands/executions/${executionIdFixture}/resume`)
})
test('refuses missing confirmation, missing CSRF, invalid image, nonrecoverable state and unsafe origin before transport', async () => {
  await expect(api().register(campaignFixture, 'fc_reg_test', false, sessionFixture.csrfToken)).rejects.toThrow()
  await expect(api().register(campaignFixture, 'fc_reg_test', true, '')).rejects.toThrow()
  await expect(api().prepare({ ...fakeRequestFixture, localImage: { ...fakeRequestFixture.localImage, contentHash: 'invalid' } }, true, sessionFixture.csrfToken, sessionFixture.operatorId)).rejects.toThrow()
  await expect(api().resume({ ...controlledExecutionFixture(), execution: { ...controlledExecutionFixture().execution, status: 'SUCCEEDED' } } as Parameters<ReturnType<typeof api>['resume']>[0], true, sessionFixture.csrfToken)).rejects.toThrow()
  await expect(fakeCampaignCommands(config, 'https://example.com').session()).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})
test.each([
  [401, 'QC_AUTHENTICATION_REQUIRED', 'Sessão QC ausente'], [401, 'QC_SESSION_EXPIRED', 'Sessão QC expirada'],
  [403, 'QC_FAKE_COMMAND_OPERATOR_REQUIRED', 'sem permissão'], [403, 'QC_CSRF_REQUIRED', 'CSRF ausente ou inválido'],
  [503, 'QC_FAKE_COMMAND_CONFIGURATION_REQUIRED', 'BACKEND_OPT_IN_PENDING'], [503, 'FAKE_EXECUTION_PROVIDER_FORBIDDEN', 'provedores'],
  [404, null, 'RUNTIME_PENDING'], [409, 'EXECUTION_VERSION_CONFLICT', 'Conflito'],
] as const)('classifies HTTP %s %s without retrying a mutation', async (status, code, message) => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ code }, { status }))
  try { await api().register(campaignFixture, 'fc_reg_test', true, sessionFixture.csrfToken); throw new Error('expected rejection') } catch (error) { expect(commandProblem(error, true).message).toContain(message) }
  expect(fetch).toHaveBeenCalledTimes(1)
})
test.each([new ApiError('network'), new ApiError('aborted'), new ApiError('response'), new ApiError('http', 500), new Error('contract')])('treats uncertain mutations as ambiguous without automatic retries', error => {
  expect(commandProblem(error, true).kind).toBe('ambiguous')
  expect(commandProblem(error).kind).not.toBe('ambiguous')
})
