import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AmountInput from '../../components/common/AmountInput'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import WalletCard from '../../components/wallet/WalletCard'
import { useMyWallet } from '../../hooks/useMyWallet'
import { ApiError } from '../../services/api'
import { depositToMyWallet } from '../../services/wallet.service'
import type { DepositResult } from '../../types/wallet'
import { parseAmount, validateAmountText, visibleAmountError, type AmountIssue } from '../../utils/amount'
import { currencyInfo } from '../../utils/currencies'
import { formatCurrency } from '../../utils/formatCurrency'
import CurrencyPicker from './CurrencyPicker'
import './Operations.css'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useOptionalAlerts } from '../../contexts/AlertsContext'

/** Mismas reglas que el back: formato válido, mayor que 0, hasta 2 decimales y hasta el límite de la moneda. */
function validateDeposit(text: string, currency: string): AmountIssue | undefined {
  const info = currencyInfo(currency)
  return validateAmountText(text, {
    max: info && {
      value: info.depositLimit,
      message: `El máximo por recarga es ${formatCurrency(info.depositLimit, currency)}.`,
    },
  })
}

/** Operaciones → Recarga: agregar dinero ficticio a la billetera (modo demo). */
function DepositPage() {
  useDocumentTitle('Recargar')
  const [currency, setCurrency] = useState('COP')
  const [amountText, setAmountText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  /** Error que devolvió el back al recargar (los del monto se calculan en tiempo real, abajo). */
  const [error, setError] = useState<string | null>(null)
  /** Se intentó enviar o se salió del campo: ahí también se avisa si quedó vacío. */
  const [touched, setTouched] = useState(false)
  /** Ventana "¿Confirmas la recarga?" abierta. */
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<DepositResult | null>(null)
  const wallet = useMyWallet('USD')
  // Billetera al lado del formulario: sigue a la moneda que se recarga (se puede cambiar desde su selector).
  const [walletCurrency, setWalletCurrency] = useState('COP')
  // Cambiar la key vuelve a montar la billetera para que pida los saldos nuevos después de recargar.
  const [walletVersion, setWalletVersion] = useState(0)
  const { recordDeposit } = useOptionalAlerts()

  const info = currencyInfo(currency)
  const amount = parseAmount(amountText)
  // En tiempo real: decimales de más y límite se avisan al instante; "mayor que 0" y el formato,
  // cuando el usuario hace una pausa al escribir (o enseguida si ya salió del campo).
  const issue = validateDeposit(amountText, currency)
  const settled = useDebouncedValue(amountText, 400) === amountText
  const amountError =
    visibleAmountError(issue, settled || touched) ?? (touched && !amountText.trim() ? 'Ingresa un monto.' : undefined)
  const canSubmit = !submitting && amountText.trim() !== '' && issue === undefined
  const currentBalance = wallet.status === 'ok' ? wallet.data.balances.find((b) => b.currency === currency)?.amount : undefined

  function chooseCurrency(code: string) {
    setCurrency(code)
    setWalletCurrency(code)
    setAmountText('')
    setError(null)
    setTouched(false)
  }

  // Primero se pide confirmación: es dinero lo que se mueve.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)
    if (!canSubmit) return
    setError(null)
    setConfirming(true)
  }

  async function confirmDeposit() {
    setSubmitting(true)
    try {
      const deposit = await depositToMyWallet(currency, amount)
      setResult(deposit)
      recordDeposit({
        transactionId: deposit.transaction_id,
        currency: deposit.currency,
        amount: deposit.amount,
        newBalance: deposit.new_balance,
        createdAt: deposit.created_at,
      })
      setAmountText('')
      setTouched(false)
      wallet.reload()
      setWalletVersion((n) => n + 1)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo hacer la recarga.')
    } finally {
      setSubmitting(false)
      setConfirming(false)
    }
  }

  return (
    <section className="dashboard-content" aria-labelledby="deposit-title">
      <p className="dashboard-eyebrow">Operaciones</p>
      <h1 id="deposit-title">Recargar mi billetera</h1>
      <p>Agrega saldo para comprar, vender o intercambiar monedas.</p>

      <div className="op-layout">
        {result ? (
          <DepositSuccess result={result} onAnother={() => setResult(null)} />
        ) : (
          <form className="op-card" onSubmit={handleSubmit} noValidate>
            <div className="op-card__header">
              <h2>Nueva recarga</h2>
              <span className="op-badge">Dinero ficticio · modo demo</span>
            </div>

            <fieldset className="op-field">
              <legend className="op-field__label">Moneda</legend>
              <CurrencyPicker value={currency} onChange={chooseCurrency} label="Moneda a recargar" />
              {currentBalance !== undefined && (
                <p className="op-hint">
                  Saldo actual en {currency}: <strong>{formatCurrency(Number(currentBalance), currency)}</strong>
                </p>
              )}
            </fieldset>

            <div className="op-field">
              <label className="op-field__label" htmlFor="deposit-amount">
                Monto
              </label>
              <AmountInput
                id="deposit-amount"
                className="op-input"
                placeholder={info ? `Ej. ${info.quickAmounts[1].toLocaleString('es-AR')}` : 'Monto'}
                value={amountText}
                onValueChange={(text) => {
                  setAmountText(text)
                  setError(null)
                }}
                onBlur={() => setTouched(true)}
                aria-invalid={amountError !== undefined}
                aria-describedby="deposit-amount-hint deposit-limit"
              />
              <span id="deposit-amount-hint" className="op-field-error" aria-live="polite">
                {amountError}
              </span>
              <span id="deposit-limit" className="op-hint">
                Máximo por recarga: {info ? formatCurrency(info.depositLimit, currency) : '—'}
              </span>
            </div>

            {info && (
              <div className="op-quick" aria-label="Montos rápidos">
                {info.quickAmounts.map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setAmountText(quick.toLocaleString('es-AR'))
                      setError(null)
                    }}
                  >
                    {formatCurrency(quick, currency)}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <p className="op-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn--primary btn--lg op-submit" disabled={submitting}>
              {submitting
                ? 'Recargando…'
                : amountError === undefined && amount > 0
                  ? `Recargar ${formatCurrency(amount, currency)}`
                  : 'Recargar'}
            </button>
          </form>
        )}

        <aside className="op-layout__wallet" aria-label="Tu billetera">
          <WalletCard key={walletVersion} valuedIn={walletCurrency} onValuedInChange={setWalletCurrency} />
        </aside>
      </div>

      <ConfirmDialog
        open={confirming}
        title="¿Confirmas la recarga?"
        confirmLabel="Sí, recargar"
        busy={submitting}
        onConfirm={confirmDeposit}
        onCancel={() => setConfirming(false)}
      >
        <p>
          Vas a agregar <strong>{formatCurrency(Number.isNaN(amount) ? 0 : amount, currency)}</strong> a tu billetera.
        </p>
        {currentBalance !== undefined && !Number.isNaN(amount) && (
          <p>
            Tu saldo en {currency} pasará de {formatCurrency(Number(currentBalance), currency)} a{' '}
            <strong>{formatCurrency(Number(currentBalance) + amount, currency)}</strong>.
          </p>
        )}
        <p className="confirm-dialog__note">Dinero ficticio · modo demo.</p>
      </ConfirmDialog>
    </section>
  )
}

function DepositSuccess({ result, onAnother }: { result: DepositResult; onAnother: () => void }) {
  return (
    <div className="op-card op-success" role="status">
      <span className="op-success__icon" aria-hidden="true">
        ✓
      </span>
      <h2>Recarga exitosa</h2>
      <p>
        Recargaste <strong>{formatCurrency(Number(result.amount), result.currency)}</strong>.
      </p>
      <p>
        Tu saldo en {result.currency} ahora es <strong>{formatCurrency(Number(result.new_balance), result.currency)}</strong>.
      </p>
      <div className="op-success__actions">
        <Link to="/dashboard" className="btn btn--primary">
          Ver mi billetera
        </Link>
        <button type="button" className="btn btn--ghost" onClick={onAnother}>
          Hacer otra recarga
        </button>
      </div>
    </div>
  )
}

export default DepositPage
