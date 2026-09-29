// Logger del front: registra la carga de datos (página y gráficos) y los errores en un solo lugar.
//
// - En desarrollo muestra todo en la consola, con el área ("api", "gráfico", "billetera"…) y el tiempo.
// - En producción NO llena la consola de errores: los errores ya controlados se ven en la pantalla
//   (con su mensaje y botón de reintentar). Solo los inesperados se muestran, una vez cada uno.
// - Siempre guarda los últimos 100 eventos: en la consola del navegador, `nexpayLogs()` los muestra
//   (útil para soporte: cada error de la API trae el `request_id` que se busca en los logs de Railway).

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  time: string
  level: LogLevel
  scope: string
  message: string
  meta?: Record<string, unknown>
}

const MAX_HISTORY = 100
const history: LogEntry[] = []
const shownInProduction = new Set<string>()
const isDev = import.meta.env.DEV

function write(level: LogLevel, scope: string, message: string, meta?: Record<string, unknown>): void {
  const entry: LogEntry = { time: new Date().toISOString(), level, scope, message, ...(meta && { meta }) }
  history.push(entry)
  if (history.length > MAX_HISTORY) history.shift()

  if (isDev) {
    const print = level === 'error' ? console.error : level === 'warn' ? console.warn : console.debug
    if (meta) print(`[${scope}] ${message}`, meta)
    else print(`[${scope}] ${message}`)
    return
  }

  // Producción: solo errores inesperados, y sin repetir el mismo mensaje.
  if (level === 'error' && meta?.unexpected === true) {
    const key = `${scope}:${message}`
    if (shownInProduction.has(key)) return
    shownInProduction.add(key)
    console.error(`[NexPay] ${scope}: ${message}`)
  }
}

export const logger = {
  debug: (scope: string, message: string, meta?: Record<string, unknown>) => write('debug', scope, message, meta),
  info: (scope: string, message: string, meta?: Record<string, unknown>) => write('info', scope, message, meta),
  warn: (scope: string, message: string, meta?: Record<string, unknown>) => write('warn', scope, message, meta),
  error: (scope: string, message: string, meta?: Record<string, unknown>) => write('error', scope, message, meta),
}

/** Últimos eventos registrados (los más nuevos al final). */
export function getRecentLogs(): LogEntry[] {
  return [...history]
}

/** Mide cuánto tarda en cargar un dato (ej. el historial del gráfico) y lo registra. */
export async function logLoad<T>(scope: string, what: string, load: () => Promise<T>): Promise<T> {
  const start = performance.now()
  try {
    const result = await load()
    logger.debug(scope, `${what} cargado en ${Math.round(performance.now() - start)} ms`)
    return result
  } catch (error) {
    logger.warn(scope, `No se pudo cargar ${what}`, {
      ms: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

declare global {
  interface Window {
    nexpayLogs?: () => LogEntry[]
  }
}

if (typeof window !== 'undefined') window.nexpayLogs = getRecentLogs
