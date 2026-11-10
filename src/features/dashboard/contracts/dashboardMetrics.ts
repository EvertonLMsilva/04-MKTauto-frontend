/** Mirror of NestJS dashboard-summary.contract.ts; validated at the HTTP boundary. */
export const dashboardScope = {
  period: 'all_time', source: 'PROJECT_API_DATABASE', publicationSource: 'social_publication_operations',
  publicationHistoryDatabaseIncluded: false, manualPublicationsIncluded: false,
  qcFamily: 'quality-control-report/1.0.0', qcPolicy: 'quality-control-policy/1.0.0',
  qcHumanApprovalIncluded: false, access: 'local-qc-same-origin',
  units: {
    activeCampaigns: 'undefined', runningExecutions: 'execution_id_with_status_RUNNING',
    generatedMedia: 'unique_materialized_provider_generated_content_hash_unproven',
    socialPublicationsFake: 'fake_published_network_account_remote_media_id',
    socialPublicationsLive: 'live_published_network_account_remote_media_id',
    completedPublications: 'combined_total_undefined', qcApproved: 'V1_PASS_evaluation',
    qcEvaluated: 'V1_PASS_WARN_FAIL_unique_policy_render_hash_evaluation', qcApprovalRate: 'percent_PASS_over_PASS_WARN_FAIL',
  },
} as const
export const metricKeys = ['runningExecutions', 'activeCampaigns', 'generatedMedia', 'completedPublications', 'socialPublicationsFake', 'socialPublicationsLive', 'qcApproved', 'qcEvaluated', 'qcApprovalRate'] as const
export type MetricKey = typeof metricKeys[number]
const reasons = ['ACTIVE_CAMPAIGN_DEFINITION_REQUIRED', 'COMBINED_PUBLICATIONS_UNDEFINED', 'MEDIA_MATERIALIZATION_NOT_PROVEN', 'DATABASE_NOT_CONFIGURED', 'DATABASE_UNAVAILABLE', 'SCHEMA_INCOMPATIBLE', 'SOURCE_READ_FAILED', 'PUBLICATION_SCOPE_UNAVAILABLE', 'PUBLICATION_MODE_NOT_IN_SOURCE', 'INVALID_PUBLICATION_SOURCE', 'PUBLICATION_IDENTITY_CONFLICT', 'INVALID_QC_SOURCE', 'QC_IDENTITY_CONFLICT', 'INVALID_AGGREGATE', 'NO_QC_EVALUATIONS'] as const
export type UnavailableReason = typeof reasons[number]
export type Availability = { status: 'AVAILABLE' | 'UNAVAILABLE'; reason: UnavailableReason | null }
export type DashboardSummary = Record<MetricKey, number | null> & {
  schemaVersion: 'operations-dashboard-summary/1.0.0'
  generatedAt: string
  scope: typeof dashboardScope & { publicationMode: 'fake' | 'live' | null }
  availability: Record<MetricKey, Availability>
}
export class DashboardContractError extends Error {
  constructor() { super('Contrato de indicadores incompatível.'); this.name = 'DashboardContractError' }
}
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function required(condition: unknown): asserts condition { if (!condition) throw new DashboardContractError() }

export function parseDashboardSummary(input: unknown): DashboardSummary {
  required(record(input) && input.schemaVersion === 'operations-dashboard-summary/1.0.0')
  required(typeof input.generatedAt === 'string' && Number.isFinite(Date.parse(input.generatedAt)) && new Date(input.generatedAt).toISOString() === input.generatedAt)
  required(record(input.scope) && record(input.scope.units) && record(input.availability))
  for (const [key, expected] of Object.entries(dashboardScope)) {
    if (key !== 'units') required(input.scope[key] === expected)
  }
  for (const [key, expected] of Object.entries(dashboardScope.units)) required(input.scope.units[key] === expected)
  required(input.scope.publicationMode === null || input.scope.publicationMode === 'fake' || input.scope.publicationMode === 'live')
  const values = {} as Record<MetricKey, number | null>
  const availability = {} as Record<MetricKey, Availability>
  for (const key of metricKeys) {
    const value = input[key], state = input.availability[key]
    required(record(state))
    if (state.status === 'AVAILABLE') {
      required(state.reason === null && typeof value === 'number' && Number.isFinite(value) && value >= 0)
      required(key === 'qcApprovalRate' ? value <= 100 : Number.isSafeInteger(value))
    } else {
      required(state.status === 'UNAVAILABLE' && value === null && typeof state.reason === 'string' && (reasons as readonly string[]).includes(state.reason))
    }
    values[key] = value as number | null
    availability[key] = { status: state.status as Availability['status'], reason: state.reason as Availability['reason'] }
  }
  required(values.activeCampaigns === null && availability.activeCampaigns.reason === 'ACTIVE_CAMPAIGN_DEFINITION_REQUIRED')
  required(values.completedPublications === null && availability.completedPublications.reason === 'COMBINED_PUBLICATIONS_UNDEFINED')
  // This version explicitly says materialization is unproven; a number is not a supported unit.
  required(values.generatedMedia === null)
  required((values.qcApproved === null) === (values.qcEvaluated === null))
  if (values.qcApproved !== null && values.qcEvaluated !== null) required(values.qcApproved <= values.qcEvaluated)
  if (values.qcEvaluated === null || values.qcEvaluated === 0) required(values.qcApprovalRate === null)
  return {
    ...values, schemaVersion: 'operations-dashboard-summary/1.0.0', generatedAt: input.generatedAt,
    scope: { ...dashboardScope, publicationMode: input.scope.publicationMode }, availability,
  }
}

export const reasonLabels: Record<UnavailableReason, string> = {
  ACTIVE_CAMPAIGN_DEFINITION_REQUIRED: 'Definição operacional ainda não estabelecida.',
  COMBINED_PUBLICATIONS_UNDEFINED: 'O contrato não define um total combinado.',
  MEDIA_MATERIALIZATION_NOT_PROVEN: 'Materialização de mídias ainda não comprovada pela fonte.',
  DATABASE_NOT_CONFIGURED: 'Fonte de dados não configurada no backend.', DATABASE_UNAVAILABLE: 'Fonte de dados indisponível.',
  SCHEMA_INCOMPATIBLE: 'Schema da fonte incompatível.', SOURCE_READ_FAILED: 'A fonte não pôde ser consultada.',
  PUBLICATION_SCOPE_UNAVAILABLE: 'Escopo de publicação indisponível.', PUBLICATION_MODE_NOT_IN_SOURCE: 'Este modo não está presente na fonte consultada.',
  INVALID_PUBLICATION_SOURCE: 'Fonte de publicação inválida.', PUBLICATION_IDENTITY_CONFLICT: 'Conflito de identidade de publicação.',
  INVALID_QC_SOURCE: 'Fonte de QC inválida.', QC_IDENTITY_CONFLICT: 'Conflito de identidade de QC.',
  INVALID_AGGREGATE: 'Agregado inválido na fonte.', NO_QC_EVALUATIONS: 'Nenhuma avaliação técnica disponível para calcular a taxa.',
}
