import { useEffect, useRef, useState } from 'react'
import type { ApiConfig } from '../../config/env'
import { NeonButton } from '../../components/ui/NeonButton'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { loadMediaFile, mediaErrorMessage } from './service'

export function MediaPlayer({ config, origin, executionId, kind }: { config: ApiConfig; origin: string; executionId: string; kind: 'audio' | 'video' }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [downloaded, setDownloaded] = useState(false)
  const mediaRef = useRef<HTMLMediaElement | null>(null)
  const sourceRef = useRef<string | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const downloadRef = useRef<AbortController | null>(null)
  const busy = useRef({ load: false, download: false })
  const label = kind === 'audio' ? 'narração WAV' : 'MP4 autorizado'

  useEffect(() => () => {
    requestRef.current?.abort()
    downloadRef.current?.abort()
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current)
  }, [])
  useEffect(() => {
    const media = mediaRef.current
    if (!media || !url) return
    const pause = () => media.pause()
    const onVisibility = () => { if (document.hidden) pause() }
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      if (entries.some(entry => entry.target === media && !entry.isIntersecting)) pause()
    })
    observer?.observe(media)
    document.addEventListener('visibilitychange', onVisibility)
    return () => { pause(); observer?.disconnect(); document.removeEventListener('visibilitychange', onVisibility) }
  }, [url])

  async function load() {
    if (busy.current.load) return
    busy.current.load = true
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true); setMessage(null)
    try {
      const blob = await loadMediaFile(config, origin, executionId, kind, controller.signal)
      if (controller.signal.aborted) return
      const source = URL.createObjectURL(blob)
      if (sourceRef.current) URL.revokeObjectURL(sourceRef.current)
      sourceRef.current = source
      setUrl(source)
    } catch (error) { if (!controller.signal.aborted) setMessage(mediaErrorMessage(error)) }
    finally { if (!controller.signal.aborted) { busy.current.load = false; setLoading(false) } }
  }
  async function download() {
    if (busy.current.download) return
    busy.current.download = true
    const controller = new AbortController()
    downloadRef.current = controller
    setDownloading(true); setDownloaded(false); setMessage(null)
    try {
      const blob = await loadMediaFile(config, origin, executionId, 'video', controller.signal, true)
      if (controller.signal.aborted) return
      const source = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = source; link.download = 'video-final.mp4'
      document.body.append(link); link.click(); link.remove()
      // Leave the object URL alive long enough for the browser to accept the user-initiated download.
      window.setTimeout(() => URL.revokeObjectURL(source), 1000)
      setDownloaded(true)
    } catch (error) { if (!controller.signal.aborted) setMessage(mediaErrorMessage(error)) }
    finally { if (!controller.signal.aborted) { busy.current.download = false; setDownloading(false) } }
  }
  function playbackError() {
    setMessage('Falha de reprodução. O navegador não conseguiu decodificar a mídia. Atualize a consulta e carregue o arquivo novamente; isso não comprova ausência do recurso.')
    mediaRef.current?.pause()
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current)
    sourceRef.current = null
    setUrl(null)
  }
  return <div className="media-player">
    <p>Carregamento manual pela rota QC protegida. A autorização é conferida pelo backend a cada pedido.</p>
    <div className="media-actions">
      {!url && <NeonButton loading={loading} onClick={() => void load()}>Carregar {label}</NeonButton>}
      {kind === 'video' && <NeonButton variant="secondary" loading={downloading} onClick={() => void download()}>Baixar MP4 autorizado</NeonButton>}
    </div>
    {message && <StatusMessage tone="error">{message}</StatusMessage>}
    {downloaded && <StatusMessage tone="success">Download solicitado ao navegador.</StatusMessage>}
    {url && (kind === 'audio'
      ? <audio ref={element => { mediaRef.current = element }} aria-label="Narração WAV" controls preload="metadata" src={url} onError={playbackError} />
      : <video ref={element => { mediaRef.current = element }} aria-label="MP4 final" controls playsInline preload="metadata" src={url} onError={playbackError} />)}
    {url && <p>Use os controles para reproduzir. A mídia pausa ao sair da área visível ou ocultar a aba.</p>}
  </div>
}
