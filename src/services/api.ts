import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { logger } from '../utils/logger'
import { notifySessionExpired } from './session'

// Cliente HTTP único para hablar con el backend de NexPay.
//
// Las peticiones van a /api en el MISMO dominio del front: en producción Vercel las reenvía al back
// (vercel.json) y en desarrollo lo hace Vite (vite.config.ts). Así la cookie de sesión es "propia"
// y funciona también en Safari, Brave y el modo incógnito, que bloquean cookies de otros dominios.
export const api = axios.create({
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** Momento en que salió la petición, para medir cuánto tardó. */
    startedAt?: number
  }
}

api.interceptors.request.use((config) => {
  config.startedAt = performance.now()
  return config
})

export type ApiErrorKind = 'network' | 'timeout' | 'http'

// Error normalizado: las pantallas solo leen `message` y no conocen detalles de axios.
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  /** Id de la petición en el back (cabecera X-Request-Id): se busca en los logs de Railway. */
  readonly requestId?: string

  constructor(kind: ApiErrorKind, message: string, status?: number, requestId?: string) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.requestId = requestId
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ message?: string }>

    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return new ApiError('timeout', 'El servidor tardó demasiado en responder. Intentá de nuevo.')
    }
    if (!err.response) {
      return new ApiError('network', 'No se pudo conectar con el servidor. Revisá tu conexión.')
    }

    const status = err.response.status
    const message =
      err.response.data?.message ??
      (status >= 500 ? 'Error del servidor. Intentá más tarde.' : 'No se pudo completar la solicitud.')
    return new ApiError('http', message, status, requestIdOf(err.response))
  }

  return new ApiError('network', 'Ocurrió un error inesperado.')
}

function requestIdOf(response: AxiosResponse | undefined): string | undefined {
  const id: unknown = response?.headers?.['x-request-id']
  return typeof id === 'string' ? id : undefined
}

/** "GET /api/wallets/me" (sin los parámetros, que pueden traer datos del usuario). */
function describe(config: InternalAxiosRequestConfig | undefined): string {
  return `${(config?.method ?? 'get').toUpperCase()} ${config?.url ?? '?'}`
}

function elapsed(config: InternalAxiosRequestConfig | undefined): number | undefined {
  return config?.startedAt === undefined ? undefined : Math.round(performance.now() - config.startedAt)
}

// Cada respuesta queda registrada en el logger (en desarrollo se ve en la consola con su tiempo).
// Todas las respuestas con error llegan a los services como ApiError.
api.interceptors.response.use(
  (response) => {
    logger.debug('api', `${describe(response.config)} → ${response.status}`, { ms: elapsed(response.config) })
    return response
  },
  (error) => {
    const apiError = toApiError(error)
    const config = axios.isAxiosError(error) ? error.config : undefined
    logger.warn('api', `${describe(config)} → ${apiError.status ?? apiError.kind}: ${apiError.message}`, {
      ms: elapsed(config),
      request_id: apiError.requestId,
    })
    // Un 401 con la sesión iniciada: venció o fue cerrada en otro lado. Se cierra en toda la app.
    if (apiError.status === 401) notifySessionExpired()
    return Promise.reject(apiError)
  },
)
