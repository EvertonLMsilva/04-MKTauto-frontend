import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { MediaPage } from './MediaPage'
import { detailFixture, mediaFixture, testOrigin } from './fixtures'

const config = { status: 'configured', baseUrl: testOrigin } as const
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
const nativeURL = URL
let intersection: IntersectionObserverCallback | null = null
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.stubGlobal('URL', class extends nativeURL {
    static createObjectURL = vi.fn(() => 'blob:synthetic-authorized-media')
    static revokeObjectURL = vi.fn()
  })
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { intersection = callback }
    observe = vi.fn()
    disconnect = vi.fn()
  })
  intersection = null
  vi.mocked(fetch).mockImplementation(async input => {
    const url = String(input)
    if (url.endsWith('/operations/executions')) return json([detailFixture().execution])
    if (url.endsWith('/operations/executions/execution_a')) return json(detailFixture())
    if (url.endsWith('/operations/executions/execution_b')) return json(detailFixture('execution_b', 'run_b', false))
    if (url.includes('/media/assets?')) return json(mediaFixture(new nativeURL(url).searchParams.get('pipelineRunId')!))
    if (url.includes('/narration.wav')) return new Response('synthetic-wav', { headers: { 'Content-Type': 'audio/wav' } })
    if (url.includes('/final.mp4')) return new Response('synthetic-mp4', { headers: { 'Content-Type': 'video/mp4' } })
    throw new Error('Unexpected URL')
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function mount() { return render(<MediaPage config={config} origin={testOrigin} />) }
async function lookup(id = 'execution_a') {
  const input = screen.getByRole('textbox', { name: 'Identificador da execução' })
  fireEvent.change(input, { target: { value: id } })
  fireEvent.submit(input.closest('form')!)
}
async function loaded() {
  await lookup()
  await screen.findByText('Agendada (SCHEDULED) / 4')
}

test('seleciona execução real da lista, mostra roteiro e metadados sem inventar aprovação', async () => {
  const user = userEvent.setup()
  mount()
  await user.selectOptions(await screen.findByRole('combobox', { name: 'Execuções recentes' }), 'execution_a')
  expect(await screen.findByText('Agendada (SCHEDULED) / 4')).toBeVisible()
  expect(screen.getByLabelText('Narração do roteiro')).toHaveTextContent('Conteúdo da narração.')
  expect(await screen.findByText('asset_a')).toBeVisible()
  expect(screen.getByText(/QC técnico e disponibilidade/)).toBeVisible()
  expect(screen.getByText(/Pendência: EXACT_HUMAN_APPROVAL_REQUIRED/)).toBeVisible()
  expect(screen.getByText(/não forneceu um vínculo autorizado/)).toBeVisible()
  expect(document.body.textContent).not.toMatch(/private-|untrusted/)
  expect(document.querySelector('audio, video')).toBeNull()
  expect(fetch).toHaveBeenCalledTimes(3)
})
test('ID inválido não dispara leitura e pode ser corrigido manualmente', async () => {
  mount(); await screen.findByRole('combobox')
  await lookup('../invalid')
  expect(screen.getByText('Informe um identificador de execução válido.')).toBeVisible()
  expect(fetch).toHaveBeenCalledTimes(1)
  await loaded()
  expect(screen.queryByText('Informe um identificador de execução válido.')).not.toBeInTheDocument()
})
test.each([
  [401, 'Sessão QC ausente ou expirada'], [403, 'Acesso negado pelo backend'],
  [404, 'Recurso não encontrado (404)'], [503, 'Serviço ou configuração indisponível'],
])('detalhe HTTP %s mantém o motivo correto', async (status, message) => {
  mount(); await screen.findByRole('combobox')
  vi.mocked(fetch).mockResolvedValue(json({ code: 'QC_SESSION_EXPIRED', secret: 'private-error' }, status as number))
  await lookup()
  expect(await screen.findByText(new RegExp(String(message).replace(/[()]/g, '\\$&')))).toBeVisible()
  expect(document.querySelector('audio, video')).toBeNull()
  expect(document.body.textContent).not.toContain('private-error')
})
test.each(['network', 'contract'])('detalhe diferencia erro %s sem apresentar dados da resposta', async kind => {
  mount(); await screen.findByRole('combobox')
  if (kind === 'network') vi.mocked(fetch).mockRejectedValue(new Error('network'))
  else vi.mocked(fetch).mockResolvedValue(json({ execution: detailFixture().execution, private: 'do not display' }))
  await lookup()
  expect(await screen.findByText(kind === 'network' ? /Falha de rede/ : /Resposta incompatível com o contrato/)).toBeVisible()
  expect(screen.queryByLabelText('Narração do roteiro')).not.toBeInTheDocument()
})
test('ausência de roteiro, áudio e MP4 não gera pedidos de arquivo ou contexto de revisão', async () => {
  mount(); await lookup('execution_b')
  expect(await screen.findByText('Roteiro ainda não disponível nesta execução.')).toBeVisible()
  expect(screen.getByText(/Narração ainda não disponível/)).toBeVisible()
  expect(screen.getByText(/MP4 final indisponível/)).toBeVisible()
  expect(screen.queryByRole('button', { name: /Carregar|Baixar/ })).not.toBeInTheDocument()
  expect(vi.mocked(fetch).mock.calls.every(([input, init]) => !String(input).includes('/file') && init?.method === 'GET')).toBe(true)
})
test('WAV e MP4 são carregados manualmente, com controles HTML5 e sem autoplay', async () => {
  const user = userEvent.setup(); mount(); await loaded()
  await user.click(screen.getByRole('button', { name: 'Carregar narração WAV' }))
  const audio = await screen.findByLabelText('Narração WAV', { selector: 'audio' })
  expect(audio).toHaveAttribute('controls')
  expect(audio).not.toHaveAttribute('autoplay')
  await user.click(screen.getByRole('button', { name: 'Carregar MP4 autorizado' }))
  const video = await screen.findByLabelText('MP4 final', { selector: 'video' })
  expect(video).toHaveAttribute('controls')
  expect(video).toHaveAttribute('playsinline')
  expect(video).not.toHaveAttribute('autoplay')
  expect(video.getAttribute('src')).toBe('blob:synthetic-authorized-media')
  expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('download=1'), expect.anything())
  expect(vi.mocked(fetch).mock.calls.every(([input, init]) => String(input).startsWith(testOrigin) && init?.method === 'GET')).toBe(true)
})
test.each([401, 403])('carregamento de arquivo HTTP %s é erro de autorização, não mídia ausente', async status => {
  const user = userEvent.setup(); mount(); await loaded(); await screen.findByText('asset_a')
  vi.mocked(fetch).mockResolvedValue(json({ code: 'AUTH_REQUIRED' }, status))
  await user.click(screen.getByRole('button', { name: 'Carregar MP4 autorizado' }))
  expect(await screen.findByText(status === 401 ? /Sessão QC ausente ou expirada/ : /Acesso negado pelo backend/)).toBeVisible()
  expect(document.querySelector('video')).toBeNull()
})
test('download só acontece no clique, via rota autorizada, com nome fixo e sem URL da resposta', async () => {
  const user = userEvent.setup(); mount(); await loaded()
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe('video-final.mp4')
    expect(this.href).toBe('blob:synthetic-authorized-media')
  })
  expect(click).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Baixar MP4 autorizado' }))
  await screen.findByText('Download solicitado ao navegador.')
  expect(click).toHaveBeenCalledTimes(1)
  expect(fetch).toHaveBeenCalledWith(`${testOrigin}/operations/executions/execution_a/final.mp4?download=1`, expect.objectContaining({ method: 'GET' }))
})
test('erro de download preserva 403 e não salva arquivo', async () => {
  const user = userEvent.setup(); mount(); await loaded(); await screen.findByText('asset_a')
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  vi.mocked(fetch).mockResolvedValue(json({}, 403))
  await user.click(screen.getByRole('button', { name: 'Baixar MP4 autorizado' }))
  expect(await screen.findByText(/Acesso negado pelo backend/)).toBeVisible()
  expect(click).not.toHaveBeenCalled()
})
test('falha de decodificação remove player, revoga URL e permite nova carga manual', async () => {
  const user = userEvent.setup(); mount(); await loaded()
  await user.click(screen.getByRole('button', { name: 'Carregar MP4 autorizado' }))
  fireEvent.error(await screen.findByLabelText('MP4 final', { selector: 'video' }))
  expect(screen.getByText(/Falha de reprodução/)).toBeVisible()
  expect(document.querySelector('video')).toBeNull()
  expect(URL.revokeObjectURL).toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Carregar MP4 autorizado' })).toBeEnabled()
})
test('pausa vídeo fora da área visível e ao ocultar a aba', async () => {
  const user = userEvent.setup(); mount(); await loaded()
  await user.click(screen.getByRole('button', { name: 'Carregar MP4 autorizado' }))
  const video = await screen.findByLabelText('MP4 final', { selector: 'video' })
  const bounds = video.getBoundingClientRect()
  act(() => intersection?.([{ target: video, isIntersecting: false, intersectionRatio: 0, boundingClientRect: bounds, intersectionRect: bounds, rootBounds: null, time: 0 }], {} as IntersectionObserver))
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1)
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  fireEvent(document, new Event('visibilitychange'))
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(2)
})
test('trocar execução pausa e remove player e conteúdo anteriores', async () => {
  const user = userEvent.setup(); mount(); await loaded()
  await user.click(screen.getByRole('button', { name: 'Carregar MP4 autorizado' }))
  await screen.findByLabelText('MP4 final', { selector: 'video' })
  await lookup('execution_b')
  expect(document.querySelector('video')).toBeNull()
  expect(screen.queryByLabelText('Narração do roteiro')).not.toBeInTheDocument()
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-authorized-media')
  await screen.findByText('Roteiro ainda não disponível nesta execução.')
})
test('resposta antiga de detalhe não substitui a execução selecionada', async () => {
  mount(); await screen.findByRole('combobox')
  const original = vi.mocked(fetch).getMockImplementation()!
  let resolve!: (response: Response) => void
  let oldSignal: AbortSignal | null | undefined
  vi.mocked(fetch).mockImplementation((input, init) => String(input).endsWith('/execution_a') ? new Promise<Response>(done => { resolve = done; oldSignal = init?.signal }) : original(input, init))
  await lookup('execution_a')
  await lookup('execution_b')
  await screen.findByText('Roteiro ainda não disponível nesta execução.')
  expect(oldSignal?.aborted).toBe(true)
  await act(async () => resolve(json(detailFixture())))
  expect(screen.queryByLabelText('Narração do roteiro')).not.toBeInTheDocument()
  expect(screen.getByText('execution_b')).toBeVisible()
})
test('cancelar carregamento de arquivo durante troca descarta o resultado obsoleto', async () => {
  const user = userEvent.setup(); mount(); await loaded(); await screen.findByText('asset_a')
  let resolve!: (response: Response) => void
  let oldSignal: AbortSignal | null | undefined
  const original = vi.mocked(fetch).getMockImplementation()!
  vi.mocked(fetch).mockImplementation((input, init) => String(input).endsWith('/final.mp4') ? new Promise<Response>(done => { resolve = done; oldSignal = init?.signal }) : original(input, init))
  await user.click(screen.getByRole('button', { name: 'Carregar MP4 autorizado' }))
  await lookup('execution_b'); await screen.findByText('Roteiro ainda não disponível nesta execução.')
  expect(oldSignal?.aborted).toBe(true)
  await act(async () => resolve(new Response('synthetic', { headers: { 'Content-Type': 'video/mp4' } })))
  expect(URL.createObjectURL).not.toHaveBeenCalled()
  expect(document.querySelector('video')).toBeNull()
})
test('mídias de outro run são rejeitadas, sem comprometer roteiro e estado da execução', async () => {
  mount(); await screen.findByRole('combobox')
  const original = vi.mocked(fetch).getMockImplementation()!
  vi.mocked(fetch).mockImplementation((input, init) => String(input).includes('/media/assets?') ? Promise.resolve(json(mediaFixture('run_other'))) : original(input, init))
  await loaded()
  expect(await screen.findByText(/Resposta incompatível com o contrato/)).toBeVisible()
  expect(screen.getByLabelText('Narração do roteiro')).toBeVisible()
  expect(screen.queryByText('asset_a')).not.toBeInTheDocument()
})
test('configuração externa não consulta nem oferece caminhos de arquivo', () => {
  render(<MediaPage config={{ status: 'configured', baseUrl: 'http://outside.invalid' }} origin={testOrigin} />)
  expect(screen.getByText(/Consulta bloqueada/)).toBeVisible()
  expect(screen.getByRole('button', { name: 'Consultar execução' })).toBeDisabled()
  expect(fetch).not.toHaveBeenCalled()
})
test('atualizar a consulta remove a mídia anterior e exige nova autorização GET', async () => {
  const user = userEvent.setup(); mount(); await loaded()
  await user.click(screen.getByRole('button', { name: 'Carregar MP4 autorizado' }))
  await screen.findByLabelText('MP4 final', { selector: 'video' })
  await user.click(screen.getByRole('button', { name: 'Consultar execução' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Carregar MP4 autorizado' })).toBeEnabled())
  expect(document.querySelector('video')).toBeNull()
  expect(URL.revokeObjectURL).toHaveBeenCalled()
})
