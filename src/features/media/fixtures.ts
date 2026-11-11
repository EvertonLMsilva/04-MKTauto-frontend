// Synthetic contracts for offline tests; never used by the page as operational data.
export const testOrigin = 'http://localhost:51666'
export function detailFixture(id = 'execution_a', run = 'run_a', ready = true) {
  return {
    execution: {
      execution_id: id, campaign_id: 'campaign_test', campaign_revision: 1, run_id: run,
      status: 'SCHEDULED', version: 4, production_date: '2026-11-10',
      scheduled_at: '2026-11-10T12:00:00.000Z', created_at: '2026-11-10T12:00:00.000Z', updated_at: '2026-11-10T12:00:00.000Z',
      claim_token: 'private-claim-must-not-appear',
      finalization: {
        step: 'HANDOFF', completedSteps: ready ? ['EDITORIAL', 'AUDIO', 'BURN', 'QC', 'PREVIEW'] : [],
        pending: { code: 'EXACT_HUMAN_APPROVAL_REQUIRED', message: 'Aprovação humana exata pendente.' },
        preview: ready ? {
          ready: true,
          videoRender: { schemaVersion: 'video-render/2.0.0', videoRenderId: 'render_a', pipelineRunId: run, contentHash: 'a'.repeat(64), logicalReference: 'private-render-path' },
          qc: { result: 'PASS', videoRenderId: 'render_a', videoRenderContentHash: 'a'.repeat(64) },
          url: 'https://untrusted.invalid/private-video.mp4',
        } : null,
      },
    },
    nextAction: { code: 'HUMAN_QC', message: 'Consultar aprovação no console.' },
    narrationAvailable: ready,
    script: ready ? {
      schemaVersion: 'script/2.0.0', scriptId: 'script_a', pipelineRunId: run, projectId: 'project_a', projectVersion: 1,
      language: 'pt-BR', contentFormat: 'short_video', hook: 'Texto de abertura.',
      narrativeBlocks: [{ position: 1, purpose: 'Demonstração', narration: 'Conteúdo da narração.' }],
      fullNarration: 'Texto de abertura.\n\nConteúdo da narração.\n\nConfira os detalhes.',
      cta: 'Confira os detalhes.', estimatedDurationSeconds: 20, revision: 1, contentHash: 'b'.repeat(64),
    } : null,
    media: [{ mediaAssetId: 'asset_a', position: 1, revision: 1 }],
    tts: { privateConfig: 'private-provider-config' },
  }
}
export function mediaFixture(run = 'run_a') {
  return [{ schemaVersion: 'media-asset/2.0.0', mediaAssetId: 'asset_a', pipelineRunId: run, assetType: 'IMAGE', origin: 'OPERATOR_OWNED', createdAt: '2026-11-10T12:00:00.000Z', revision: 1, supersedesMediaAssetId: null, mediaReference: 'private-source-path' }]
}
