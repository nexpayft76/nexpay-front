import { useSyncExternalStore } from 'react'

// Una sola MediaQueryList por consulta, reutilizada en cada render. Antes se creaba una nueva con
// window.matchMedia() en cada render (decenas de veces al navegar), y eso obliga al navegador a
// recalcular estilos en medio del render ("forced reflow").
const cache = new Map<string, MediaQueryList>()

function mediaFor(query: string): MediaQueryList {
  let media = cache.get(query)
  if (!media) {
    media = window.matchMedia(query)
    cache.set(query, media)
  }
  return media
}

/** true mientras la media query se cumpla (se actualiza al cambiar el tamaño de la ventana). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = mediaFor(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => mediaFor(query).matches,
    () => false,
  )
}
