import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import Icon from '../common/Icon'
import type { AssistantModel } from '../../services/assistant.service'
import { AUTO_MODEL, MAX_MESSAGE_LENGTH, useAssistantChat } from './useAssistantChat'
import './AssistantWidget.css'

/** Nombre del asistente (el mismo que usa el back en su prompt). */
export const ASSISTANT_NAME = 'Nexa'

/** "vuelve en 12 min" / "vuelve en 1 h 5 min" a partir de la hora de restablecimiento. */
function timeUntil(iso: string, now: number): string {
  const minutes = Math.max(1, Math.ceil((Date.parse(iso) - now) / 60_000))
  if (minutes < 60) return `vuelve en ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `vuelve en ${hours} h${rest ? ` ${rest} min` : ''}`
}

/** Texto de cada modelo en el selector: posición en el ranking, nivel y estado del cupo. */
function modelOption(model: AssistantModel, now: number): string {
  const status =
    model.available || !model.resets_at || Date.parse(model.resets_at) <= now
      ? '● disponible'
      : `○ sin cupo, ${timeUntil(model.resets_at, now)}`
  return `${model.rank}. ${model.label} · ${model.tier} · ${status}`
}

/** Preguntas de ejemplo para arrancar la conversación (con sesión). */
const SUGGESTIONS = [
  '¿Cuántos dólares son 100.000 pesos colombianos?',
  '¿Cuál es mi saldo total?',
  '¿Cómo compro dólares?',
  '¿Qué diferencia hay entre el dólar oficial y el MEP?',
]

/** Para un visitante de la landing: lo básico, sin datos de cuenta. */
const GUEST_SUGGESTIONS = [
  '¿Cuál es la tasa del dólar hoy?',
  '¿Qué es NexPay?',
  '¿Cómo creo una cuenta?',
  '¿Cómo inicio sesión?',
]

/**
 * Muestra el texto de la IA con negritas (**así**) y viñetas, sin usar HTML crudo:
 * todo pasa por React, así que un texto con etiquetas nunca se ejecuta en la página.
 */
function FormattedText({ text }: { text: string }) {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    // "* item" o "- item" de markdown → viñeta; los "#" de títulos y los espacios de fin de línea se quitan.
    .map((line) => line.replace(/^\s*[*-]\s+/, '• ').replace(/^#{1,6}\s+/, '').replace(/\s+$/, ''))
  return (
    <>
      {lines.map((line, lineIndex) => (
        <span key={lineIndex}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
            part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
              <strong key={partIndex}>{part.slice(2, -2)}</strong>
            ) : (
              part.replace(/\*/g, '')
            ),
          )}
          {lineIndex < lines.length - 1 && '\n'}
        </span>
      ))}
    </>
  )
}

/**
 * Asistente de NexPay (IA): botón flotante en todas las pantallas con sesión.
 * Solo enseña, explica, sugiere y calcula; las operaciones siempre las hace el usuario.
 */
function AssistantWidget() {
  const { user, isLoading } = useAuth()
  // Mientras se verifica la sesión no se muestra, para no abrir el chat de visitante y cambiarlo enseguida.
  if (isLoading) return null
  // key: si cambia la cuenta (o se inicia sesión), la conversación empieza de cero.
  if (!user) return <AssistantPanel key="visitante" userId={null} firstName="" />
  return <AssistantPanel key={user.id} userId={user.id} firstName={user.full_name.trim().split(/\s+/)[0] ?? ''} />
}

/** userId null = visitante de la landing (chat público: tasas, cómo crear cuenta, iniciar sesión…). */
function AssistantPanel({ userId, firstName }: { userId: string | null; firstName: string }) {
  const isGuest = userId === null
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [lastFailed, setLastFailed] = useState<string | null>(null)
  const { messages, sending, error, send, clear, model, setModel, models, refreshModels } = useAssistantChat(userId)
  // Reloj para el "vuelve en X min" de los modelos sin cupo (se actualiza cada 30 s con el chat abierto).
  const [now, setNow] = useState(() => Date.now())
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  // Siempre a la vista el último mensaje.
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, sending, open])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    void refreshModels()
    const tick = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(tick)
    // refreshModels cambia en cada render; solo interesa al abrir el chat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function close() {
    setOpen(false)
    toggleRef.current?.focus()
  }

  async function submit(text: string) {
    if (!text.trim() || sending) return
    setInput('')
    setLastFailed(null)
    try {
      await send(text)
    } catch {
      // El error se muestra en el panel; el texto vuelve al campo para no perderlo.
      setLastFailed(text)
      setInput(text)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submit(input)
  }

  // Enter envía; Shift+Enter agrega un salto de línea.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit(input)
    }
    if (event.key === 'Escape') close()
  }

  return (
    <div className="assistant">
      {open && (
        <section className="assistant__panel" role="dialog" aria-labelledby="assistant-title" aria-modal="false">
          <header className="assistant__header">
            <div>
              <h2 id="assistant-title">{ASSISTANT_NAME}</h2>
              <p>Asistente de NexPay · enseña, sugiere y calcula. Las operaciones las haces tú.</p>
            </div>
            <div className="assistant__header-actions">
              {messages.length > 0 && (
                <button type="button" className="assistant__icon-btn" onClick={clear} title="Nueva conversación" aria-label="Nueva conversación">
                  <Icon name="trash" size={18} />
                </button>
              )}
              <button type="button" className="assistant__icon-btn" onClick={close} title="Cerrar" aria-label="Cerrar asistente">
                <Icon name="close" size={18} />
              </button>
            </div>
          </header>

          {/* Modelo de IA: del más capaz al más básico, con su estado. Si el elegido no tiene cupo, responde otro. */}
          <div className="assistant__model">
            <label htmlFor="assistant-model">Modelo</label>
            <select id="assistant-model" value={model} onChange={(event) => setModel(event.target.value)}>
              <option value={AUTO_MODEL}>Automático (el primero disponible)</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {modelOption(m, now)}
                </option>
              ))}
            </select>
          </div>

          <div ref={listRef} className="assistant__messages" aria-live="polite">
            {messages.length === 0 && (
              <div className="assistant__welcome">
                <p>
                  {isGuest ? (
                    <>
                      ¡Hola! Soy {ASSISTANT_NAME}, la asistente de NexPay. Pregúntame por las tasas del día, qué es
                      NexPay o cómo crear tu cuenta.
                    </>
                  ) : (
                    <>
                      ¡Hola{firstName ? `, ${firstName}` : ''}! Soy {ASSISTANT_NAME}, la asistente de NexPay. Pregúntame
                      sobre tu billetera, las monedas y sus tasas, o cómo hacer una operación.
                    </>
                  )}
                </p>
                <ul className="assistant__suggestions">
                  {(isGuest ? GUEST_SUGGESTIONS : SUGGESTIONS).map((suggestion) => (
                    <li key={suggestion}>
                      <button type="button" onClick={() => void submit(suggestion)} disabled={sending}>
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {messages.map((message) =>
              message.role === 'user' ? (
                <p key={message.id} className="assistant__bubble assistant__bubble--user">
                  <span className="visually-hidden">Tú: </span>
                  {message.content}
                </p>
              ) : (
                <div key={message.id} className="assistant__reply">
                  <p className="assistant__bubble assistant__bubble--assistant">
                    <span className="visually-hidden">{ASSISTANT_NAME}: </span>
                    <FormattedText text={message.content} />
                  </p>
                  {message.modelLabel && <span className="assistant__model-used">Respondió: {message.modelLabel}</span>}
                </div>
              ),
            )}

            {sending && (
              <p className="assistant__bubble assistant__bubble--assistant assistant__typing" aria-label={`${ASSISTANT_NAME} está escribiendo`}>
                <span />
                <span />
                <span />
              </p>
            )}

            {error && (
              <div className="assistant__error" role="alert">
                <span>{error}</span>
                {lastFailed && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => void submit(lastFailed)} disabled={sending}>
                    Reintentar
                  </button>
                )}
              </div>
            )}
          </div>

          <form className="assistant__form" onSubmit={handleSubmit}>
            <label htmlFor="assistant-input" className="visually-hidden">
              Escribe tu pregunta
            </label>
            <textarea
              id="assistant-input"
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Escribe tu pregunta…"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button type="submit" className="assistant__send" disabled={sending || !input.trim()} aria-label="Enviar">
              <Icon name="send" size={18} />
            </button>
          </form>
          <p className="assistant__disclaimer">Respuestas generadas con IA: orientativas, no son asesoramiento financiero.</p>
        </section>
      )}

      <button
        ref={toggleRef}
        type="button"
        className={`assistant__toggle${open ? ' assistant__toggle--open' : ''}`}
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente de NexPay'}
        title={`${ASSISTANT_NAME} · asistente de NexPay`}
      >
        <Icon name={open ? 'close' : 'chat'} size={24} />
      </button>
    </div>
  )
}

export default AssistantWidget
