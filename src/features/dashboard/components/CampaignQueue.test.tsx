import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { CampaignQueue } from './CampaignQueue'
import type { OperationalQueuePage, QueueDestination } from '../contracts/operationalQueue'
function destination(): QueueDestination {
  return { network: 'FACEBOOK_REELS', accountId: '123456789', required: true, operationId: 'operation_001', originalOperationId: null, state: 'UNCERTAIN', executionMode: 'live', simulated: false, activeClaim: false, version: 2, supersessionRevision: 0, packageHash: null, packageRevision: null, approval: { decision: 'APPROVED', revoked: false, pending: false }, authorizationExpiresAt: null, authorizationExpired: false, requiresReconciliation: true, pendingCode: 'SOCIAL_RECONCILIATION_REQUIRED', nextAction: 'AUTHORIZE_RECOVERY_AND_RECONCILE', lastEvidence: { at: '2026-11-10T12:00:00Z', version: 2, state: 'UNCERTAIN', errorCode: null, providerStatus: 'UNKNOWN', uncertainStage: 'PUBLISH' }, receipt: null }
}
function page(): OperationalQueuePage {
  return { total: 26, limit: 25, offset: 0, items: [{ projectId: null, campaignId: 'campaign_001', campaignRevision: 2, occurrenceDate: '2026-11-10', executionId: 'execution_001', runId: null, campaignStatus: 'SUCCEEDED', blockingCode: null, publicationComplete: false, latestCampaignEvent: null, destinations: [destination(), { ...destination(), network: 'INSTAGRAM', accountId: '987654321', state: 'PUBLISHED', receipt: { mediaId: 'receipt_ig' }, requiresReconciliation: false, lastEvidence: null, pendingCode: null, nextAction: 'NONE' }] }] }
}
const props = { page: page(), offset: 0, status: 'success' as const, message: 'Fila recebida.', canRefresh: true, onRefresh: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn() }
test('shows Instagram receipt independently from uncertain Facebook despite campaign success', () => {
  render(<CampaignQueue {...props} />)
  const fb = screen.getByRole('region', { name: 'Destino Facebook 123456789' })
  const ig = screen.getByRole('region', { name: 'Destino Instagram 987654321' })
  expect(within(fb).getByText('UNKNOWN')).toBeVisible()
  expect(within(fb).getByText('Sem recibo remoto confirmado.')).toBeVisible()
  expect(within(fb).getByText('Necessária')).toBeVisible()
  expect(within(ig).getByText('Recibo remoto confirmado pelo backend.')).toBeVisible()
  expect(screen.getByText('Recibos dos destinos obrigatórios: pendentes.')).toBeVisible()
  expect(screen.getByText('2026-11-10')).toBeVisible()
  expect(screen.getAllByRole('button').map(b => b.textContent)).toEqual(['Atualizar fila', 'Página anterior', 'Próxima página'])
  expect(fetch).not.toHaveBeenCalled()
})
test('fake receipt never claims a real publication; absent mode never becomes LIVE', () => {
  const value = page(); const d = value.items[0]!.destinations[1]!
  d.executionMode = 'fake'; d.simulated = true
  const { rerender } = render(<CampaignQueue {...props} page={value} />)
  const ig = () => screen.getByRole('region', { name: 'Destino Instagram 987654321' })
  expect(within(ig()).getByText('Simulação; não comprova publicação real.')).toBeVisible()
  expect(within(ig()).queryByText('Recibo remoto confirmado pelo backend.')).not.toBeInTheDocument()
  d.executionMode = null; d.simulated = false
  rerender(<CampaignQueue {...props} page={value} />)
  expect(within(ig()).getByText('Recibo informado; modo não informado.')).toBeVisible()
})
test('filters only the page, while pagination and refresh remain controlled reads', async () => {
  const user = userEvent.setup(), refresh = vi.fn(), next = vi.fn()
  render(<CampaignQueue {...props} onRefresh={refresh} onNext={next} />)
  await user.selectOptions(screen.getByRole('combobox'), 'FAILED')
  expect(screen.getByText('Nenhuma execução corresponde ao filtro nesta página.')).toBeVisible()
  expect(screen.getByText(/total informado: 26/)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Próxima página' })); expect(next).toHaveBeenCalledOnce()
  await user.click(screen.getByRole('button', { name: 'Atualizar fila' })); expect(refresh).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
  expect(fetch).not.toHaveBeenCalled()
})
test('distinguishes unqueried, loading, error, unauthorized and confirmed empty page', () => {
  const { rerender } = render(<CampaignQueue {...props} page={null} status="unavailable" canRefresh={false} />)
  expect(screen.getByText('Nenhuma página da fila disponível para exibição.')).toBeVisible()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  rerender(<CampaignQueue {...props} page={null} status="loading" />)
  expect(screen.getAllByRole('button').every(b => (b as HTMLButtonElement).disabled)).toBe(true)
  rerender(<CampaignQueue {...props} page={null} status="error" message="Falha de conexão." />)
  expect(screen.getByRole('alert')).toHaveTextContent('Falha de conexão.')
  rerender(<CampaignQueue {...props} page={null} status="unauthorized" message="Sessão não autorizada." />)
  expect(screen.getByRole('link')).toHaveAttribute('href', '/operations')
  rerender(<CampaignQueue {...props} page={{ total: 0, limit: 25, offset: 25, items: [] }} offset={25} status="empty" />)
  expect(screen.getByText('Página vazia confirmada pelo backend.')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Página anterior' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled()
})
test('null destination state, approval, authorization and evidence remain unspecified', () => {
  const value = page(), d = value.items[0]!.destinations[0]!
  d.state = null; d.lastEvidence = null; d.approval = { decision: null, pending: false, revoked: false }
  render(<CampaignQueue {...props} page={value} />)
  const fb = screen.getByRole('region', { name: 'Destino Facebook 123456789' })
  expect(within(fb).getByText('Estado não informado')).toBeVisible()
  expect(within(fb).getAllByText('Não informada')).toHaveLength(2)
})
