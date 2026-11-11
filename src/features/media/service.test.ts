import { expect, test, vi } from 'vitest'
import { ApiError } from '../../services/http/client'
import { loadExecutionContent, loadMediaFile, mediaErrorMessage } from './service'
import { detailFixture, testOrigin } from './fixtures'

const config = { status: 'configured', baseUrl: testOrigin } as const
test('detalhe usa GET autenticado, sem cache, sem redirects e valida a identidade', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(detailFixture())))
  const signal = new AbortController().signal
  await expect(loadExecutionContent(config, testOrigin, 'execution_a', signal)).resolves.toHaveProperty('script.scriptId', 'script_a')
  expect(fetch).toHaveBeenCalledWith(`${testOrigin}/operations/executions/execution_a`, expect.objectContaining({ method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'error', signal }))
})
test.each([
  [{ status: 'configured', baseUrl: 'http://outside.invalid' }, testOrigin, 'execution_a'],
  [config, testOrigin, '../invalid'],
  [{ status: 'configured', baseUrl: `${testOrigin}/prefix` }, testOrigin, 'execution_a'],
  [{ status: 'unconfigured', baseUrl: null }, testOrigin, 'execution_a'],
] as const)('não emite leitura para configuração ou identificador inválidos (%#)', async (input, origin, id) => {
  await expect(loadExecutionContent(input, origin, id, new AbortController().signal)).rejects.toThrow()
  await expect(loadMediaFile(input, origin, id, 'video', new AbortController().signal)).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})
test.each([['audio', 'audio/wav', 'narration.wav'], ['video', 'video/mp4', 'final.mp4']] as const)('carrega %s exclusivamente pela rota oficial com MIME confirmado', async (kind, mime, file) => {
  vi.mocked(fetch).mockResolvedValue(new Response('synthetic-media-bytes', { headers: { 'Content-Type': mime } }))
  const blob = await loadMediaFile(config, testOrigin, 'execution_a', kind, new AbortController().signal)
  expect(blob.type).toBe(mime)
  expect(fetch).toHaveBeenCalledWith(`${testOrigin}/operations/executions/execution_a/${file}`, expect.objectContaining({ method: 'GET', credentials: 'include', redirect: 'error', cache: 'no-store' }))
})
test('download usa download=1 somente no pedido explícito de MP4', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('synthetic', { headers: { 'Content-Type': 'video/mp4' } }))
  await loadMediaFile(config, testOrigin, 'execution_a', 'video', new AbortController().signal, true)
  expect(fetch).toHaveBeenCalledWith(`${testOrigin}/operations/executions/execution_a/final.mp4?download=1`, expect.anything())
})
test.each([401, 403, 404, 409, 400, 503])('preserva HTTP %s, sem transformá-lo em ausência de mídia', async status => {
  vi.mocked(fetch).mockResolvedValue(new Response('not JSON', { status }))
  try {
    await loadMediaFile(config, testOrigin, 'execution_a', 'video', new AbortController().signal)
    expect.fail('HTTP error expected')
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status, kind: 'http' })
    expect(mediaErrorMessage(error)).not.toMatch(/nenhuma mídia|ainda não disponível/i)
  }
})
test.each(['application/json', 'text/html', 'audio/wav'])('rejeita resposta MP4 com MIME %s', async mime => {
  vi.mocked(fetch).mockResolvedValue(new Response('synthetic', { headers: { 'Content-Type': mime } }))
  await expect(loadMediaFile(config, testOrigin, 'execution_a', 'video', new AbortController().signal)).rejects.toMatchObject({ kind: 'response' })
})
test('rejeita corpo vazio e diferencia falha de rede de cancelamento', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response('', { headers: { 'Content-Type': 'video/mp4' } }))
  await expect(loadMediaFile(config, testOrigin, 'execution_a', 'video', new AbortController().signal)).rejects.toMatchObject({ kind: 'response' })
  vi.mocked(fetch).mockRejectedValue(new Error('network'))
  await expect(loadMediaFile(config, testOrigin, 'execution_a', 'video', new AbortController().signal)).rejects.toMatchObject({ kind: 'network' })
  const controller = new AbortController(); controller.abort()
  await expect(loadMediaFile(config, testOrigin, 'execution_a', 'audio', controller.signal)).rejects.toMatchObject({ kind: 'aborted' })
})
