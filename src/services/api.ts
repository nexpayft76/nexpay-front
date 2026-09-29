import axios, { AxiosError } from 'axios'
import { getValidToken, notifySessionExpired } from './session'

const baseURL = import.meta.env.VITE_API_URL

// Cliente HTTP único para hablar con el backend de NexPay.
export const api = axios.create({
  baseURL: baseURL ?? '',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// Solo se manda un token vigente: uno vencido se descarta antes, sin generar un 401 en la consola.
api.interceptors.request.use((config) => {
  const token = getValidToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export type ApiErrorKind = 'network' | 'timeout' | 'http'

// Error normalizado: las pantallas solo leen `message` y no conocen detalles de axios.
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
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
    return new ApiError('http', message, status)
  }

  return new ApiError('network', 'Ocurrió un error inesperado.')
}

// Todas las respuestas con error llegan a los services como ApiError.
// Un 401 con token significa que la sesión ya no vale (revocada o firmada por otro servidor):
// se cierra en toda la app y el login explica por qué.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error)
    const sentToken = axios.isAxiosError(error) && Boolean(error.config?.headers?.Authorization)
    if (apiError.status === 401 && sentToken) notifySessionExpired()
    return Promise.reject(apiError)
  },
)
