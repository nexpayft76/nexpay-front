import { useEffect } from 'react'

const SITE = 'NexPay'

/** Título de la pestaña para cada pantalla ("Iniciar sesión · NexPay"). Lo usan los buscadores y el historial. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title
    document.title = `${title} · ${SITE}`
    return () => {
      document.title = previous
    }
  }, [title])
}
