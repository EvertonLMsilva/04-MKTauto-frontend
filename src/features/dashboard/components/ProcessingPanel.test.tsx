import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { ProcessingPanel } from './ProcessingPanel'
import { parseCampaignExecutions } from '../contracts/campaignExecutions'

const executions = parseCampaignExecutions(['RUNNING', 'WAITING_INPUT', 'WAITING_RECONCILIATION', 'SUCCEEDED', 'FAILED'].map((status, index) => ({ execution_id: `execution_${index}`, campaign_id: 'campaign_001', run_id: `run_${index}`, campaign_revision: 1, version: 1, status, updated_at: index === 0 ? '2026-11-10T12:00:00Z' : null, finalization: { pending: index === 1 ? { code: 'INPUT_REQUIRED', message: 'Forneça o insumo autorizado.' } : null } })))
test('shows only processing states with timestamps, identifiers and honest missing pending data', () => {
  const { container } = render(<ProcessingPanel executions={executions} status="success" message="Recebido" selectedId="" onSelect={vi.fn()} />)
  expect(screen.getAllByRole('article')).toHaveLength(3)
  for (const label of ['Processando', 'Aguardando insumo', 'Aguardando reconciliação', 'Forneça o insumo autorizado.', 'Motivo da pendência não informado.']) expect(screen.getByText(label)).toBeVisible()
  expect(container.querySelector('time')).toHaveAttribute('datetime', '2026-11-10T12:00:00Z')
  expect(container.querySelector('button, [role="progressbar"]')).toBeNull()
  expect(container.textContent).not.toMatch(/\d+%|worker|estimativa de conclusão/i)
  expect(fetch).not.toHaveBeenCalled()
})
test('selection includes ended executions and only changes local selection', async () => {
  const onSelect = vi.fn()
  render(<ProcessingPanel executions={executions} status="success" message="Recebido" selectedId="" onSelect={onSelect} />)
  const select = screen.getByRole('combobox')
  expect(within(select).getAllByRole('option')).toHaveLength(6)
  await userEvent.setup().selectOptions(select, 'execution_3')
  expect(onSelect).toHaveBeenCalledWith('execution_3')
  expect(fetch).not.toHaveBeenCalled()
})
test.each(['loading', 'unauthorized', 'error', 'incompatible'] as const)('missing sample keeps selection disabled: %s', status => {
  render(<ProcessingPanel executions={null} status={status} message="Consulta não disponível" selectedId="" onSelect={vi.fn()} />)
  expect(screen.getByRole('combobox')).toBeDisabled()
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
  expect(screen.getByText('Consulta não disponível')).toBeVisible()
  expect(screen.queryByText(/Nenhum processamento nesses/)).not.toBeInTheDocument()
})
test('verified empty and completed-only samples are distinct from unavailable', () => {
  render(<ProcessingPanel executions={executions.filter(item => item.status === 'SUCCEEDED')} status="success" message="Recebido" selectedId="" onSelect={vi.fn()} />)
  expect(screen.getByText(/Nenhum processamento nesses três estados/)).toBeVisible()
  expect(screen.getByRole('combobox')).toBeEnabled()
})

test('selected execution exposes its complete identity, run and state outside the native select', () => {
  const execution = { ...executions[3]!, execution_id: `execution_${'long_identity_'.repeat(12)}`, run_id: `run_${'pipeline_'.repeat(18)}` }
  const { rerender } = render(<ProcessingPanel executions={[execution]} status="success" message="Recebido" selectedId={execution.execution_id} onSelect={vi.fn()} />)
  const context = screen.getByLabelText('Execução selecionada')
  expect(within(context).getByText(execution.execution_id, { exact: true })).toBeVisible()
  expect(within(context).getByText(execution.run_id, { exact: true })).toBeVisible()
  expect(within(context).getByText('Concluída')).toBeVisible()
  expect(screen.getByRole('combobox')).toHaveAccessibleDescription(/Seleção local; inclui execuções encerradas/)
  expect(screen.getByRole('option', { name: `Concluída · ${execution.execution_id}` })).toBeInTheDocument()
  rerender(<ProcessingPanel executions={[execution]} status="success" message="Recebido" selectedId="" onSelect={vi.fn()} />)
  expect(screen.queryByLabelText('Execução selecionada')).not.toBeInTheDocument()
  expect(fetch).not.toHaveBeenCalled()
})
