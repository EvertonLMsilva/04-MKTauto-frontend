import { render, screen, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { RecentPublicationsPanel } from './RecentPublicationsPanel'
import { parseExecutionPublications } from '../contracts/executionPublications'
import type { useExecutionPublications } from '../hooks/useExecutionPublications'

const data = parseExecutionPublications(['PUBLISHED', 'PUBLISHED', 'FAILED', 'UNCERTAIN'].map((state, index) => ({ operationId: `operation_${index}`, network: 'INSTAGRAM', accountId: '12345', operation: { operationId: `operation_${index}`, accountId: '12345', packageHash: 'a'.repeat(64), state, executionMode: index === 0 ? 'fake' : 'live', updatedAt: '2026-11-10T12:00:00Z' } })))
const state: ReturnType<typeof useExecutionPublications> = { status: 'success', access: 'ready', retry: vi.fn(), message: 'Consulta recebida.', data }
test('separates simulated completion, live completion and unconfirmed failures/uncertainty', () => {
  const { container } = render(<RecentPublicationsPanel executionId="execution_001" state={state} />)
  const rows = screen.getAllByRole('listitem')
  expect(within(rows[0]!).getByText('FAKE · simulação')).toBeVisible()
  expect(within(rows[0]!).getByText('Concluída · conclusão simulada')).toBeVisible()
  expect(within(rows[1]!).getByText('Concluída · publicação confirmada')).toBeVisible()
  for (const row of rows.slice(2)) expect(row).toHaveTextContent('publicação não confirmada')
  expect(screen.queryByRole('heading', { name: 'Publicações recentes' })).not.toBeInTheDocument()
  expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual(['Atualizar publicações'])
  expect(container.querySelectorAll('time')).toHaveLength(4)
  expect(fetch).not.toHaveBeenCalled()
})
test('null operation makes neither mode nor completion claims', () => {
  render(<RecentPublicationsPanel executionId="execution_001" state={{ ...state, data: [{ operationId: 'missing_001', network: 'FACEBOOK_REELS', accountId: '12345', operation: null }] }} />)
  expect(screen.getByText('Operação indisponível. Estado e modo não comprovados.')).toBeVisible()
  expect(screen.queryByText('FAKE · simulação')).not.toBeInTheDocument()
  expect(screen.queryByText('LIVE · operação real')).not.toBeInTheDocument()
})

test('keeps full execution context during a failed query without displaying a fabricated empty history', () => {
  const executionId = `execution_${'identity_'.repeat(20)}`
  render(<RecentPublicationsPanel executionId={executionId} state={{ ...state, status: 'error', data: null, message: 'Consulta indisponível.' }} />)
  expect(screen.getByLabelText('Vínculo das publicações')).toHaveTextContent(executionId)
  expect(screen.getByRole('alert')).toHaveTextContent('Consulta indisponível.')
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
  expect(screen.queryByText(/conclusão simulada|publicação confirmada/)).not.toBeInTheDocument()
  expect(fetch).not.toHaveBeenCalled()
})
