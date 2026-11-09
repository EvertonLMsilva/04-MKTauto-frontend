import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { NeonPanel } from './NeonPanel'
import { StatusMessage } from './StatusMessage'

test('painel mantém a API existente e é uma região informativa, sem ação artificial', () => {
  render(<NeonPanel title="Painel de exemplo" eyebrow="DEMONSTRAÇÃO" id="sample-panel"><p>Conteúdo do painel.</p></NeonPanel>)
  const panel = screen.getByRole('region', { name: 'Painel de exemplo' })
  expect(panel).toHaveAttribute('id', 'sample-panel')
  expect(panel).not.toHaveAttribute('tabindex')
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Painel de exemplo', level: 2 })).toBeVisible()
})

test('ação adicional do painel é um controle independente e acionável por teclado', async () => {
  const user = userEvent.setup()
  const action = vi.fn()
  render(<NeonPanel title="Painel com ação" action={<button onClick={action}>Testar ação</button>}><p>Conteúdo.</p></NeonPanel>)
  await user.tab()
  await user.keyboard('{Enter}')
  expect(action).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('region', { name: 'Painel com ação' })).not.toHaveAttribute('role', 'button')
})

test.each([
  { tone: 'info', role: 'status', label: 'Informação' },
  { tone: 'loading', role: 'status', label: 'Carregando' },
  { tone: 'success', role: 'status', label: 'Sucesso' },
  { tone: 'error', role: 'alert', label: 'Erro' },
] as const)('estado $tone preserva semântica e informa seu significado sem depender da cor', ({ tone, role, label }) => {
  render(<StatusMessage tone={tone}>Conteúdo de demonstração.</StatusMessage>)
  const message = screen.getByRole(role)
  expect(message).toHaveTextContent(`${label}:`)
  expect(message).toHaveTextContent('Conteúdo de demonstração.')
  expect(message.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  if (tone === 'loading') expect(message).toHaveAttribute('aria-busy', 'true')
})
