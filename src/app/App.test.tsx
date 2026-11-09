import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, expect, test } from 'vitest'
import { App } from './App'
import { AppRoutes } from './AppRoutes'
import { AppShell } from '../components/layout/AppShell'

beforeEach(() => window.history.replaceState(null, '', '/'))

test('monta a aplicação sem inventar dados ou consultar o backend', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /uma nova base para sua operação/i })).toBeVisible()
  expect(screen.getByText('Nenhum dado operacional carregado')).toBeVisible()
  expect(fetch).not.toHaveBeenCalled()
})

test('AppShell oferece navegação, cabeçalho, conteúdo e menu acessível', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter><AppShell /></MemoryRouter>)
  expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument()
  expect(screen.getByRole('banner')).toBeInTheDocument()
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  const toggle = screen.getByRole('button', { name: 'Abrir menu' })
  await user.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await user.keyboard('{Escape}')
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
})

test('navega entre Dashboard e Base visual e sinaliza a rota atual', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter><AppRoutes /></MemoryRouter>)
  await user.click(screen.getByRole('link', { name: 'Base visual' }))
  expect(screen.getByRole('heading', { name: 'Uma linguagem visual compartilhada.' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Base visual' })).toHaveAttribute('aria-current', 'page')
  await user.click(screen.getByRole('link', { name: 'Dashboard' }))
  expect(screen.getByRole('heading', { name: /uma nova base para sua operação/i })).toBeVisible()
})

test('rota desconhecida permite retornar ao dashboard', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/nao-existe']}><AppRoutes /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  await user.click(screen.getByRole('link', { name: 'Voltar ao dashboard' }))
  expect(screen.getByRole('heading', { name: /uma nova base para sua operação/i })).toBeVisible()
})
