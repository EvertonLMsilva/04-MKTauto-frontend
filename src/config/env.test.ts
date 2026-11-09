import { describe, expect, test } from 'vitest'
import { readApiConfig } from './env'

describe('configuração pública da API', () => {
  test.each([undefined, '', '  '])('permanece desconectada sem URL: %s', (value) => {
    expect(readApiConfig(value).status).toBe('unconfigured')
  })

  test('normaliza a URL configurada e mantém seu prefixo', () => {
    expect(readApiConfig(' https://backend.example/nest/ ')).toEqual({
      status: 'configured', baseUrl: 'https://backend.example/nest',
    })
  })

  test.each(['javascript:alert(1)', '//backend.example', 'http://user:secret@backend.example', 'https://backend.example/?token=secret', 'https://backend.example/#fragment'])('recusa configuração insegura: %s', (value) => {
    expect(readApiConfig(value).status).toBe('invalid')
  })
})
