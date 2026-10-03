import { api } from './api'

export interface AssistantTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AssistantReply {
  reply: string
  /** Modelo que respondió (si el elegido estaba sin cupo, responde otro). */
  model: string
  model_label: string
}

export type ModelTier = 'Avanzado' | 'Intermedio' | 'Básico'

export interface AssistantModel {
  id: string
  label: string
  /** 1 = el más capaz. */
  rank: number
  tier: ModelTier
  /** false: se quedó sin cupo hace poco. */
  available: boolean
  /** Cuándo vuelve a estar disponible (ISO), si está sin cupo. */
  resets_at: string | null
}

/** Envía un mensaje al asistente con los turnos anteriores. La IA puede tardar: hasta 45 s (prueba varios modelos). */
export async function sendAssistantMessage(
  message: string,
  history: AssistantTurn[],
  model?: string,
): Promise<AssistantReply> {
  const { data } = await api.post<{ data: AssistantReply }>(
    '/api/assistant/chat',
    { message, history, ...(model && { model }) },
    { timeout: 45_000 },
  )
  return data.data
}

/** Visitante sin sesión (landing): Nexa responde solo información pública. */
export async function sendGuestAssistantMessage(
  message: string,
  history: AssistantTurn[],
  model?: string,
): Promise<AssistantReply> {
  const { data } = await api.post<{ data: AssistantReply }>(
    '/api/assistant/public/chat',
    { message, history, ...(model && { model }) },
    { timeout: 45_000 },
  )
  return data.data
}

/** Modelos del asistente, del más capaz al más básico, con su estado. */
export async function getAssistantModels(): Promise<AssistantModel[]> {
  const { data } = await api.get<{ data: AssistantModel[] }>('/api/assistant/models')
  return data.data
}
