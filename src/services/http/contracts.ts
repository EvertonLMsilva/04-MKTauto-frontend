export type ApiErrorKind = 'configuration' | 'request' | 'http' | 'network' | 'aborted' | 'response'

/** Transporte apenas. Os contratos de negócio serão definidos na integração. */
export interface HttpClient {
  request(path: string, options?: RequestInit): Promise<unknown>
}
