import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AssistantWidget from '../src/components/assistant/AssistantWidget'
import { ApiError } from '../src/services/api'
import {
  getAssistantModels,
  sendAssistantMessage,
  sendGuestAssistantMessage,
  type AssistantModel,
} from '../src/services/assistant.service'

vi.mock('../src/services/assistant.service', () => ({
  sendAssistantMessage: vi.fn(),
  sendGuestAssistantMessage: vi.fn(),
  getAssistantModels: vi.fn(),
}))

/** Usuario con sesión, o null para probar el chat de visitante (landing). */
const ANA = { id: 'user-1', full_name: 'Ana Pérez', email: 'ana@nexpay.com' }
let currentUser: typeof ANA | null = ANA
vi.mock('../src/hooks/useAuth', () => ({
  useAuth: () => ({ user: currentUser, isLoading: false }),
}))

const mockedSend = vi.mocked(sendAssistantMessage)
const mockedGuestSend = vi.mocked(sendGuestAssistantMessage)
const mockedModels = vi.mocked(getAssistantModels)

const MODELS: AssistantModel[] = [
  { id: 'nemotron:free', label: 'Nemotron 3 Super 120B', rank: 1, tier: 'Avanzado', available: true, resets_at: null },
  {
    id: 'qwen:free',
    label: 'Qwen 3.8 27B',
    rank: 3,
    tier: 'Intermedio',
    available: false,
    resets_at: new Date(Date.now() + 12 * 60_000).toISOString(),
  },
]

/** Respuesta del back con el modelo que contestó. */
const answer = (reply: string) => ({ reply, model: 'nemotron:free', model_label: 'Nemotron 3 Super 120B' })

describe('AssistantWidget', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
    currentUser = ANA
    mockedModels.mockResolvedValue(MODELS)
  })

  it('sin sesión (landing): saluda como visitante, sugiere lo básico y usa el chat público', async () => {
    currentUser = null
    mockedGuestSend.mockResolvedValue(answer('Toca "Crear cuenta" arriba a la derecha.'))
    render(<AssistantWidget />)

    await userEvent.click(screen.getByRole('button', { name: 'Abrir asistente de NexPay' }))
    expect(screen.getByText(/¡Hola! Soy Nexa/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '¿Cuál es mi saldo total?' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '¿Cómo creo una cuenta?' }))
    expect(await screen.findByText(/Crear cuenta/)).toBeInTheDocument()
    expect(mockedGuestSend).toHaveBeenCalledWith('¿Cómo creo una cuenta?', [], undefined)
    expect(mockedSend).not.toHaveBeenCalled()
  })

  it('abre el panel, saluda por el nombre y responde una pregunta sugerida', async () => {
    mockedSend.mockResolvedValue(answer('Con la tasa actual son unos 25 USD.'))
    render(<AssistantWidget />)

    await userEvent.click(screen.getByRole('button', { name: 'Abrir asistente de NexPay' }))
    expect(screen.getByText(/¡Hola, Ana!/)).toHaveTextContent('Soy Nexa')

    await userEvent.click(screen.getByRole('button', { name: '¿Cuántos dólares son 100.000 pesos colombianos?' }))
    expect(await screen.findByText('Con la tasa actual son unos 25 USD.')).toBeInTheDocument()
    expect(mockedSend).toHaveBeenCalledWith('¿Cuántos dólares son 100.000 pesos colombianos?', [], undefined)
  })

  it('muestra las **negritas** de la IA como negrita, sin asteriscos ni HTML crudo', async () => {
    mockedSend.mockResolvedValue(answer('Son **30,20 USD** <img src=x onerror=alert(1)>'))
    render(<AssistantWidget />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir asistente de NexPay' }))
    await userEvent.type(screen.getByLabelText('Escribe tu pregunta'), 'hola{Enter}')

    const strong = await screen.findByText('30,20 USD')
    expect(strong.tagName).toBe('STRONG')
    expect(document.querySelector('.assistant img')).toBeNull()
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument()
  })

  it('manda el historial en la siguiente pregunta', async () => {
    mockedSend.mockResolvedValueOnce(answer('Hola')).mockResolvedValueOnce(answer('Tienes 500.000 COP.'))
    render(<AssistantWidget />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir asistente de NexPay' }))

    await userEvent.type(screen.getByLabelText('Escribe tu pregunta'), 'hola{Enter}')
    await screen.findByText('Hola')
    await userEvent.type(screen.getByLabelText('Escribe tu pregunta'), '¿Cuánto tengo?{Enter}')

    await screen.findByText('Tienes 500.000 COP.')
    expect(mockedSend).toHaveBeenLastCalledWith(
      '¿Cuánto tengo?',
      [
        { role: 'user', content: 'hola' },
        { role: 'assistant', content: 'Hola' },
      ],
      undefined,
    )
  })

  it('si falla muestra el error, devuelve el texto al campo y permite reintentar', async () => {
    mockedSend.mockRejectedValueOnce(new ApiError('http', 'El asistente no está disponible en este momento.', 503))
    mockedSend.mockResolvedValueOnce(answer('Listo, aquí tienes.'))
    render(<AssistantWidget />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir asistente de NexPay' }))

    await userEvent.type(screen.getByLabelText('Escribe tu pregunta'), 'pregunta{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('no está disponible')
    expect(screen.getByLabelText('Escribe tu pregunta')).toHaveValue('pregunta')

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByText('Listo, aquí tienes.')).toBeInTheDocument())
  })

  it('muestra los modelos rankeados con su cupo, manda el elegido y dice cuál respondió', async () => {
    mockedSend.mockResolvedValue(answer('Listo.'))
    render(<AssistantWidget />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir asistente de NexPay' }))

    const select = await screen.findByLabelText('Modelo')
    await waitFor(() => expect(select.querySelectorAll('option')).toHaveLength(3))
    expect(screen.getByRole('option', { name: /1\. Nemotron 3 Super 120B · Avanzado · ● disponible/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /3\. Qwen 3\.8 27B · Intermedio · ○ sin cupo, vuelve en 12 min/ })).toBeInTheDocument()

    await userEvent.selectOptions(select, 'nemotron:free')
    await userEvent.type(screen.getByLabelText('Escribe tu pregunta'), 'hola{Enter}')
    expect(await screen.findByText('Respondió: Nemotron 3 Super 120B')).toBeInTheDocument()
    expect(mockedSend).toHaveBeenLastCalledWith('hola', [], 'nemotron:free')
  })
})
