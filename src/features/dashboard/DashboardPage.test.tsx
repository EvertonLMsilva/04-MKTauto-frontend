import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, expect, test, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'

const config = vi.hoisted(() => ({ status: 'unconfigured' as 'unconfigured' | 'configured' | 'invalid', baseUrl: null as string | null }))
vi.mock('../../config/env', () => ({ apiConfig: config }))

beforeEach(() => {
  config.status = 'unconfigured'
  config.baseUrl = null
})

test('indicadores apresentam ausência de dados, sem zeros, percentuais ou resultados artificiais', () => {
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  const indicators = screen.getByRole('region', { name: 'Indicadores operacionais' })
  const labels = within(indicators).getAllByRole('term')
  expect(labels.map((label) => label.textContent)).toEqual(['Campanhas ativas', 'Mídias geradas', 'Publicações', 'Aprovação de qualidade'])
  const values = within(indicators).getAllByRole('definition')
  expect(values).toHaveLength(4)
  for (const value of values) {
    expect(value).toHaveTextContent('Indisponível')
    expect(value.textContent).not.toMatch(/[0-9%]/)
  }
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  expect(fetch).not.toHaveBeenCalled()
})

test('hero mantém título e navegação quando o asset local não existe', () => {
  const { container } = render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  fireEvent.error(container.querySelector('.hero-media-image')!)
  expect(screen.getByRole('heading', { name: /sua operação. uma nova dimensão/i })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Explorar a base visual' })).toHaveAttribute('href', '/base-visual')
  expect(screen.getByText('Nenhum dado operacional carregado')).toBeVisible()
  expect(container.querySelector('.hero-media')).toHaveClass('hero-media--static')
  expect(fetch).not.toHaveBeenCalled()
})

test('áreas operacionais explicam a integração pendente sem simular etapas ou consultas', () => {
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  const panels = [
    ['Pipeline de campanhas', 'Pipeline aguardando integração'],
    ['Fila de processamento', 'Fila ainda não consultada'],
    ['Processamentos em andamento', 'Processamentos indisponíveis'],
    ['Publicações recentes', 'Publicações ainda não consultadas'],
  ] as const
  for (const [name, message] of panels) {
    const panel = screen.getByRole('region', { name })
    expect(within(panel).getByText(message)).toBeVisible()
    expect(panel.querySelector('button, a, [role="progressbar"]')).toBeNull()
    expect(panel.textContent).not.toMatch(/\bP[1-6]\b|\bCAMP-\d|\d+%/)
  }
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(fetch).not.toHaveBeenCalled()
})

test.each([
  { status: 'unconfigured', title: 'Aguardando configuração', role: 'status' },
  { status: 'configured', title: 'Configuração preparada', role: 'status' },
  { status: 'invalid', title: 'Revise a configuração', role: 'alert' },
] as const)('configuração $status nunca comprova conexão ou dispara HTTP', ({ status, title, role }) => {
  config.status = status
  config.baseUrl = status === 'configured' ? 'http://api.example.test' : null
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  const integration = screen.getByRole('region', { name: 'Estado de integração' })
  expect(within(integration).getByRole('heading', { name: title })).toBeVisible()
  expect(within(integration).getByRole(role)).toHaveTextContent('Nenhum dado operacional carregado')
  expect(integration.textContent).not.toMatch(/\bonline\b|API conectada|conexão ativa/i)
  if (status === 'configured') expect(integration).toHaveTextContent('Nenhuma conexão ou consulta foi iniciada nesta etapa.')
  expect(fetch).not.toHaveBeenCalled()
})
