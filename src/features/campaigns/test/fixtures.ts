// Synthetic documents for offline tests only. Never used as application data.
export const campaignFixture = {
  schemaVersion: 'affiliate-campaign/1.0.0' as const, campaignId: 'campaign_test', revision: 1,
  projectId: 'project_test', productId: 'product_test', productRevision: 2,
  affiliateUrl: 'https://example.com/test-only', cta: 'Conheça o produto de teste.',
  disclosure: 'Publicidade. Link de afiliado',
}
export const executionFixture = {
  execution_id: 'execution_test', campaign_id: 'campaign_test', campaign_revision: 1,
  run_id: 'run_test', status: 'RUNNING', version: 1,
  created_at: '2026-11-10T12:00:00Z', updated_at: '2026-11-10T12:05:00Z',
}
