import { useEffect, useState } from 'react'
import { ApiError } from '../services/api'
import type { PageResult } from '../types/history'

export type PagedState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: PageResult<T> }
  | { status: 'error'; message: string }

type Stored<T> = { key: string; state: PagedState<T> }

/**
 * Carga una página de una lista del back. `key` resume los filtros: si cambia (o la página, o reload),
 * se vuelve a pedir. Mientras llega, el estado es "loading" (nunca se muestra una página de otros filtros).
 */
export function usePagedList<T>(key: string, page: number, load: (page: number) => Promise<PageResult<T>>) {
  const [version, setVersion] = useState(0)
  const requestKey = `${key}|${page}|${version}`
  const [stored, setStored] = useState<Stored<T>>({ key: '', state: { status: 'loading' } })

  useEffect(() => {
    let cancelled = false
    load(page)
      .then((data) => {
        if (!cancelled) setStored({ key: requestKey, state: { status: 'ok', data } })
      })
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : 'No se pudo cargar la información.'
        if (!cancelled) setStored({ key: requestKey, state: { status: 'error', message } })
      })
    return () => {
      cancelled = true
    }
    // `load` cambia en cada render; lo que importa son los filtros (key), la página y reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  const state: PagedState<T> = stored.key === requestKey ? stored.state : { status: 'loading' }
  return { state, reload: () => setVersion((n) => n + 1) }
}
