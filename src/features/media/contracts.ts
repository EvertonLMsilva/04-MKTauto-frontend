import { parseCampaignExecutions, type CampaignExecution } from '../dashboard/contracts/campaignExecutions'

export const validExecutionId = (value: string) => /^[a-zA-Z0-9][a-zA-Z0-9_:.-]{2,199}$/.test(value)
export class MediaContractError extends Error {
  constructor() { super('Resposta de conteúdo incompatível.'); this.name = 'MediaContractError' }
}
const fail = (): never => { throw new MediaContractError() }
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : fail()
}
function text(value: unknown, max = 500): string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max ? value : fail()
}
function id(value: unknown): string { return typeof value === 'string' && validExecutionId(value) ? value : fail() }
function positive(value: unknown): number { return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : fail() }
function hash(value: unknown): string { return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? value : fail() }

export interface MediaScript {
  schemaVersion: 'script/1.0.0' | 'script/2.0.0'
  scriptId: string
  revision: number
  language: string
  contentFormat: 'short_video' | 'long_video'
  fullNarration: string
  estimatedDurationSeconds: number
}
export interface ExecutionContent {
  execution: CampaignExecution
  script: MediaScript | null
  narrationAvailable: boolean
  completedSteps: string[]
  nextAction: { code: string; message: string } | null
  preview: { ready: boolean; qc: 'PASS' | 'FAIL' | 'UNKNOWN'; renderId: string; contentHash: string } | null
}

/** Public projection of OperationsService.detail(). No URLs, paths, rights evidence or TTS configuration. */
export function parseExecutionContent(value: unknown, executionId: string): ExecutionContent {
  const row = record(value), rawExecution = record(row.execution)
  const execution = parseCampaignExecutions([rawExecution])[0] ?? fail()
  if (execution.execution_id !== executionId || typeof row.narrationAvailable !== 'boolean') return fail()
  const finalization = record(rawExecution.finalization)
  if (!Array.isArray(finalization.completedSteps) || !finalization.completedSteps.every(step => typeof step === 'string' && /^[A-Z_]{1,100}$/.test(step))) return fail()
  const completedSteps = finalization.completedSteps as string[]
  let script: MediaScript | null = null
  if (row.script !== null) {
    const raw = record(row.script)
    if (!['script/1.0.0', 'script/2.0.0'].includes(String(raw.schemaVersion)) || raw.pipelineRunId !== execution.run_id || !['short_video', 'long_video'].includes(String(raw.contentFormat))) return fail()
    const language = text(raw.language, 20)
    if (!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(language)) return fail()
    hash(raw.contentHash)
    script = {
      schemaVersion: raw.schemaVersion as MediaScript['schemaVersion'], scriptId: id(raw.scriptId),
      revision: positive(raw.revision), language, contentFormat: raw.contentFormat as MediaScript['contentFormat'],
      fullNarration: text(raw.fullNarration, 50000), estimatedDurationSeconds: positive(raw.estimatedDurationSeconds),
    }
  }
  let preview: ExecutionContent['preview'] = null
  if (finalization.preview != null) {
    const raw = record(finalization.preview), render = record(raw.videoRender), qc = record(raw.qc)
    if (typeof raw.ready !== 'boolean' || !['PASS', 'FAIL', 'UNKNOWN'].includes(String(qc.result)) || render.pipelineRunId !== execution.run_id) return fail()
    const renderId = id(render.videoRenderId), contentHash = hash(render.contentHash)
    if (qc.videoRenderId !== renderId || qc.videoRenderContentHash !== contentHash) return fail()
    if (raw.ready && (qc.result !== 'PASS' || !['BURN', 'QC', 'PREVIEW'].every(step => completedSteps.includes(step)))) return fail()
    preview = { ready: raw.ready, qc: qc.result as 'PASS' | 'FAIL' | 'UNKNOWN', renderId, contentHash }
  }
  const next = row.nextAction == null ? null : record(row.nextAction)
  return {
    execution, script, narrationAvailable: row.narrationAvailable, completedSteps, preview,
    nextAction: next ? { code: text(next.code, 200), message: text(next.message, 2000) } : null,
  }
}
