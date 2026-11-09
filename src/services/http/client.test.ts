import { describe, expect, test, vi } from 'vitest'
import { readApiConfig } from '../../config/env'
import { ApiError, createHttpClient } from './client'

const configured = () => createHttpClient(readApiConfig('https://backend.example/nest'))

describe('cliente HTTP — contratos de transporte, sem endpoints operacionais', () => {
  test('não consulta a rede sem uma configuração válida', async () => {
    for (const value of ['', 'invalid']) {
      await expect(createHttpClient(readApiConfig(value)).request('/fixture')).rejects.toMatchObject({ kind: 'configuration' })
    }
    expect(fetch).not.toHaveBeenCalled()
  })

  test('preserva prefixo e headers e devolve JSON sem presumir contrato de negócio', async () => {
    const mock = vi.mocked(fetch).mockResolvedValue(new Response('{"fixture":true}'))
    await expect(configured().request('/fixture', { headers: { 'X-Test': 'fixture' } })).resolves.toEqual({ fixture: true })
    const [url, init] = mock.mock.calls[0]!
    expect(url).toBe('https://backend.example/nest/fixture')
    expect(new Headers(init?.headers).get('Accept')).toBe('application/json')
    expect(new Headers(init?.headers).get('X-Test')).toBe('fixture')
    expect(init?.credentials).toBe('omit')
  })

  test.each(['//other.example/fixture', '/../outside', '/\\other.example/fixture'])('impede sair da origem ou do prefixo configurado: %s', async (path) => {
    await expect(configured().request(path)).rejects.toMatchObject({ kind: 'request' })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('normaliza erro HTTP sem expor a mensagem privada e sem retry', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ code: 'FIXTURE_CONFLICT', message: 'private backend detail' }), { status: 409 }))
    const error: unknown = await configured().request('/fixture', { method: 'POST' }).catch((value: unknown) => value)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'http', status: 409, code: 'FIXTURE_CONFLICT' })
    expect((error as ApiError).message).not.toContain('private backend detail')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('distingue falha de rede, cancelamento e JSON inválido', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('offline'))
    await expect(configured().request('/fixture')).rejects.toMatchObject({ kind: 'network' })
    vi.mocked(fetch).mockRejectedValueOnce(new DOMException('cancelled', 'AbortError'))
    await expect(configured().request('/fixture')).rejects.toMatchObject({ kind: 'aborted' })
    vi.mocked(fetch).mockResolvedValueOnce(new Response('<html>not JSON</html>'))
    await expect(configured().request('/fixture')).rejects.toMatchObject({ kind: 'response' })
  })

  test('aceita resposta 204 sem tentar interpretar JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
    await expect(configured().request('/fixture')).resolves.toBeUndefined()
  })
})
