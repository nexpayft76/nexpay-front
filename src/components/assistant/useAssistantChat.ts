import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import {
  getAssistantModels,
  sendAssistantMessage,
  sendGuestAssistantMessage,
  type AssistantModel,
  type AssistantTurn,
} from '../../services/assistant.service'

/** Turnos anteriores que se mandan al back (el back también recorta a 10). */
const HISTORY_SENT = 10
export const MAX_MESSAGE_LENGTH = 500
/** Valor del selector que deja elegir al servidor (el primero disponible). */
export const AUTO_MODEL = 'auto'

export interface ChatMessage extends AssistantTurn {
  id: number
  /** Modelo que respondió (solo en los mensajes del asistente). */
  modelLabel?: string
}

/**
 * Conversación y modelo elegido se guardan en sessionStorage por usuario: duran mientras la pestaña esté
 * abierta y no se mezclan entre cuentas. No son datos importantes: si falla el guardado, se sigue igual.
 */
function read<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sin sessionStorage: dura hasta recargar.
  }
}

/**
 * @param userId el usuario con sesión, o null para un visitante de la landing (chat público, sin datos de nadie).
 */
export function useAssistantChat(userId: string | null) {
  const owner = userId ?? 'visitante'
  const messagesKey = `nexpay_assistant_${owner}`
  const modelKey = `nexpay_assistant_model_${owner}`
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = read<unknown>(messagesKey, [])
    return Array.isArray(saved) ? (saved as ChatMessage[]) : []
  })
  const [model, setModel] = useState<string>(() => read<string>(modelKey, AUTO_MODEL))
  const [models, setModels] = useState<AssistantModel[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => write(messagesKey, messages.slice(-40)), [messages, messagesKey])
  useEffect(() => write(modelKey, model), [model, modelKey])

  /** Vuelve a pedir el estado de los modelos (al abrir el chat y después de cada respuesta). */
  async function refreshModels() {
    try {
      setModels(await getAssistantModels())
    } catch {
      // Sin la lista se puede seguir conversando en "Automático".
    }
  }

  async function send(text: string) {
    const message = text.trim().slice(0, MAX_MESSAGE_LENGTH)
    if (!message || sending) return
    const history: AssistantTurn[] = messages.slice(-HISTORY_SENT).map(({ role, content }) => ({ role, content }))
    const userMessage: ChatMessage = { id: Date.now(), role: 'user', content: message }
    setMessages((current) => [...current, userMessage])
    setError(null)
    setSending(true)
    try {
      const chosen = model === AUTO_MODEL ? undefined : model
      const result = userId
        ? await sendAssistantMessage(message, history, chosen)
        : await sendGuestAssistantMessage(message, history, chosen)
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: 'assistant', content: result.reply, modelLabel: result.model_label },
      ])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'El asistente no pudo responder. Inténtalo de nuevo.')
      // El mensaje que no se respondió se quita: así "Reintentar" lo vuelve a mandar sin duplicarlo.
      setMessages((current) => current.filter((m) => m.id !== userMessage.id))
      throw err
    } finally {
      setSending(false)
      void refreshModels()
    }
  }

  function clear() {
    setMessages([])
    setError(null)
  }

  return { messages, sending, error, send, clear, model, setModel, models, refreshModels }
}
