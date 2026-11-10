import { expect, test } from 'vitest'
import { parseExecutionPublications, ExecutionPublicationsContractError } from './executionPublications'
const row = () => ({ operationId: 'operation_001', network: 'INSTAGRAM', accountId: '12345', operation: { operationId: 'operation_001', accountId: '12345', packageHash: 'a'.repeat(64), state: 'PUBLISHED', executionMode: 'fake', updatedAt: '2026-11-10T12:00:00Z' } })

test('projects only public fields and confirms an empty scoped response', () => {
  expect(parseExecutionPublications([])).toEqual([])
  const result = parseExecutionPublications([{ ...row(), mediaReference: 'file:///private', transferEvidence: { url: 'https://private.invalid' } }])
  expect(result).toHaveLength(1)
  expect(JSON.stringify(result)).not.toMatch(/private|mediaReference|transferEvidence/)
})
test.each([null, {}, '[]', [null]])('refuses malformed envelopes: %j', value => {
  expect(() => parseExecutionPublications(value)).toThrow(ExecutionPublicationsContractError)
})
test.each([{ network: 'OTHER' },
{ accountId: 'private-account' },
{ operationId: '../private' },
{ operation: { ...row().operation, state: 'UNKNOWN' } },
{ operation: { ...row().operation, executionMode: 'unknown' } },
{ operation: { ...row().operation, operationId: 'other' } },
{ operation: { ...row().operation, packageHash: 'wrong' } },
{ operation: { ...row().operation, updatedAt: 'invalid' } }])('refuses incompatible identity and metadata: %j', change => {
  expect(() => parseExecutionPublications([{ ...row(), ...change }])).toThrow(ExecutionPublicationsContractError)
})
test('deduplicates identical legacy/current reservations and rejects conflicts', () => {
  expect(parseExecutionPublications([row(), row()])).toHaveLength(1)
  expect(() => parseExecutionPublications([row(), { ...row(), operation: null }])).toThrow(ExecutionPublicationsContractError)
})
test('preserves null operations, live mode and uncertain/failed states without declaring completion', () => {
  expect(parseExecutionPublications([{ ...row(), operation: null }])[0]?.operation).toBeNull()
  for (const state of ['FAILED', 'UNCERTAIN', 'PUBLISHED']) {
    expect(parseExecutionPublications([{ ...row(), operation: { ...row().operation, executionMode: 'live', state } }])[0]?.operation).toMatchObject({ state, executionMode: 'live' })
  }
})
