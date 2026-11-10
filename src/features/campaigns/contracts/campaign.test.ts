import { expect, test } from 'vitest'
import { campaignFixture } from '../test/fixtures'
import { parseCampaign, parseCampaignQuery } from './campaign'

test('validates a versioned campaign revision without inventing operational fields', () => {
  expect(parseCampaign(campaignFixture, { id: 'campaign_test', revision: 1 })).toEqual(campaignFixture)
})
test.each([
  null, [], {}, { ...campaignFixture, schemaVersion: 'affiliate-campaign/2.0.0' },
  { ...campaignFixture, revision: 0 }, { ...campaignFixture, productRevision: 1.5 },
  { ...campaignFixture, projectId: '../private' }, { ...campaignFixture, cta: '' },
  { ...campaignFixture, disclosure: 'x'.repeat(501) },
  { ...campaignFixture, affiliateUrl: 'javascript:alert(1)' },
  { ...campaignFixture, affiliateUrl: 'https://user:secret@example.com' },
  { ...campaignFixture, campaignId: 'other_campaign' }, { ...campaignFixture, revision: 2 },
])('rejects malformed or mismatched campaign responses: %j', value => {
  expect(() => parseCampaign(value, { id: 'campaign_test', revision: 1 })).toThrow('Contrato de campanha incompatível')
})
test.each([['campaign_test', '1'], ['abc', '42'], ['a'.repeat(80), '9007199254740991']])('accepts an official lookup identifier and revision', (id, revision) => {
  expect(parseCampaignQuery(id, revision)).toEqual({ id, revision: Number(revision) })
})
test.each([['', '1'], ['ABc', '1'], ['ab', '1'], ['../abc', '1'], ['abc', ''], ['abc', '0'], ['abc', '01'], ['abc', '1.5'], ['abc', '1e2'], ['abc', '9007199254740992']])('rejects invalid lookup inputs without transport', (id, revision) => {
  expect(parseCampaignQuery(id, revision)).toBeNull()
})
