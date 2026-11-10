import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { HeroMedia } from './HeroMedia'

const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia')
const motionListeners = new Set<() => void>()
let reducedMotion = false
let visibility: DocumentVisibilityState = 'visible'

beforeEach(() => {
  reducedMotion = false
  visibility = 'visible'
  motionListeners.clear()
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({
    matches: reducedMotion,
    addEventListener: (_event: string, listener: () => void) => motionListeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => motionListeners.delete(listener),
  })) })
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia)
  else Reflect.deleteProperty(window, 'matchMedia')
  vi.restoreAllMocks()
})

function setReducedMotion(value: boolean) {
  act(() => {
    reducedMotion = value
    motionListeners.forEach((listener) => listener())
  })
}

test('imagem local decorativa tem referência correta e o vídeo aguarda sua carga', () => {
  const { container } = render(<HeroMedia />)
  const image = container.querySelector('img')!
  expect(image).toHaveAttribute('src', '/media/mktauto-robotic-city-original.png')
  expect(image).toHaveAttribute('alt', '')
  expect(image.parentElement).toHaveAttribute('aria-hidden', 'true')
  expect(image).toHaveAttribute('width', '960')
  expect(image).toHaveAttribute('height', '540')
  expect(container.querySelector('video')).toBeNull()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(fetch).not.toHaveBeenCalled()
})

test('vídeo otimizado usa atributos silenciosos e pode ser pausado e retomado pelo teclado', async () => {
  const user = userEvent.setup()
  const { container } = render(<HeroMedia />)
  fireEvent.load(container.querySelector('img')!)
  const video = container.querySelector('video')!
  expect(video).toHaveAttribute('src', '/media/mktauto-blue-neon-particles-web.mp4')
  expect(video).toHaveProperty('muted', true)
  expect(video).toHaveAttribute('loop')
  expect(video).toHaveAttribute('playsinline')
  expect(video).toHaveAttribute('autoplay')
  expect(video).toHaveAttribute('preload', 'none')
  expect(video).not.toHaveAttribute('controls')
  expect(video).toHaveAttribute('tabindex', '-1')
  expect(video.parentElement).toHaveAttribute('aria-hidden', 'true')
  expect(video.play).toHaveBeenCalledTimes(1)
  fireEvent.playing(video)
  await user.tab()
  expect(screen.getByRole('button', { name: 'Pausar partículas' })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(screen.getByRole('button', { name: 'Retomar partículas' })).toHaveFocus()
  expect(video).not.toHaveAttribute('autoplay')
  expect(video.pause).toHaveBeenCalled()
  await user.keyboard('{Enter}')
  expect(video.play).toHaveBeenCalledTimes(2)
  expect(fetch).not.toHaveBeenCalled()
})

test('erro no vídeo preserva a imagem e remove a camada e o controle de reprodução', () => {
  const { container } = render(<HeroMedia />)
  const image = container.querySelector('img')!
  fireEvent.load(image)
  const video = container.querySelector('video')!
  fireEvent.playing(video)
  fireEvent.error(video)
  expect(container.querySelector('img')).toBe(image)
  expect(container.querySelector('.hero-media')).toHaveClass('hero-media--ready')
  expect(container.querySelector('video')).toBeNull()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

test('autoplay rejeitado mantém imagem estática sem rejeição não tratada', async () => {
  vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('Autoplay bloqueado', 'NotAllowedError'))
  const { container } = render(<HeroMedia />)
  fireEvent.load(container.querySelector('img')!)
  await waitFor(() => expect(container.querySelector('video')).toBeNull())
  expect(container.querySelector('img')).toBeInTheDocument()
  expect(container.querySelector('.hero-media')).toHaveClass('hero-media--ready')
})

test('mídia ausente em outro clone mantém fallback CSS sem imagem quebrada nem vídeo', () => {
  const { container } = render(<HeroMedia />)
  fireEvent.error(container.querySelector('img')!)
  expect(container.querySelector('img')).toBeNull()
  expect(container.querySelector('video')).toBeNull()
  expect(container.querySelector('.hero-media')).toHaveClass('hero-media--static')
  expect(container.querySelector('.hero-media-fallback')).toBeInTheDocument()
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled()
  expect(fetch).not.toHaveBeenCalled()
})

test('preferência inicial e alterações de movimento reduzido impedem autoplay e interrompem reprodução', () => {
  reducedMotion = true
  const { container } = render(<HeroMedia />)
  fireEvent.load(container.querySelector('img')!)
  expect(container.querySelector('video')).toBeNull()
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled()
  setReducedMotion(false)
  expect(container.querySelector('video')).toHaveAttribute('autoplay')
  setReducedMotion(true)
  expect(container.querySelector('video')).toBeNull()
  expect(container.querySelector('img')).toBeInTheDocument()
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
})

test('aba oculta interrompe o vídeo e a escolha de pausa permanece ao voltar', async () => {
  const user = userEvent.setup()
  const { container, unmount } = render(<HeroMedia />)
  fireEvent.load(container.querySelector('img')!)
  const video = container.querySelector('video')!
  fireEvent.playing(video)
  await user.click(screen.getByRole('button', { name: 'Pausar partículas' }))
  const callsBeforeHide = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length
  act(() => {
    visibility = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(container.querySelector('video')).toBe(video)
  expect(video).not.toHaveAttribute('autoplay')
  expect(video.pause).toHaveBeenCalled()
  act(() => {
    visibility = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(container.querySelector('video')).not.toHaveAttribute('autoplay')
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(callsBeforeHide)
  unmount()
  expect(motionListeners.size).toBe(0)
})

test('sem matchMedia a composição permanece estática por segurança', () => {
  Reflect.deleteProperty(window, 'matchMedia')
  const { container } = render(<HeroMedia />)
  fireEvent.load(container.querySelector('img')!)
  expect(container.querySelector('video')).toBeNull()
  expect(container.querySelector('img')).toBeInTheDocument()
})

test('visibility changes pause and resume the same video without losing its playback position', () => {
  const { container } = render(<HeroMedia />)
  fireEvent.load(container.querySelector('img')!)
  const video = container.querySelector('video')!
  video.currentTime = 7.5
  fireEvent.playing(video)
  const initialPlayCalls = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length
  act(() => {
    visibility = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(container.querySelector('video')).toBe(video)
  expect(video).not.toHaveAttribute('autoplay')
  expect(video.pause).toHaveBeenCalled()
  expect(video.currentTime).toBe(7.5)
  act(() => {
    visibility = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(container.querySelector('video')).toBe(video)
  expect(video.currentTime).toBe(7.5)
  expect(video).toHaveAttribute('autoplay')
  expect(video.play).toHaveBeenCalledTimes(initialPlayCalls + 1)
  expect(fetch).not.toHaveBeenCalled()
})
