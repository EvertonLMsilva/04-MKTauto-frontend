import { createServer as createHttpServer, request, type IncomingHttpHeaders } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { createServer, type ProxyOptions, type ViteDevServer } from 'vite'
import config from './vite.config'

function configuration(target: string) {
  vi.stubEnv('MKTAUTO_API_PROXY_TARGET', target)
  try { return config({ command: 'serve', mode: 'test' }) }
  finally { vi.unstubAllEnvs() }
}

test('without a target, development stays offline with no proxy', () => {
  expect(configuration('').server).toBeUndefined()
})
test.each(['https://api.example.com', 'http://192.168.0.2:3000', 'http://0.0.0.0:3000', 'file:///private', 'http://user:secret@localhost:3000', 'http://localhost:3000/api', 'http://localhost:3000?token=private', 'http://localhost:3000/#private', 'invalid'])('rejects an incompatible target: %s', target => {
  expect(() => configuration(target)).toThrow()
})
test.each(['http://127.0.0.1:3123', 'http://localhost:3000', 'http://[::1]:3000'])('keeps the loopback target and security options: %s', target => {
  const proxy = configuration(target).server!.proxy!
  expect(Object.keys(proxy)).toHaveLength(3)
  for (const options of Object.values(proxy)) expect(options).toMatchObject({ target, changeOrigin: false, ws: false, followRedirects: false, proxyTimeout: 5000 })
})

describe('real local HTTP routing against an isolated test server, never the backend', () => {
  const received: { url: string; method: string; headers: IncomingHttpHeaders }[] = []
  const upstream = createHttpServer((req, res) => {
    received.push({ url: req.url!, method: req.method!, headers: req.headers })
    const status = Number(new URL(req.url!, 'http://test.invalid').searchParams.get('status')) || 200
    res.statusCode = status
    res.setHeader('Cache-Control', 'no-store')
    if (status === 302) res.setHeader('Location', '/redirect-must-not-be-followed')
    res.setHeader('Content-Type', status === 502 ? 'text/html' : 'application/json')
    res.end(status === 502 ? '<html>TEST ONLY upstream unavailable</html>' : JSON.stringify({ testOnly: true, status }))
  })
  let vite: ViteDevServer
  let origin: string
  function get(path: string, method = 'GET', headers: IncomingHttpHeaders = {}) {
    return new Promise<{ status: number; headers: IncomingHttpHeaders; body: string }>((resolve, reject) => {
      const req = request(origin + path, { method, headers, agent: false }, res => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', chunk => { body += chunk })
        res.on('end', () => resolve({ status: res.statusCode!, headers: res.headers, body }))
      })
      req.on('error', reject)
      req.end()
    })
  }
  beforeAll(async () => {
    await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve))
    const upstreamOrigin = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`
    const resolved = configuration(upstreamOrigin)
    vite = await createServer({
      ...resolved, configFile: false, envDir: false, cacheDir: 'node_modules/.cache/vite-proxy-test',
      publicDir: false, logLevel: 'silent',
      plugins: [...resolved.plugins!, { name: 'local-static-fixtures-only', configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Isolated markers: the test never reads or redistributes the private hero binaries.
          if (!['/media/mktauto-robotic-city-original.png', '/media/mktauto-blue-neon-particles-web.mp4'].includes(req.url!)) return next()
          res.setHeader('Content-Type', req.url!.endsWith('.png') ? 'image/png' : 'video/mp4')
          res.end('LOCAL_STATIC_TEST_ONLY')
        })
      } }],
      server: { ...resolved.server, host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    })
    await vite.listen()
    origin = `http://127.0.0.1:${(vite.httpServer!.address() as AddressInfo).port}`
  }, 15000)
  afterAll(async () => {
    await vite?.close()
    await new Promise<void>((resolve, reject) => upstream.close(error => error ? reject(error) : resolve()))
  })
  test.each(['/operations', '/operations/session', '/operations/executions', '/operations/dashboard/summary', '/media/assets?pipelineRunId=run%3A001', '/publishing/executions/execution%3A001/destinations', '/publishing/executions/queue?limit=25&offset=25', '/affiliate/campaigns/campaign_test/revisions/1'])('forwards the exact path and query: %s', async path => {
    const before = received.length
    const response = await get(path, 'GET', { Origin: origin, Cookie: 'test-only=opaque-marker' })
    expect(response.status).toBe(200)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(received).toHaveLength(before + 1)
    expect(received.at(-1)).toMatchObject({ url: path, method: 'GET', headers: { host: new URL(origin).host, origin, cookie: 'test-only=opaque-marker' } })
    expect(received.at(-1)?.headers.authorization).toBeUndefined()
    expect(received.at(-1)?.headers['x-forwarded-for']).toBeUndefined()
  })
  test.each([401, 403, 404, 502])('preserves HTTP %i without converting it to an empty response', async status => {
    const response = await get(`/media/assets?pipelineRunId=run_001&status=${status}`)
    expect(response.status).toBe(status)
    if (status === 502) expect(response.body).toContain('<html>')
    else expect(JSON.parse(response.body)).toEqual({ testOnly: true, status })
  })
  test('does not follow an upstream redirect', async () => {
    const before = received.length
    const response = await get('/operations/executions?status=302')
    expect(response.status).toBe(302)
    expect(response.headers.location).toBe('/redirect-must-not-be-followed')
    expect(received).toHaveLength(before + 1)
  })
  test.each(['/media/mktauto-robotic-city-original.png', '/media/mktauto-blue-neon-particles-web.mp4'])('keeps the hero static route local: %s', async path => {
    const before = received.length
    expect((await get(path)).body).toBe('LOCAL_STATIC_TEST_ONLY')
    expect(received).toHaveLength(before)
    const patterns = Object.keys(configuration('http://127.0.0.1:3123').server!.proxy!)
    expect(patterns.some(pattern => new RegExp(pattern).test(path))).toBe(false)
  })
  test.each(['/media/assets/asset_001', '/media/assets-extra', '/media/compositions', '/publishing/executions/execution_001/facebook-reels', '/publishing/executions/execution_001/destinations/extra', '/publishing/manual-publications', '/publishing/executions/queue/extra', '/publishing/executions/queue-extra', '/operations-extra', '/affiliate/campaigns', '/affiliate/campaigns/campaign_test/revisions/1/extra', '/affiliate/campaigns/campaign_test/revisions/01', '/affiliate/products/product_test/revisions/1', '/content-operations/campaign-executions/local'])('does not proxy paths outside the allowed namespaces: %s', async path => {
    const before = received.length
    const response = await get(path)
    expect(received).toHaveLength(before)
    expect(response.body).not.toContain('"testOnly"')
  })
  test.each(['/media/assets?pipelineRunId=run_001', '/publishing/executions/execution_001/destinations', '/publishing/executions/queue?limit=25&offset=0', '/affiliate/campaigns/campaign_test/revisions/1'].flatMap(path => ['POST', 'PATCH', 'DELETE', 'HEAD'].map(method => ({ path, method }))))('blocks $method for the read endpoint $path', async ({ path, method }) => {
    const before = received.length
    expect((await get(path, method)).status).toBe(404)
    expect(received).toHaveLength(before)
    const options = vite.config.server.proxy!
    expect((options['^/publishing/executions/queue(?:\\?|$)'] as ProxyOptions).bypass).toBeTypeOf('function')
  })
})
