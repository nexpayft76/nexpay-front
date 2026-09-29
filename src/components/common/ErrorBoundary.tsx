import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Qué mostrar si algo adentro falla. */
  fallback: ReactNode
}

/**
 * Si un componente de adentro falla al renderizar (ej. no se pudo descargar el código del gráfico),
 * muestra `fallback` en lugar de dejar toda la pantalla en blanco.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export default ErrorBoundary
