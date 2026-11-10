import { expect, test } from 'vitest'
import { parseProcessingMedia, ProcessingMediaContractError } from './processingMedia'
const row = () => ({ schemaVersion: 'media-asset/2.0.0', mediaAssetId: 'asset_001', pipelineRunId: 'run_001', assetType: 'VIDEO', origin: 'PROVIDER_GENERATED', createdAt: '2026-11-10T12:00:00Z', revision: 1, supersedesMediaAssetId: null })

test('projects only public fields and confirms an empty scoped response', () => {
  expect(parseProcessingMedia([], 'run_001')).toEqual([])
  const result = parseProcessingMedia([{ ...row(), mediaReference: 'file:///private', transferEvidence: { url: 'https://private.invalid' } }], 'run_001')
  expect(result).toHaveLength(1)
  expect(JSON.stringify(result)).not.toMatch(/private|mediaReference|transferEvidence/)
})
test.each([null, {}, '[]', [null]])('refuses malformed envelopes: %j', value => {
  expect(() => parseProcessingMedia(value, 'run_001')).toThrow(ProcessingMediaContractError)
})
test.each([{ pipelineRunId: 'run_other' },
{ assetType: 'AUDIO' },
{ origin: 'UNKNOWN' },
{ revision: 0 },
{ createdAt: 'invalid' },
{ schemaVersion: 'media-asset/3.0.0' },
{ mediaAssetId: '../private' },
{ supersedesMediaAssetId: 'file:///private' }])('refuses incompatible identity and metadata: %j', change => {
  expect(() => parseProcessingMedia([{ ...row(), ...change }], 'run_001')).toThrow(ProcessingMediaContractError)
})
test('rejects duplicate media identities', () => {
  expect(() => parseProcessingMedia([row(), row()], 'run_001')).toThrow(ProcessingMediaContractError)
})
