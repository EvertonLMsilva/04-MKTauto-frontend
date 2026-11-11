import { expect, test } from 'vitest'
import { detailFixture } from './fixtures'
import { parseExecutionContent, validExecutionId } from './contracts'

test('projeta somente dados públicos, preservando SCHEDULED e separando QC técnico de aprovação humana', () => {
  const result = parseExecutionContent(detailFixture(), 'execution_a')
  expect(result.execution.status).toBe('SCHEDULED')
  expect(result.preview?.qc).toBe('PASS')
  expect(result.execution.pending?.code).toBe('EXACT_HUMAN_APPROVAL_REQUIRED')
  expect(result.script?.fullNarration).toContain('Conteúdo da narração.')
  expect(JSON.stringify(result)).not.toMatch(/private-|untrusted|logicalReference|claim_token|tts/)
})
test.each(['script/1.0.0', 'script/2.0.0'])('aceita o contrato oficial de roteiro %s', schemaVersion => {
  const input = detailFixture()
  input.script!.schemaVersion = schemaVersion
  expect(parseExecutionContent(input, 'execution_a').script?.schemaVersion).toBe(schemaVersion)
})
test('mantém ausências explícitas sem criar roteiro, áudio, render ou QC', () => {
  const result = parseExecutionContent(detailFixture('execution_a', 'run_a', false), 'execution_a')
  expect(result).toMatchObject({ script: null, narrationAvailable: false, preview: null, completedSteps: [] })
})
test.each(['https://host.invalid/path', '../secret', 'ab', 'file:///video.mp4', 'a/b', 'a b'])('rejeita execução inválida %s', id => {
  expect(validExecutionId(id)).toBe(false)
})
test.each([
  (row: ReturnType<typeof detailFixture>) => { row.execution.execution_id = 'execution_b' },
  (row: ReturnType<typeof detailFixture>) => { row.script!.pipelineRunId = 'run_other' },
  (row: ReturnType<typeof detailFixture>) => { row.script!.schemaVersion = 'script/3.0.0' },
  (row: ReturnType<typeof detailFixture>) => { row.script!.estimatedDurationSeconds = -1 },
  (row: ReturnType<typeof detailFixture>) => { row.execution.finalization.preview!.videoRender.pipelineRunId = 'run_other' },
  (row: ReturnType<typeof detailFixture>) => { row.execution.finalization.preview!.qc.videoRenderContentHash = 'c'.repeat(64) },
  (row: ReturnType<typeof detailFixture>) => { row.execution.finalization.preview!.qc.result = 'UNKNOWN' },
  (row: ReturnType<typeof detailFixture>) => { row.execution.finalization.completedSteps = ['EDITORIAL'] },
])('rejeita identidade, versão, roteiro ou evidência de render incompatíveis (%#)', mutate => {
  const input = detailFixture(); mutate(input)
  expect(() => parseExecutionContent(input, 'execution_a')).toThrow()
})
