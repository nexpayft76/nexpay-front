import { useEffect } from 'react'
import Icon from '../common/Icon'
import { useOptionalAlerts } from '../../contexts/AlertsContext'
import './NotificationToast.css'

function NotificationToast() {
  const { toastNotification, dismissToast } = useOptionalAlerts()

  useEffect(() => {
    if (!toastNotification) return
    const timer = window.setTimeout(dismissToast, 3_000)
    return () => window.clearTimeout(timer)
  }, [toastNotification, dismissToast])

  if (!toastNotification) return null

  return (
    <div className="notification-toast" role="status" aria-live="polite">
      <span className="notification-toast__icon" aria-hidden="true"><Icon name="bell" size={18} /></span>
      <span className="notification-toast__copy">
        <strong>{toastNotification.title}</strong>
        <small>{toastNotification.message}</small>
      </span>
      <button type="button" className="notification-toast__close" onClick={dismissToast} aria-label="Cerrar notificación" title="Cerrar">
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}

export default NotificationToast