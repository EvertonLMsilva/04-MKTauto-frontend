import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { expect, test, vi } from 'vitest'
import { CampaignCommandCenter } from './CampaignCommandCenter'
import { campaignFixture } from '../test/fixtures'
import { controlledExecutionFixture, evidenceFixture, executionIdFixture, registrationFixture, sessionFixture } from '../test/fakeCommandFixtures'

const config = { status: 'configured' as const, baseUrl: 'http://localhost:5187' }
const posts = () => vi.mocked(fetch).mock.calls.filter(([, options]) => options?.method === 'POST')
function mount() { const onSelect = vi.fn(); render(<MemoryRouter><CampaignCommandCenter config={config} origin={config.baseUrl} onSelect={onSelect} /></MemoryRouter>); return onSelect }
function mockApi(post: (path: string, body: Record<string, unknown>) => Response | Promise<Response> = () => Response.json(registrationFixture), readVersion = 3) {
  vi.mocked(fetch).mockImplementation(async (url, options) => {
    const path = new URL(String(url)).pathname
    if (options?.method === 'POST') return post(path, JSON.parse(String(options.body)) as Record<string, unknown>)
    if (path === '/operations/session') return Response.json(sessionFixture)
    if (path.startsWith('/affiliate/')) return Response.json(campaignFixture)
    return Response.json({ ...controlledExecutionFixture(), execution: { ...controlledExecutionFixture().execution, version: readVersion } })
  })
}
async function session() { await userEvent.click(screen.getByRole('button', { name: 'Verificar sessão QC' })); await screen.findByText(/Sessão QC verificada:/) }
async function fillRegistration() {
  await userEvent.click(screen.getByText('Cadastrar campanha', { exact: true }))
  for (const [label, value] of Object.entries({ 'ID da campanha para cadastro': campaignFixture.campaignId, 'Revisão para cadastro': '1', 'ID do projeto existente': campaignFixture.projectId, 'ID do produto existente': campaignFixture.productId, 'Revisão do produto': '2', 'Link de afiliado HTTPS': campaignFixture.affiliateUrl, CTA: campaignFixture.cta, 'Identificação publicitária': campaignFixture.disclosure })) fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } })
}
async function fillExecution() {
  await userEvent.click(screen.getByText('Preparar execução FAKE', { selector: 'summary' }))
  for (const [label, value] of Object.entries({ 'ID da campanha para execução': campaignFixture.campaignId, 'Revisão da campanha para execução': '1', 'Versão do projeto': '1', 'Referência da imagem local autorizada': 'media_test', 'SHA-256 da imagem': 'a'.repeat(64), 'Origem da imagem': 'OPERATOR_OWNED', 'Base documental de uso': 'OWNED', 'Evidências oficiais de direitos (JSON)': JSON.stringify(evidenceFixture) })) fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } })
}
test('keeps commands disabled until the operator explicitly verifies the real console session', async () => {
  mockApi(); mount()
  await userEvent.click(screen.getByText('Cadastrar campanha', { exact: true }))
  expect(screen.getByRole('button', { name: 'Cadastrar revisão FAKE' })).toBeDisabled()
  expect(fetch).not.toHaveBeenCalled()
  await session()
  expect(screen.getByRole('button', { name: 'Cadastrar revisão FAKE' })).toBeEnabled()
  expect(document.body).not.toHaveTextContent(sessionFixture.csrfToken)
  expect(screen.queryByRole('button', { name: /publicar|agendar|aprovar/i })).not.toBeInTheDocument()
})
test('validates registration fields and explicit confirmation with focused error and no POST', async () => {
  mockApi(); mount(); await session(); await fillRegistration()
  await userEvent.click(screen.getByRole('button', { name: 'Cadastrar revisão FAKE' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Confira os campos')
  expect(screen.getByLabelText('Confirmo o cadastro desta revisão com os dados acima.')).toHaveFocus()
  expect(posts()).toHaveLength(0)
  fireEvent.change(screen.getByLabelText('ID da campanha para cadastro'), { target: { value: 'invalid@id' } })
  await userEvent.click(screen.getByRole('button', { name: 'Cadastrar revisão FAKE' }))
  expect(screen.getByLabelText('ID da campanha para cadastro')).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByLabelText('ID da campanha para cadastro')).toHaveFocus()
})
test('keeps the registration key stable across rerenders and duplicate clicks; looks up the registered revision', async () => {
  let resolve!: (r: Response) => void
  mockApi(() => new Promise(yes => { resolve = yes }))
  const onSelect = mount(); await session(); await fillRegistration()
  await userEvent.click(screen.getByLabelText('Confirmo o cadastro desta revisão com os dados acima.'))
  await userEvent.dblClick(screen.getByRole('button', { name: 'Cadastrar revisão FAKE' }))
  await waitFor(() => expect(posts()).toHaveLength(1))
  const body = JSON.parse(String(posts()[0]?.[1]?.body)) as { idempotencyKey: string }
  expect(body.idempotencyKey).toMatch(/^fc_reg_[a-f0-9]{32}$/)
  expect(screen.getByText(body.idempotencyKey)).toBeInTheDocument()
  await act(async () => resolve(Response.json(registrationFixture)))
  await screen.findByText(/CAMPAIGN_REGISTERED:/)
  expect(posts()).toHaveLength(1)
  await userEvent.click(screen.getByRole('button', { name: 'Consultar revisão cadastrada' }))
  expect(onSelect).toHaveBeenCalledWith({ id: campaignFixture.campaignId, revision: 1 })
})
test('blocks an ambiguous registration and reconciles by GET without a new key or another POST', async () => {
  mockApi(() => Promise.reject(new TypeError('timeout'))); mount(); await session(); await fillRegistration()
  await userEvent.click(screen.getByLabelText('Confirmo o cadastro desta revisão com os dados acima.'))
  await userEvent.click(screen.getByRole('button', { name: 'Cadastrar revisão FAKE' }))
  await screen.findByText(/Comandos suspensos/)
  expect(screen.getByRole('button', { name: 'Cadastrar revisão FAKE' })).toBeDisabled()
  const key = JSON.parse(String(posts()[0]?.[1]?.body)).idempotencyKey as string
  await userEvent.click(screen.getByRole('button', { name: 'Verificar revisão antes de outra ação' }))
  await screen.findByText(/Revisão confirmada por consulta/)
  expect(screen.getByText(key)).toBeVisible(); expect(posts()).toHaveLength(1)
})
test('requires actual media evidence and independent documentary/command confirmations', async () => {
  mockApi(); mount(); await session(); await fillExecution()
  expect(screen.getByLabelText(/Conferi a documentação real/)).not.toBeChecked()
  await userEvent.click(screen.getByRole('button', { name: 'Preparar execução FAKE' }))
  expect(screen.getByRole('alert')).toHaveTextContent('direitos')
  expect(posts()).toHaveLength(0)
  fireEvent.change(screen.getByLabelText('Evidências oficiais de direitos (JSON)'), { target: { value: '[]' } })
  await userEvent.click(screen.getByLabelText(/Conferi a documentação real/))
  await userEvent.click(screen.getByLabelText(/Confirmo esta preparação FAKE/))
  await userEvent.click(screen.getByRole('button', { name: 'Preparar execução FAKE' }))
  expect(screen.getByLabelText('Evidências oficiais de direitos (JSON)')).toHaveAttribute('aria-invalid', 'true')
  expect(posts()).toHaveLength(0)
})
test('shows accepted execution and validated policy, without claiming completion or offering social publication', async () => {
  mockApi((_path, body) => {
    const request = body.request as { requestId: string; requestedAt: string }
    const fixture = controlledExecutionFixture('EXECUTION_ACCEPTED')
    return Response.json({ ...fixture, execution: { ...fixture.execution, status: 'SCHEDULED', scheduledAt: request.requestedAt }, policy: { ...fixture.policy, commandId: request.requestId, scheduledAt: request.requestedAt } })
  })
  mount(); await session(); await fillExecution()
  await userEvent.click(screen.getByLabelText(/Conferi a documentação real/)); await userEvent.click(screen.getByLabelText(/Confirmo esta preparação FAKE/))
  await userEvent.dblClick(screen.getByRole('button', { name: 'Preparar execução FAKE' }))
  const article = await screen.findByRole('article', { name: 'Execução FAKE controlada' })
  expect(article).toHaveTextContent(executionIdFixture); expect(article).toHaveTextContent('DISABLED'); expect(article).toHaveTextContent('LOCAL_ONLY')
  expect(article).toHaveTextContent('conclusão ainda não confirmada'); expect(article).not.toHaveTextContent('PUBLISHED')
  expect(posts()).toHaveLength(1)
  expect(screen.queryByRole('button', { name: /publicar|agendar|LIVE/i })).not.toBeInTheDocument()
})
test.each(['conflict', 'timeout'])('reads state manually and refreshes after resume %s without retrying POST', async failure => {
  mockApi(() => failure === 'conflict' ? Response.json({ code: 'EXECUTION_VERSION_CONFLICT' }, { status: 409 }) : Promise.reject(new TypeError('timeout')), 4)
  mount(); await session()
  await userEvent.type(screen.getByLabelText('Execution ID controlado'), executionIdFixture)
  await userEvent.click(screen.getByRole('button', { name: 'Consultar estado controlado' }))
  await screen.findByRole('article', { name: 'Execução FAKE controlada' })
  expect(screen.getByRole('button', { name: 'Retomar execução FAKE' })).toBeDisabled()
  await userEvent.click(screen.getByLabelText('Confirmo a retomada desta execução na versão 4.'))
  await userEvent.click(screen.getByRole('button', { name: 'Retomar execução FAKE' }))
  await screen.findByText(/nenhum POST será repetido/)
  expect(JSON.parse(String(posts()[0]?.[1]?.body))).toEqual({ mode: 'FAKE', confirmation: true, expectedVersion: 4 })
  expect(posts()).toHaveLength(1)
  expect(screen.getByLabelText('Confirmo a retomada desta execução na versão 4.')).not.toBeChecked()
  expect(screen.getByRole('button', { name: 'Retomar execução FAKE' })).toBeDisabled()
  expect(vi.mocked(fetch).mock.calls.filter(([url, options]) => String(url).endsWith(`/executions/${executionIdFixture}`) && options?.method === 'GET')).toHaveLength(2)
})
test('an ambiguous preparation keeps its requestId and blocks another command when the queried policy belongs to another intent', async () => {
  mockApi(() => Promise.reject(new TypeError('timeout')))
  mount(); await session(); await fillExecution()
  await userEvent.click(screen.getByLabelText(/Conferi a documentação real/)); await userEvent.click(screen.getByLabelText(/Confirmo esta preparação FAKE/))
  await userEvent.click(screen.getByRole('button', { name: 'Preparar execução FAKE' }))
  await screen.findByText(/Comandos suspensos/)
  const requestId = JSON.parse(String(posts()[0]?.[1]?.body)).request.requestId as string
  expect(screen.getByText(requestId)).toBeVisible()
  await userEvent.type(screen.getByLabelText('Execution ID controlado'), executionIdFixture)
  await userEvent.click(screen.getByRole('button', { name: 'Consultar estado controlado' }))
  await screen.findByRole('article', { name: 'Execução FAKE controlada' })
  await userEvent.click(screen.getByRole('button', { name: 'Conciliar com a execução consultada' }))
  await screen.findByText(/não corresponde à intenção enviada/)
  expect(screen.getByRole('button', { name: 'Preparar execução FAKE' })).toBeDisabled()
  expect(screen.getByText(requestId)).toBeVisible(); expect(posts()).toHaveLength(1)
})
