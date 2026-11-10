import type { ApiConfig } from '../../../config/env'
import { createHttpClient } from '../../../services/http/client'
import { parseProcessingMedia } from '../contracts/processingMedia'
import { dashboardAccess } from './dashboardMetrics'

export async function loadProcessingMedia(config: ApiConfig, origin: string, identity: string, signal?: AbortSignal) {
  if (dashboardAccess(config, origin) !== 'ready' || !/^[a-zA-Z0-9][a-zA-Z0-9_:.-]{2,199}$/.test(identity)) throw new Error('Origem ou identificador incompatível.')
  const response = await createHttpClient(config).request(`/media/assets?pipelineRunId=${encodeURIComponent(identity)}`, {
    method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'error', signal: signal ?? null,
  })
  return parseProcessingMedia(response, identity)
}
