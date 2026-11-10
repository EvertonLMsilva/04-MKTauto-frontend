import { expect, test } from 'vitest'
import { parseOperationalQueue, OperationalQueueContractError } from './operationalQueue'

function destination() {
  return { network: 'FACEBOOK_REELS', accountId: '123456789', required: true, operationId: null, originalOperationId: null, state: null, executionMode: null, simulated: false, activeClaim: false, version: null, supersessionRevision: 0, packageHash: null, packageRevision: null, approval: { decision: null, revoked: false, pending: true }, authorizationExpiresAt: null, authorizationExpired: false, requiresReconciliation: false, pendingCode: 'DISTRIBUTION_PACKAGE_REQUIRED', nextAction: 'REVIEW_PACKAGE', lastEvidence: null, receipt: null }
}
function page() {
  return { total: 1, limit: 25, offset: 0, items: [{ projectId: null, campaignId: 'campaign_001', campaignRevision: 1, occurrenceDate: '2026-11-10', executionId: 'execution_001', runId: 'run_001', campaignStatus: 'SUCCEEDED', blockingCode: null, publicationComplete: false, latestCampaignEvent: null, destinations: [destination()] }] }
}
test('preserves nulls and never infers publication from a successful campaign', () => {
  const value = page()
  expect(parseOperationalQueue(value)).toEqual(value)
  expect(parseOperationalQueue(value).items[0]?.publicationComplete).toBe(false)
})
test('retains UNKNOWN provider evidence and independent destinations', () => {
  const value = page()
  Object.assign(value.items[0]!.destinations[0]!, { state: 'UNCERTAIN', requiresReconciliation: true, lastEvidence: { at: '2026-11-10T12:00:00Z', version: 2, state: 'UNCERTAIN', errorCode: null, providerStatus: 'UNKNOWN', uncertainStage: 'PUBLISH' } })
  value.items[0]!.destinations.push({ ...destination(), network: 'INSTAGRAM', accountId: '987654321' })
  expect(parseOperationalQueue(value)).toEqual(value)
})
test.each([
  (p: ReturnType<typeof page>) => { p.limit = 0 },
  (p: ReturnType<typeof page>) => { p.offset = -1 },
  (p: ReturnType<typeof page>) => { p.total = 0 },
  (p: ReturnType<typeof page>) => { p.items.push(p.items[0]!) },
  (p: ReturnType<typeof page>) => { p.items[0]!.occurrenceDate = '2026-02-30' },
  (p: ReturnType<typeof page>) => { p.items[0]!.destinations.push(destination()) },
  (p: ReturnType<typeof page>) => { p.items[0]!.destinations[0]!.network = 'OTHER' },
  (p: ReturnType<typeof page>) => { p.items[0]!.publicationComplete = true },
])('refuses malformed or contradictory response %#', mutate => {
  const value = page(); mutate(value)
  expect(() => parseOperationalQueue(value)).toThrow(OperationalQueueContractError)
})
test('rejects string booleans, missing nullable fields and misleading receipts', () => {
  for (const patch of [{ simulated: 'false' }, { state: undefined }, { receipt: { mediaId: 'media_001' } }, { executionMode: 'fake', simulated: false }]) {
    const value = page(); Object.assign(value.items[0]!.destinations[0]!, patch)
    expect(() => parseOperationalQueue(value)).toThrow(OperationalQueueContractError)
  }
})
test('allows empty pages beyond a total that changed, without inventing items', () => {
  expect(parseOperationalQueue({ total: 0, limit: 25, offset: 25, items: [] }).items).toEqual([])
})
test('distinguishes live and fake receipts without discarding an expired grant', () => {
  for (const mode of ['fake', 'live']) {
    const value = page(); Object.assign(value.items[0]!.destinations[0]!, { state: 'PUBLISHED', executionMode: mode, simulated: mode === 'fake', receipt: { mediaId: 'media_001' }, authorizationExpiresAt: '2026-11-09T12:00:00Z', authorizationExpired: true })
    value.items[0]!.publicationComplete = true
    expect(parseOperationalQueue(value).items[0]?.destinations[0]?.executionMode).toBe(mode)
  }
})
