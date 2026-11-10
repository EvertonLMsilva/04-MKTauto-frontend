import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, expect, test, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import userEvent from '@testing-library/user-event'
import { dashboardScope, metricKeys } from './contracts/dashboardMetrics'

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
  expect(labels.map((label) => label.textContent)).toEqual(['Execuções em processamento', 'Campanhas ativas', 'Mídias geradas', 'Publicações reais · LIVE', 'Publicações simuladas · FAKE', 'Aprovação QC técnico V1'])
  const values = within(indicators).getAllByRole('definition')
  expect(values).toHaveLength(12)
  for (const value of values.filter((_, index) => index % 2 === 0)) {
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
  { status: 'configured', title: 'Integração indisponível', role: 'status' },
  { status: 'invalid', title: 'Integração indisponível', role: 'status' },
] as const)('configuração $status nunca comprova conexão ou dispara HTTP', ({ status, title, role }) => {
  config.status = status
  config.baseUrl = status === 'configured' ? 'http://api.example.test' : null
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  const integration = screen.getByRole('region', { name: 'Estado de integração' })
  expect(within(integration).getByRole('heading', { name: title })).toBeVisible()
  expect(within(integration).getByRole(role)).toBeVisible()
  expect(within(integration).getByText('Nenhum dado operacional carregado')).toBeVisible()
  expect(integration.textContent).not.toMatch(/\bonline\b|API conectada|conexão ativa/i)
  if (status === 'configured') expect(integration).toHaveTextContent('mesma origem local')
  expect(fetch).not.toHaveBeenCalled()
})

function summary() {
  return {
    schemaVersion: 'operations-dashboard-summary/1.0.0', generatedAt: '2026-11-10T12:00:00.000Z',
    scope: { ...dashboardScope, publicationMode: 'fake' },
    runningExecutions: 0, generatedMedia: null, activeCampaigns: null, completedPublications: null,
    socialPublicationsFake: 2, socialPublicationsLive: null, qcApproved: 1, qcEvaluated: 2, qcApprovalRate: 50,
    availability: Object.fromEntries(metricKeys.map(key => [key, {
      status: ['activeCampaigns', 'generatedMedia', 'completedPublications', 'socialPublicationsLive'].includes(key) ? 'UNAVAILABLE' : 'AVAILABLE',
      reason: ({ activeCampaigns: 'ACTIVE_CAMPAIGN_DEFINITION_REQUIRED', generatedMedia: 'MEDIA_MATERIALIZATION_NOT_PROVEN', completedPublications: 'COMBINED_PUBLICATIONS_UNDEFINED', socialPublicationsLive: 'PUBLICATION_MODE_NOT_IN_SOURCE' } as Record<string, string>)[key] ?? null,
    }])),
  }
}

function configure() { config.status='configured'; config.baseUrl=window.location.origin }
function row(label:string) { return screen.getByText(label).closest('.metric-placeholder')! as HTMLElement }

test('renders measured zeros, separate fake/live and the backend QC rate',async()=>{
  configure(); vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(summary())))
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  await screen.findByRole('heading',{name:'Resumo recebido'})
  expect(within(row('Execuções em processamento')).getByText('0')).toBeVisible()
  expect(within(row('Campanhas ativas')).getByText('Indisponível')).toBeVisible()
  expect(within(row('Mídias geradas')).getByText('Indisponível')).toBeVisible()
  expect(within(row('Publicações simuladas · FAKE')).getByText('2')).toBeVisible()
  expect(within(row('Publicações reais · LIVE')).getByText('Indisponível')).toBeVisible()
  expect(within(row('Aprovação QC técnico V1')).getByText('50%')).toBeVisible()
  expect(screen.getByText(/QC: quality-control-report/)).toBeVisible()
  expect(screen.getByRole('heading',{name:/sua operação. uma nova dimensão/i})).toBeVisible()
  expect(vi.mocked(fetch).mock.calls.every(([,options])=>options?.method==='GET')).toBe(true)
})
test('a missing QC denominator never renders 0 percent',async()=>{
  configure(); const value=summary();value.qcApproved=0;value.qcEvaluated=0
  Object.assign(value,{qcApprovalRate:null});value.availability.qcApprovalRate={status:'UNAVAILABLE',reason:'NO_QC_EVALUATIONS'}
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(value)))
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  await screen.findByRole('heading',{name:'Resumo recebido'})
  expect(within(row('Aprovação QC técnico V1')).queryByText(/%/)).not.toBeInTheDocument()
  expect(within(row('Aprovação QC técnico V1')).getByText(/Nenhuma avaliação técnica/)).toBeVisible()
})
test.each([401,403])('HTTP %i requests the existing session and performs no login mutation',async status=>{
  configure();vi.mocked(fetch).mockResolvedValue(new Response('{}',{status}))
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  await screen.findByRole('heading',{name:'Sessão não autorizada'})
  expect(screen.getByRole('link',{name:'Abrir console de autenticação existente'})).toHaveAttribute('href','/operations')
  expect(fetch).toHaveBeenCalledTimes(1)
})
test('loading disables retry; a subsequent retry replaces a network error',async()=>{
  configure();vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))
  const user=userEvent.setup()
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  await screen.findByRole('alert')
  let complete!:(response:Response)=>void
  vi.mocked(fetch).mockImplementationOnce(()=>new Promise(resolve=>{complete=resolve}))
  await user.click(screen.getByRole('button',{name:'Tentar novamente'}))
  await waitFor(()=>expect(screen.getByRole('button',{name:/Tentar novamente/})).toBeDisabled())
  complete(new Response(JSON.stringify(summary())))
  await screen.findByRole('heading',{name:'Resumo recebido'})
  expect(screen.getByRole('button',{name:'Atualizar resumo'})).toBeEnabled()
})
