import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { NeonButton } from '../../../components/ui/NeonButton'

const motionQuery = '(prefers-reduced-motion: reduce)'
const localMedia = `${import.meta.env.BASE_URL}media/`

function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia?.(motionQuery)
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

function prefersStaticMedia() {
  return typeof window === 'undefined' || !window.matchMedia || window.matchMedia(motionQuery).matches
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

export function HeroMedia({
  imageSrc = `${localMedia}mktauto-robotic-city-original.png`,
  videoSrc = `${localMedia}mktauto-blue-neon-particles-web.mp4`,
}: { imageSrc?: string; videoSrc?: string }) {
  const reducedMotion = useSyncExternalStore(subscribeMotion, prefersStaticMedia, () => true)
  const visible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === 'visible', () => false)
  const [imageReady, setImageReady] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [pausedByUser, setPausedByUser] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canRenderVideo = imageReady && !imageFailed && !videoFailed && !reducedMotion
  const shouldPlay = canRenderVideo && visible && !pausedByUser

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let disposed = false
    if (shouldPlay) {
      void video.play()?.catch(() => {
        if (!disposed) setVideoFailed(true)
      })
    } else {
      video.pause()
    }
    return () => {
      disposed = true
      video.pause()
    }
  }, [canRenderVideo, shouldPlay])

  return (
    <div className={`hero-media ${imageReady && !imageFailed ? 'hero-media--ready' : 'hero-media--static'}`}>
      <div className="hero-media-scene" aria-hidden="true">
        <div className="hero-media-fallback"><span>MKTAUTO / NEON</span></div>
        {!imageFailed && <img className="hero-media-image" src={imageSrc} alt="" width="960" height="540" decoding="async" loading="eager" fetchPriority="high" onLoad={() => setImageReady(true)} onError={() => setImageFailed(true)} />}
        {canRenderVideo && <video ref={videoRef} className={`hero-media-particles ${playing ? 'is-playing' : ''}`} src={videoSrc} muted loop playsInline autoPlay={shouldPlay} preload="none" tabIndex={-1} onPlaying={() => setPlaying(true)} onError={() => setVideoFailed(true)} />}
      </div>
      {canRenderVideo && playing && <NeonButton variant="ghost" className="hero-media-toggle" onClick={() => setPausedByUser((paused) => !paused)}>{pausedByUser ? 'Retomar partículas' : 'Pausar partículas'}</NeonButton>}
    </div>
  )
}
