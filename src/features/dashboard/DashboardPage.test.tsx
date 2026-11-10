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

test('áreas operacionais explicam a ausência de consultas sem simular etapas ou dados', () => {
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  const panels = [
    ['Pipeline de campanhas', 'Estados ainda não consultados.'],
    ['Fila e execuções', 'Nenhuma amostra de execuções disponível para exibição.'],
    ['Acompanhamento de processamentos', 'Configure a origem local da API para consultar as execuções.'],
    ['Mídias vinculadas', 'Consulta indisponível. É necessária uma API na mesma origem HTTP local com sessão QC.'],
    ['Publicações da execução', 'Consulta indisponível. É necessária uma API na mesma origem HTTP local com sessão QC.'],
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
function respondMetrics(response: () => Response | Promise<Response>, executions: unknown[] = []) {
  vi.mocked(fetch).mockImplementation(input => String(input).endsWith('/operations/executions')
    ? Promise.resolve(new Response(JSON.stringify(executions))) : Promise.resolve().then(response))
}

test('renders measured zeros, separate fake/live and the backend QC rate',async()=>{
  configure(); respondMetrics(() => new Response(JSON.stringify(summary())))
  const user=userEvent.setup()
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  await screen.findByRole('heading',{name:'Resumo recebido'})
  expect(within(row('Execuções em processamento')).getByText('0')).toBeVisible()
  expect(within(row('Campanhas ativas')).getByText('Indisponível')).toBeVisible()
  expect(within(row('Mídias geradas')).getByText('Indisponível')).toBeVisible()
  expect(within(row('Publicações simuladas · FAKE')).getByText('2')).toBeVisible()
  expect(within(row('Publicações reais · LIVE')).getByText('Indisponível')).toBeVisible()
  expect(within(row('Aprovação QC técnico V1')).getByText('50%')).toBeVisible()
  expect(screen.getByText(/QC: quality-control-report/)).not.toBeVisible()
  await user.click(screen.getByText('Escopo e critérios dos indicadores'))
  expect(screen.getByText(/QC: quality-control-report/)).toBeVisible()
  expect(screen.getByText(/Total combinado de publicações: indisponível/)).toBeVisible()
  expect(screen.getByRole('heading',{name:/sua operação. uma nova dimensão/i})).toBeVisible()
  expect(vi.mocked(fetch).mock.calls.every(([,options])=>options?.method==='GET')).toBe(true)
})
test('a missing QC denominator never renders 0 percent',async()=>{
  configure(); const value=summary();value.qcApproved=0;value.qcEvaluated=0
  Object.assign(value,{qcApprovalRate:null});value.availability.qcApprovalRate={status:'UNAVAILABLE',reason:'NO_QC_EVALUATIONS'}
  respondMetrics(() => new Response(JSON.stringify(value)))
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  await screen.findByRole('heading',{name:'Resumo recebido'})
  expect(within(row('Aprovação QC técnico V1')).queryByText(/%/)).not.toBeInTheDocument()
  expect(within(row('Aprovação QC técnico V1')).getByText(/Nenhuma avaliação técnica/)).toBeVisible()
})
test.each([401,403])('HTTP %i requests the existing session and performs no login mutation',async status=>{
  configure();respondMetrics(() => new Response('{}',{status}))
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  await screen.findByRole('heading',{name:'Sessão não autorizada'})
  expect(screen.getByRole('link',{name:'Abrir console de autenticação existente'})).toHaveAttribute('href','/operations')
  expect(fetch).toHaveBeenCalledTimes(2)
})
test('expired-session guidance precedes the hero and keeps its existing console destination', async () => {
  configure(); respondMetrics(() => new Response('{}', { status: 401 }))
  const { container } = render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  await screen.findByRole('heading', { name: 'Sessão não autorizada' })
  const integration = screen.getByRole('region', { name: 'Estado de integração' })
  const hero = container.querySelector('.cockpit-hero')!
  expect(integration.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(within(integration).getByRole('alert')).toHaveTextContent('Sessão')
  expect(within(integration).getByRole('link')).toHaveAttribute('href', '/operations')
  expect(fetch).toHaveBeenCalledTimes(2)
})

test('loading disables retry; a subsequent retry replaces a network error',async()=>{
  configure();respondMetrics(() => Promise.reject(new Error('offline')))
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

test('execuções e filtros da amostra preservam indicadores globais, hero e GETs independentes', async () => {
  configure()
  const value = { ...summary(), runningExecutions: 157 }
  respondMetrics(() => new Response(JSON.stringify(value)), [
    { execution_id: 'execution_running', campaign_id: 'campaign_001', campaign_revision: 1, run_id: 'run_001', version: 1, status: 'RUNNING' },
    { execution_id: 'execution_scheduled', campaign_id: 'campaign_001', campaign_revision: 1, run_id: 'run_002', version: 1, status: 'SCHEDULED' },
  ])
  const user = userEvent.setup()
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  await screen.findByRole('article', { name: 'Execução execution_running' })
  expect(within(row('Execuções em processamento')).getByText('157')).toBeVisible()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar estados da amostra' }), 'SCHEDULED')
  expect(screen.queryByRole('article', { name: 'Execução execution_running' })).not.toBeInTheDocument()
  expect(screen.getByRole('article', { name: 'Execução execution_scheduled' })).toBeVisible()
  expect(screen.getByRole('heading', { name: /sua operação. uma nova dimensão/i })).toBeVisible()
  expect(fetch).toHaveBeenCalledTimes(2)
  await user.click(screen.getByRole('button', { name: 'Atualizar execuções' }))
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3))
  expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith('/dashboard/summary'))).toHaveLength(1)
  expect(vi.mocked(fetch).mock.calls.every(([, options]) => options?.method === 'GET')).toBe(true)
})

test('uma falha de sessão nas execuções não invalida os indicadores recebidos', async () => {
  configure()
  vi.mocked(fetch).mockImplementation(input => Promise.resolve(String(input).endsWith('/operations/executions') ? new Response('{}', { status: 403 }) : new Response(JSON.stringify(summary()))))
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  await screen.findByRole('heading', { name: 'Resumo recebido' })
  const queue = screen.getByRole('region', { name: 'Fila e execuções' })
  expect(within(queue).getByRole('alert')).toHaveTextContent('Sessão não autorizada')
  expect(within(queue).getByRole('link')).toHaveAttribute('href', '/operations')
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
  expect(within(row('Publicações simuladas · FAKE')).getByText('2')).toBeVisible()
})

test('seleção consulta apenas o run e os destinos correspondentes sem duplicar execuções ou alterar indicadores', async () => {
  configure()
  const executions = ['RUNNING', 'SUCCEEDED'].map((status, index) => ({ execution_id: `execution_${index}`, campaign_id: 'campaign_001', campaign_revision: 1, run_id: `run_${index}`, version: 1, status }))
  const urls: string[] = []
  vi.mocked(fetch).mockImplementation(input => {
    const url = String(input); urls.push(url)
    return Promise.resolve(new Response(JSON.stringify(url.endsWith('/operations/executions') ? executions : url.endsWith('/dashboard/summary') ? { ...summary(), runningExecutions: 157 } : [])))
  })
  const user = userEvent.setup()
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  await screen.findByRole('article', { name: 'Processamento execution_0' })
  expect(fetch).toHaveBeenCalledTimes(2)
  const select = screen.getByRole('combobox', { name: 'Execução para consultar mídias e publicações' })
  await user.selectOptions(select, 'execution_1')
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(4))
  expect(urls).toContain(`${window.location.origin}/media/assets?pipelineRunId=run_1`)
  expect(urls).toContain(`${window.location.origin}/publishing/executions/execution_1/destinations`)
  await waitFor(() => expect(within(screen.getByRole('region', { name: 'Mídias vinculadas' })).getByText('Nenhum registro retornado neste escopo.')).toBeVisible())
  expect(within(row('Execuções em processamento')).getByText('157')).toBeVisible()
  expect(urls.filter(url => url.endsWith('/operations/executions'))).toHaveLength(1)
  await user.selectOptions(select, '')
  expect(within(screen.getByRole('region', { name: 'Mídias vinculadas' })).getByText('Selecione uma execução para consultar mídias.')).toBeVisible()
  expect(fetch).toHaveBeenCalledTimes(4)
  expect(vi.mocked(fetch).mock.calls.every(([, options]) => options?.method === 'GET')).toBe(true)
})
