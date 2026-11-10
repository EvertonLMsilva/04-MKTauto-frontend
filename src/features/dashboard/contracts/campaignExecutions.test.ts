import { expect, test } from 'vitest'
import { CampaignExecutionsContractError, executionStates, parseCampaignExecutions } from './campaignExecutions'

const execution = (id = 'execution_001') => ({
  execution_id: id, campaign_id: 'campaign_001', campaign_revision: 1,
  run_id: 'run_001', status: 'SCHEDULED', version: 1,
  production_date: '2026-11-10', scheduled_at: '2026-11-10T12:00:00Z',
  created_at: '2026-11-09T12:00:00Z', updated_at: '2026-11-10T12:00:00Z',
  finalization: { pending: null, availableActions: ['CANCEL'] },
})

test('accepts all seven backend states and projects only public display fields', () => {
  const result = parseCampaignExecutions(executionStates.map((status, i) => ({ ...execution(`execution_${i}`), status, claim_token: 'private', provenance: { path: '/private' } })))
  expect(result.map(item => item.status)).toEqual(executionStates)
  expect(result[0]).not.toHaveProperty('claim_token')
  expect(result[0]).not.toHaveProperty('provenance')
  expect(result[0]).not.toHaveProperty('availableActions')
})

test('preserves backend ordering and accepts an empty array or exactly 100 records', () => {
  expect(parseCampaignExecutions([])).toEqual([])
  const rows = Array.from({ length: 100 }, (_, i) => execution(`execution_${100 - i}`))
  expect(parseCampaignExecutions(rows).map(row => row.execution_id)).toEqual(rows.map(row => row.execution_id))
})

test('missing dates and pending information stay null', () => {
  const row = execution()
  const { scheduled_at, created_at, updated_at, production_date, finalization, ...missing } = row
  expect([scheduled_at, created_at, updated_at, production_date, finalization]).toHaveLength(5)
  expect(parseCampaignExecutions([missing])[0]).toMatchObject({ scheduled_at: null, created_at: null, updated_at: null, production_date: null, pending: null })
  expect(parseCampaignExecutions([{ ...row, finalization: { pending: { code: 'AUDIO_REQUIRED', message: 'Disponibilize uma gravação autorizada.' } } }])[0]?.pending).toEqual({ code: 'AUDIO_REQUIRED', message: 'Disponibilize uma gravação autorizada.' })
})

test.each([
  null, {}, { items: [] }, [null], [execution(), execution()],
  Array.from({ length: 101 }, (_, i) => execution(`execution_${i}`)),
  [{ ...execution(), status: 'QUEUED' }], [{ ...execution(), status: null }],
  [{ ...execution(), execution_id: '' }], [{ ...execution(), campaign_revision: 0 }],
  [{ ...execution(), run_id: null }], [{ ...execution(), version: 1.5 }],
  [{ ...execution(), updated_at: 'yesterday' }], [{ ...execution(), production_date: '2026-02-31' }],
  [{ ...execution(), finalization: { pending: 'blocked' } }],
  [{ ...execution(), finalization: { pending: { code: 1, message: 'invalid' } } }],
])('rejects an incompatible list %#', value => {
  expect(() => parseCampaignExecutions(value)).toThrow(CampaignExecutionsContractError)
})
