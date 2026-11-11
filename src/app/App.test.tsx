import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, expect, test, vi } from 'vitest'
import { App } from './App'
import { AppRoutes } from './AppRoutes'
import { AppShell } from '../components/layout/AppShell'

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

test('monta a aplicação sem inventar dados ou consultar o backend', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /sua operação. uma nova dimensão/i })).toBeVisible()
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
  expect(toggle).toHaveFocus()
})

test('navega entre Dashboard, Campanhas, Mídia e Base visual e sinaliza a rota atual', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter><AppRoutes /></MemoryRouter>)
  await user.click(screen.getByRole('link', { name: 'Campanhas' }))
  expect(screen.getByRole('heading', { name: 'Campanhas', level: 1 })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Campanhas' })).toHaveAttribute('aria-current', 'page')
  await user.click(screen.getByRole('link', { name: 'Mídia' }))
  expect(screen.getByRole('heading', { name: 'Mídia', level: 1 })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Mídia' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('navigation', { name: 'Localização' })).toHaveTextContent('Mídia')
  await user.click(screen.getByRole('link', { name: 'Base visual' }))
  expect(screen.getByRole('heading', { name: 'Uma linguagem visual compartilhada.' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Base visual' })).toHaveAttribute('aria-current', 'page')
  await user.click(screen.getByRole('link', { name: 'Dashboard' }))
  expect(screen.getByRole('heading', { name: /sua operação. uma nova dimensão/i })).toBeVisible()
})

test('rota desconhecida permite retornar ao dashboard', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/nao-existe']}><AppRoutes /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  await user.click(screen.getByRole('link', { name: 'Voltar ao dashboard' }))
  expect(screen.getByRole('heading', { name: /sua operação. uma nova dimensão/i })).toBeVisible()
})

test('menu permite navegar por teclado, fecha após navegar e transfere o foco ao conteúdo', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter><AppRoutes /></MemoryRouter>)
  const toggle = screen.getByRole('button', { name: 'Abrir menu' })
  await user.click(toggle)
  await user.tab()
  expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('link', { name: 'Campanhas' })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByRole('main')).toHaveFocus()
  expect(screen.getByRole('navigation', { name: 'Localização' })).toHaveTextContent('Campanhas')
  await user.click(toggle)
  await user.tab()
  await user.tab()
  await user.tab()
  expect(screen.getByRole('link', { name: 'Mídia' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('link', { name: 'Base visual' })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByRole('main')).toHaveFocus()
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' })
  expect(screen.getByRole('navigation', { name: 'Localização' })).toHaveTextContent('Base visual')
  expect(screen.getByRole('heading', { name: 'Paleta e tokens' })).toBeVisible()
  expect(fetch).not.toHaveBeenCalled()
})

test('sidebar oferece apenas rotas existentes e identifica áreas do dashboard sem controles falsos', () => {
  render(<MemoryRouter><AppRoutes /></MemoryRouter>)
  const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
  expect(Array.from(nav.querySelectorAll('a')).map((link) => link.getAttribute('href'))).toEqual(['/', '/campanhas', '/midias', '/base-visual'])
  const areas = screen.getByRole('region', { name: 'NO DASHBOARD' })
  expect(areas).toHaveTextContent('Áreas de leitura operacional')
  expect(Array.from(areas.querySelectorAll('li')).map((item) => item.textContent)).toEqual(['Pipeline', 'Publicação'])
  expect(areas).toHaveTextContent('Relatórios Indisponível')
  expect(areas.querySelectorAll('a, button, [tabindex]').length).toBe(0)
  expect(screen.queryByText(/integração operacional pendente/i)).not.toBeInTheDocument()
  expect(screen.queryByText('Nenhuma conexão verificada.')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
})

test('abre diretamente /midias sem consultar APIs quando não configuradas', () => {
  render(<MemoryRouter initialEntries={['/midias']}><AppRoutes /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: 'Mídia', level: 1 })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Mídia' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByText(/API não configurada/)).toBeVisible()
  expect(fetch).not.toHaveBeenCalled()
})
