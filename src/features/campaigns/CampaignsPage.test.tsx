import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { expect, test, vi } from 'vitest'
import { CampaignsPage } from './CampaignsPage'
import { campaignFixture, executionFixture } from './test/fixtures'

const config = { status: 'configured' as const, baseUrl: 'http://localhost:5187' }
function mount() { return render(<MemoryRouter><CampaignsPage config={config} origin={config.baseUrl} /></MemoryRouter>) }
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(yes => { resolve = yes })
  return { promise, resolve }
}
async function lookup(id = 'campaign_test', revision = '1') {
  const user = userEvent.setup()
  await user.clear(screen.getByLabelText('Identificador da campanha'))
  await user.type(screen.getByLabelText('Identificador da campanha'), id)
  await user.clear(screen.getByLabelText('Revisão', { exact: true }))
  await user.type(screen.getByLabelText('Revisão', { exact: true }), revision)
  await user.click(screen.getByRole('button', { name: 'Consultar revisão' }))
}
test('unconfigured page never fetches or fabricates campaigns, creation or execution controls', () => {
  render(<MemoryRouter><CampaignsPage config={{ status: 'unconfigured', baseUrl: null }} /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: 'Campanhas', level: 1 })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Consultar revisão' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: /criar|iniciar|publicar/i })).not.toBeInTheDocument()
  expect(screen.getByText(/não representa o catálogo completo/)).toBeVisible()
  expect(fetch).not.toHaveBeenCalled()
})
test('groups actual executions by campaign AND revision, preserves individual states and filters only loaded rows', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json([
    executionFixture, { ...executionFixture, execution_id: 'execution_second', status: 'FAILED' },
    { ...executionFixture, execution_id: 'execution_revision', campaign_revision: 2, status: 'SUCCEEDED' },
  ]))
  mount()
  const list = await screen.findByRole('list', { name: 'Campanhas com execuções recentes' })
  expect(within(list).getAllByRole('button', { name: /Consultar campaign_test/ })).toHaveLength(2)
  expect(within(list).getByText('Falhou')).toBeVisible()
  expect(within(list).getByText('Em execução')).toBeVisible()
  expect(within(list).getByText('Concluída')).toBeVisible()
  expect(screen.getByText(/2 de 2 revisões.*3 execuções/)).toBeVisible()
  await userEvent.type(screen.getByRole('searchbox'), 'absent')
  expect(screen.getByText(/Nenhum identificador corresponde/)).toBeVisible()
  expect(fetch).toHaveBeenCalledTimes(1)
})
test('empty sample is not presented as an empty campaign catalog', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json([]))
  mount()
  expect(await screen.findByText(/Isso não comprova ausência de campanhas/)).toBeVisible()
})
test('the bounded sample discloses the limit without claiming a global total', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json(Array.from({ length: 100 }, (_, index) => ({ ...executionFixture, execution_id: `execution_test_${index}` }))))
  mount()
  expect(await screen.findByText(/Limite de 100 execuções atingido/)).toBeVisible()
  expect(screen.getByText(/1 de 1 revisões.*100 execuções/)).toBeVisible()
})
test('does not offer revision lookup for legacy execution identities outside the affiliate identifier contract', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json([{ ...executionFixture, campaign_id: 'campaign:legacy' }]))
  mount()
  expect(await screen.findByText(/Identificador desta execução incompatível/)).toBeVisible()
  expect(screen.queryByRole('button', { name: /Consultar campaign:legacy/ })).not.toBeInTheDocument()
  expect(fetch).toHaveBeenCalledTimes(1)
})
test.each([401, 403])('requires the existing console session after HTTP %i, with manual retry and no login or token invention', async status => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({ code: 'QC_SESSION_EXPIRED' }, { status })).mockResolvedValueOnce(Response.json([executionFixture]))
  mount()
  expect(await screen.findByText(/Sessão não autorizada/)).toBeVisible()
  expect(screen.getByRole('link', { name: 'Abrir console QC' })).toHaveAttribute('href', '/operations')
  expect(fetch).toHaveBeenCalledTimes(1)
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByRole('list', { name: 'Campanhas com execuções recentes' })).toBeVisible()
  expect(fetch).toHaveBeenCalledTimes(2)
})
test.each([{}, [{ ...executionFixture, status: 'MADE_UP' }]])('rejects an incompatible activity contract', async value => {
  vi.mocked(fetch).mockResolvedValue(Response.json(value))
  mount()
  expect(await screen.findByRole('alert')).toHaveTextContent('Contrato incompatível')
  expect(screen.queryByText(/Nenhuma execução retornada/)).not.toBeInTheDocument()
})
test('network failures do not become empty samples and are retried only manually', async () => {
  vi.mocked(fetch).mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(Response.json([]))
  mount()
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar')
  expect(fetch).toHaveBeenCalledTimes(1)
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByText(/Nenhuma execução retornada/)).toBeVisible()
})
test('HTTP failure does not assert an empty database', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ code: 'UNAVAILABLE' }, { status: 503 }))
  mount()
  expect(await screen.findByRole('alert')).toHaveTextContent('O backend não disponibilizou')
  expect(screen.queryByText(/Nenhuma execução retornada/)).not.toBeInTheDocument()
})
test('loading has no invented data, and unmount cancels the request', async () => {
  const pending = deferred<Response>()
  vi.mocked(fetch).mockReturnValue(pending.promise)
  const view = mount()
  expect(await screen.findByText('Consultando o backend…')).toBeVisible()
  const signal = vi.mocked(fetch).mock.calls[0]?.[1]?.signal
  expect(signal?.aborted).toBe(false)
  view.unmount()
  expect(signal?.aborted).toBe(true)
  await act(async () => pending.resolve(Response.json([executionFixture])))
})
test('lookup validates required fields and format before making a request', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json([]))
  mount()
  await screen.findByText(/Nenhuma execução retornada/)
  await userEvent.click(screen.getByRole('button', { name: 'Consultar revisão' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Informe um identificador válido')
  expect(screen.getByLabelText('Identificador da campanha')).toHaveFocus()
  await lookup('campaign_test', '0')
  expect(screen.getByLabelText('Revisão', { exact: true })).toHaveFocus()
  expect(fetch).toHaveBeenCalledTimes(1)
})
test('known revision lookup works outside the activity sample and displays only real document fields', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json([])).mockResolvedValueOnce(Response.json(campaignFixture))
  mount()
  await lookup()
  const detail = await screen.findByRole('article', { name: 'Revisão consultada' })
  expect(detail).toHaveTextContent(campaignFixture.projectId)
  expect(detail).toHaveTextContent(campaignFixture.disclosure)
  expect(detail).toHaveTextContent(campaignFixture.affiliateUrl)
  expect(detail).toHaveTextContent('não informa nome, datas ou estado operacional')
  expect(screen.getByRole('link', { name: 'Consultar resultados no Dashboard' })).toHaveAttribute('href', '/')
})
test.each([404, 401, 403, 500])('preserves revision lookup HTTP %i without fabricating details', async status => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json([])).mockResolvedValueOnce(Response.json({}, { status }))
  mount()
  await lookup()
  await screen.findByText(status === 404 ? /Esta revisão de campanha não foi encontrada/ : status === 401 || status === 403 ? /Sessão não autorizada/ : /O backend não disponibilizou/)
  expect(screen.queryByRole('article', { name: 'Revisão consultada' })).not.toBeInTheDocument()
})
test('rejects revision mismatch, including an otherwise valid document', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json([])).mockResolvedValueOnce(Response.json({ ...campaignFixture, revision: 2 }))
  mount()
  await lookup()
  expect(await screen.findByRole('alert')).toHaveTextContent('Contrato incompatível')
})
test('selecting a recent revision consults its exact identity using GET only', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json([executionFixture])).mockResolvedValueOnce(Response.json(campaignFixture))
  mount()
  const button = await screen.findByRole('button', { name: 'Consultar campaign_test, revisão 1' })
  button.focus()
  await userEvent.keyboard('{Enter}')
  expect(await screen.findByRole('article', { name: 'Revisão consultada' })).toBeVisible()
  expect(fetch).toHaveBeenCalledTimes(2)
  for (const [, options] of vi.mocked(fetch).mock.calls) {
    expect(options?.method).toBe('GET')
    expect(options?.body).toBeUndefined()
  }
  expect(screen.queryByRole('button', { name: /aprovar|agendar|publicar|iniciar|criar/i })).not.toBeInTheDocument()
})
test('does not resend a revision while the lookup is pending', async () => {
  const pending = deferred<Response>()
  vi.mocked(fetch).mockResolvedValueOnce(Response.json([])).mockReturnValueOnce(pending.promise)
  mount()
  await lookup()
  const button = screen.getByRole('button', { name: /Consultar revisão/ })
  expect(button).toBeDisabled()
  await userEvent.dblClick(button)
  expect(fetch).toHaveBeenCalledTimes(2)
  await act(async () => pending.resolve(Response.json(campaignFixture)))
})
test('cancels an obsolete selection and ignores a late response even when the transport ignores abort', async () => {
  const older = deferred<Response>()
  const newer = { ...campaignFixture, campaignId: 'campaign_other' }
  vi.mocked(fetch).mockResolvedValueOnce(Response.json([
    executionFixture, { ...executionFixture, execution_id: 'execution_other', campaign_id: 'campaign_other' },
  ])).mockReturnValueOnce(older.promise).mockResolvedValueOnce(Response.json(newer))
  mount()
  await userEvent.click(await screen.findByRole('button', { name: 'Consultar campaign_test, revisão 1' }))
  const signal = vi.mocked(fetch).mock.calls[1]?.[1]?.signal
  await userEvent.click(screen.getByRole('button', { name: 'Consultar campaign_other, revisão 1' }))
  const detail = await screen.findByRole('article', { name: 'Revisão consultada' })
  expect(detail).toHaveTextContent('campaign_other')
  expect(signal?.aborted).toBe(true)
  await act(async () => older.resolve(Response.json(campaignFixture)))
  expect(screen.getByRole('article', { name: 'Revisão consultada' })).toHaveTextContent('campaign_other')
})
test('manual refresh removes stale data when the session has expired', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json([executionFixture])).mockResolvedValueOnce(Response.json({}, { status: 401 }))
  mount()
  await screen.findByRole('list', { name: 'Campanhas com execuções recentes' })
  await userEvent.click(screen.getByRole('button', { name: 'Atualizar consulta' }))
  await screen.findByText(/Sessão não autorizada/)
  expect(screen.queryByRole('list', { name: 'Campanhas com execuções recentes' })).not.toBeInTheDocument()
})
test('changing to an incompatible origin immediately hides old data and aborts reads', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json([executionFixture]))
  const view = mount()
  await screen.findByRole('list', { name: 'Campanhas com execuções recentes' })
  view.rerender(<MemoryRouter><CampaignsPage config={config} origin="http://localhost:9999" /></MemoryRouter>)
  expect(screen.queryByRole('list', { name: 'Campanhas com execuções recentes' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Consultar revisão' })).toBeDisabled()
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
})
