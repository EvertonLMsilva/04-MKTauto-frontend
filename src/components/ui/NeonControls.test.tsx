import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { expect, test, vi } from 'vitest'
import { NeonButton } from './NeonButton'
import { NeonBadge } from './NeonBadge'
import { VisualFoundationPage } from '../../features/dashboard/VisualFoundationPage'

test('botão nativo responde ao teclado e não submete formulários por padrão', async () => {
  const user = userEvent.setup()
  const click = vi.fn()
  const submit = vi.fn((event) => event.preventDefault())
  render(<form onSubmit={submit}><NeonButton onClick={click}>Ação local</NeonButton></form>)
  const button = screen.getByRole('button', { name: 'Ação local' })
  expect(button).toHaveAttribute('type', 'button')
  await user.tab()
  await user.keyboard('{Enter}')
  expect(click).toHaveBeenCalledTimes(1)
  expect(submit).not.toHaveBeenCalled()
})

test.each([{ disabled: true }, { loading: true }])('controle indisponível não dispara ações: %j', async (props) => {
  const user = userEvent.setup()
  const action = vi.fn()
  render(<NeonButton {...props} onClick={action}>Exemplo indisponível</NeonButton>)
  const button = screen.getByRole('button', { name: /Exemplo indisponível/ })
  expect(button).toBeDisabled()
  await user.click(button)
  await user.keyboard('{Enter}')
  expect(action).not.toHaveBeenCalled()
  if ('loading' in props) expect(button).toHaveAttribute('aria-busy', 'true')
})

test('variante link preserva navegação React Router e semântica de link', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/example']}><Routes><Route path="/example" element={<NeonButton to="/">Retornar</NeonButton>} /><Route path="/" element={<h1>Destino de exemplo</h1>} /></Routes></MemoryRouter>)
  const link = screen.getByRole('link', { name: 'Retornar' })
  expect(link).toHaveAttribute('href', '/')
  expect(link).not.toHaveAttribute('disabled')
  await user.tab()
  await user.keyboard('{Enter}')
  expect(screen.getByRole('heading', { name: 'Destino de exemplo' })).toBeVisible()
})

test('badge tem texto legível e não cria um anúncio operacional ao vivo', () => {
  render(<NeonBadge tone="warning">Aguardando · demonstração</NeonBadge>)
  expect(screen.getByText('Aguardando · demonstração')).toBeVisible()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('catálogo identifica os exemplos e fornece feedback local sem consultar APIs', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter><VisualFoundationPage /></MemoryRouter>)
  expect(screen.getByText('Demonstração visual')).toBeVisible()
  for (const title of ['Paleta e tokens', 'Hierarquia tipográfica', 'Botões e navegação', 'Badges de estado', 'Estados da interface']) {
    expect(screen.getByRole('heading', { name: title })).toBeVisible()
  }
  await user.click(screen.getByRole('button', { name: 'Testar ação local' }))
  expect(screen.getByText('Ação local demonstrada. Nenhuma API foi chamada.')).toBeVisible()
  expect(fetch).not.toHaveBeenCalled()
})
