import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { parseCampaignExecutions } from '../contracts/campaignExecutions'
import { CampaignQueue } from './CampaignQueue'

const rows = parseCampaignExecutions([
  { execution_id: 'execution_scheduled', campaign_id: 'campaign_001', campaign_revision: 1, run_id: 'run_001', version: 1, status: 'SCHEDULED' },
  { execution_id: 'execution_waiting', campaign_id: 'campaign_001', campaign_revision: 1, run_id: 'run_002', version: 2, status: 'WAITING_INPUT', finalization: { pending: { code: 'AUDIO_REQUIRED', message: 'Disponibilize gravação autorizada.' } } },
  { execution_id: 'execution_done', campaign_id: 'campaign_002', campaign_revision: 2, run_id: 'run_003', version: 4, status: 'SUCCEEDED' },
])
const props = { executions: rows, status: 'success' as const, message: 'Amostra recebida.', canRefresh: true, onRefresh: vi.fn() }
test('preserves backend order and displays only confirmed identities, states and pending information', () => {
  render(<CampaignQueue {...props} />)
  expect(screen.getAllByRole('article').map(article => article.getAttribute('aria-label'))).toEqual(rows.map(row => `Execução ${row.execution_id}`))
  expect(screen.getByText('Disponibilize gravação autorizada.')).toBeVisible()
  expect(screen.getAllByText('Não informado')).toHaveLength(9)
  expect(screen.getByText(/Sem paginação ou total global/)).toBeVisible()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
  expect(screen.getAllByRole('button')).toHaveLength(1)
})
test('filters by keyboard inside the loaded sample without changing server order or issuing HTTP', async () => {
  const user = userEvent.setup()
  render(<CampaignQueue {...props} />)
  const filter = screen.getByRole('combobox', { name: 'Filtrar estados da amostra' })
  await user.tab()
  expect(screen.getByRole('button', { name: 'Atualizar execuções' })).toHaveFocus()
  await user.tab()
  expect(filter).toHaveFocus()
  await user.selectOptions(filter, 'WAITING_INPUT')
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(screen.getByRole('article')).toHaveAccessibleName('Execução execution_waiting')
  expect(screen.getByText('Exibindo 1 de 3 registros desta amostra.')).toBeVisible()
  await user.selectOptions(filter, 'FAILED')
  expect(screen.getByText('Nenhuma execução corresponde ao filtro nesta amostra.')).toBeVisible()
  expect(fetch).not.toHaveBeenCalled()
})
test('distinguishes an unqueried list from a confirmed empty sample', () => {
  const { rerender } = render(<CampaignQueue {...props} executions={null} status="unavailable" />)
  expect(screen.getByRole('combobox')).toBeDisabled()
  expect(screen.queryByText(/Exibindo 0/)).not.toBeInTheDocument()
  rerender(<CampaignQueue {...props} executions={[]} status="empty" />)
  expect(screen.getByText(/Amostra vazia confirmada/)).toBeVisible()
  expect(screen.getByText('Exibindo 0 de 0 registros desta amostra.')).toBeVisible()
})
test('labels a sample of 100 without claiming it is the global queue', () => {
  const first = rows[0]
  if (!first) throw new Error('Missing isolated fixture')
  const sample = Array.from({ length: 100 }, (_, i) => ({ ...first, execution_id: `execution_${i}` }))
  render(<CampaignQueue {...props} executions={sample} />)
  expect(screen.getByText(/A amostra atingiu o limite de 100/)).toBeVisible()
  expect(screen.getByText('Exibindo 100 de 100 registros desta amostra.')).toBeVisible()
})
test('refresh is manual and disabled while loading; session errors point to the existing console', async () => {
  const refresh = vi.fn(), user = userEvent.setup()
  const { rerender } = render(<CampaignQueue {...props} onRefresh={refresh} status="loading" executions={null} />)
  expect(screen.getByRole('button')).toBeDisabled()
  rerender(<CampaignQueue {...props} onRefresh={refresh} status="unauthorized" executions={null} />)
  const panel = screen.getByRole('region', { name: 'Fila e execuções' })
  expect(within(panel).getByRole('alert')).toBeVisible()
  expect(screen.getByRole('link')).toHaveAttribute('href', '/operations')
  await user.click(screen.getByRole('button'))
  expect(refresh).toHaveBeenCalledOnce()
})
