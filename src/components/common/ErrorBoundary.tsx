import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logger } from '../../utils/logger'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Qué mostrar si algo adentro falla. */
  fallback: ReactNode
  /** Área para el logger (ej. "gráfico"). */
  scope?: string
}

/**
 * Si un componente de adentro falla al renderizar (ej. no se pudo descargar el código del gráfico),
 * muestra `fallback` en lugar de dejar toda la pantalla en blanco, y lo registra en el logger.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error(this.props.scope ?? 'ui', error.message, {
      unexpected: true,
      component: info.componentStack?.split('\n').find((line) => line.trim())?.trim(),
    })
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export default ErrorBoundary
