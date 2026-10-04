import { fireEvent, render } from '@testing-library/react'
import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HeroVideo from '../src/pages/Landing/HeroVideo'

/** Ancho simulado: desde tablet hay loop. "Reducir movimiento" siempre apagado. */
let wideScreen = true
// useMediaQuery guarda cada MediaQueryList: `matches` se lee en cada render, así cada test elige el ancho.
vi.stubGlobal('matchMedia', (query: string) => ({
  get matches() {
    return query.includes('min-width') ? wideScreen : false
  },
  media: query,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
}))

const videos = (container: HTMLElement) => [...container.querySelectorAll('video')]
const isHidden = (video: HTMLVideoElement) => video.classList.contains('hero-video__media--hidden')

describe('HeroVideo', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  })

  it('corre la intro y al terminar sigue el loop', () => {
    wideScreen = true
    const { container } = render(<HeroVideo stageRef={createRef<HTMLElement>()} />)
    const [intro, loop] = videos(container)
    expect(isHidden(intro)).toBe(false)
    expect(isHidden(loop)).toBe(true)

    fireEvent.ended(intro)
    expect(isHidden(intro)).toBe(true)
    expect(isHidden(loop)).toBe(false)
  })

  it('en el celular no descarga el loop: queda la intro', () => {
    wideScreen = false
    const { container } = render(<HeroVideo stageRef={createRef<HTMLElement>()} />)
    expect(videos(container)).toHaveLength(1)
    fireEvent.ended(videos(container)[0])
    expect(isHidden(videos(container)[0])).toBe(false)
  })
})
