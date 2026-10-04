import { useEffect, useRef, useState, type RefObject } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'

/** El loop pesa ~5 MB: solo desde tablet. En el celular queda la intro y su último cuadro. */
const WIDE_QUERY = '(min-width: 768px)'

/** true si el usuario activó "ahorro de datos" en el navegador. */
function prefersSaveData(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return connection?.saveData === true
}

/**
 * Video del hero de la landing (estilo TradingView): la intro corre una vez y sigue el loop sin corte.
 * Al bajar se desvanece hasta desaparecer. Decorativo: sin sonido y oculto a lectores de pantalla.
 */
function HeroVideo({ stageRef }: { stageRef: RefObject<HTMLElement | null> }) {
  // Sin matchMedia (navegadores muy viejos o los tests) o con ahorro de datos, no hay video.
  if (typeof window.matchMedia !== 'function' || prefersSaveData()) return null
  return <MotionGate stageRef={stageRef} />
}

/** Sin video si el usuario pidió "reducir movimiento" en su sistema. */
function MotionGate({ stageRef }: { stageRef: RefObject<HTMLElement | null> }) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  return reducedMotion ? null : <VideoStage stageRef={stageRef} />
}

function VideoStage({ stageRef }: { stageRef: RefObject<HTMLElement | null> }) {
  const withLoop = useMediaQuery(WIDE_QUERY)
  const [phase, setPhase] = useState<'intro' | 'loop'>('intro')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const introRef = useRef<HTMLVideoElement>(null)
  const loopRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const intro = introRef.current
    if (!intro) return
    // Si el navegador no deja reproducir, se pasa directo al loop.
    Promise.resolve(intro.play()).catch(() => setPhase('loop'))
  }, [])

  useEffect(() => {
    if (phase !== 'loop') return
    Promise.resolve(loopRef.current?.play()).catch(() => undefined)
  }, [phase])

  // Al bajar, el video se va apagando; cuando ya no se ve, el loop se pausa para no gastar batería.
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const stage = stageRef.current
      const wrapper = wrapperRef.current
      if (!stage || !wrapper) return
      const progress = Math.min(1, Math.max(0, window.scrollY / (stage.offsetHeight * 0.7)))
      wrapper.style.opacity = String(1 - progress)
      const loop = loopRef.current
      if (loop && phase === 'loop') {
        if (progress >= 1 && !loop.paused) loop.pause()
        else if (progress < 1 && loop.paused) Promise.resolve(loop.play()).catch(() => undefined)
      }
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [stageRef, phase])

  // En el celular (sin loop) la intro queda en su último cuadro.
  const introVisible = phase === 'intro' || !withLoop

  return (
    <div ref={wrapperRef} className="hero-video" aria-hidden="true">
      <video
        ref={introRef}
        className={`hero-video__media${introVisible ? '' : ' hero-video__media--hidden'}`}
        src="/videos/intro.mp4"
        muted
        playsInline
        preload="auto"
        onEnded={() => setPhase('loop')}
        onError={() => setPhase('loop')}
      />
      {withLoop && (
        <video
          ref={loopRef}
          className={`hero-video__media${phase === 'loop' ? '' : ' hero-video__media--hidden'}`}
          src="/videos/fondo.mp4"
          muted
          loop
          playsInline
          preload="auto"
        />
      )}
    </div>
  )
}

export default HeroVideo
