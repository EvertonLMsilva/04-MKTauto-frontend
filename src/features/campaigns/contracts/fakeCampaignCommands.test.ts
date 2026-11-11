import { expect, test } from 'vitest'
import { campaignFixture } from '../test/fixtures'
import { controlledExecutionFixture, evidenceFixture, fakeRequestFixture, registrationFixture, sessionFixture } from '../test/fakeCommandFixtures'
import { parseQcSession, parseRegistration, parseControlledExecution, validateCampaignDraft, validateExecutionDraft } from './fakeCampaignCommands'

test('accepts the official session, registration and state envelopes with matching identities', () => {
  expect(parseQcSession(sessionFixture)).toEqual(sessionFixture)
  expect(parseRegistration(registrationFixture, campaignFixture)).toEqual(campaignFixture)
  expect(parseControlledExecution(controlledExecutionFixture(), 'EXECUTION_STATE')).toEqual(controlledExecutionFixture())
})
test.each([{}, { ...sessionFixture, csrfToken: '' }, { ...sessionFixture, csrfToken: 'bad token' }, { ...sessionFixture, operatorId: 'user@example.com' }])('rejects invalid sessions: %j', value => expect(() => parseQcSession(value)).toThrow())
test.each([
  { schemaVersion: 'other/1' }, { mode: 'LIVE' }, { result: 'PUBLISHED' },
  { policy: { ...controlledExecutionFixture().policy, publication: 'ENABLED' } },
  { policy: { ...controlledExecutionFixture().policy, providers: 'EXTERNAL' } },
  { policy: { ...controlledExecutionFixture().policy, runId: 'run_other' } },
  { policy: { ...controlledExecutionFixture().policy, campaignRevision: 2 } },
  { execution: { ...controlledExecutionFixture().execution, status: 'PUBLISHED' } },
  { execution: { ...controlledExecutionFixture().execution, version: 0 } },
])('refuses incompatible or unsafe execution responses: %j', patch => expect(() => parseControlledExecution({ ...controlledExecutionFixture(), ...patch }, 'EXECUTION_STATE')).toThrow())
test('checks the requested execution, command and actor when supplied', () => {
  expect(() => parseControlledExecution(controlledExecutionFixture(), 'EXECUTION_STATE', { executionId: 'other' })).toThrow()
  expect(() => parseControlledExecution(controlledExecutionFixture('EXECUTION_ACCEPTED'), 'EXECUTION_ACCEPTED', { request: { ...fakeRequestFixture, requestId: 'other' }, actorId: sessionFixture.operatorId })).toThrow()
  expect(() => parseRegistration({ ...registrationFixture, campaign: { ...campaignFixture, productRevision: 9 } }, campaignFixture)).toThrow()
})
test('registration fields are required and checked without inventing project/product records', () => {
  const draft = Object.fromEntries(Object.entries(campaignFixture).filter(([key]) => key !== 'schemaVersion').map(([key, value]) => [key, String(value)]))
  expect(validateCampaignDraft(draft).data).toEqual(campaignFixture)
  expect(validateCampaignDraft({ ...draft, campaignId: '', revision: '0', affiliateUrl: 'http://example.com' }).errors).toHaveProperty('campaignId')
  expect(validateCampaignDraft({ ...draft, productRevision: '1.5' }).data).toBeNull()
})
test('rights require matching documented grants and an explicit operator confirmation', () => {
  const draft = { campaignId: campaignFixture.campaignId, campaignRevision: '1', projectVersion: '1', mediaReference: 'media_test', contentHash: 'a'.repeat(64), origin: 'OPERATOR_OWNED', usageBasis: 'OWNED', evidence: JSON.stringify(evidenceFixture) }
  expect(validateExecutionDraft(draft, true).data?.localImage.rights.commercialUseAllowed).toBe(true)
  expect(validateExecutionDraft(draft, false).data).toBeNull()
  for (const evidence of ['', '{}', '[]', JSON.stringify([{ ...evidenceFixture[0], mediaAuthorization: { ...evidenceFixture[0]!.mediaAuthorization, processing: 'DENIED' } }])]) expect(validateExecutionDraft({ ...draft, evidence }, true).data).toBeNull()
  expect(validateExecutionDraft({ ...draft, contentHash: 'b'.repeat(64) }, true).data).toBeNull()
  expect(validateExecutionDraft({ ...draft, origin: 'PROVIDER_GENERATED' }, true).data).toBeNull()
})
