import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../common/Icon'
import { useOptionalAlerts } from '../../contexts/AlertsContext'
import './NotificationBell.css'

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, readNotification, removeNotification } = useOptionalAlerts()
  const recent = notifications

  async function handleNotificationClick(id: string) {
    await readNotification(id)
    setOpen(false)
  }

  return (
    <div className="notification-bell">
      <button
        type="button"
        className="icon-btn notification-bell__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="notification-panel"
        aria-label={unreadCount ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
        title="Notificaciones"
      >
        <Icon name="bell" size={21} />
        {unreadCount > 0 && <span className="notification-bell__count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <section id="notification-panel" className="notification-panel" aria-label="Notificaciones recientes">
          <header className="notification-panel__header">
            <h2>Notificaciones</h2>
          </header>
          {recent.length === 0 ? (
            <p className="notification-panel__empty">Cuando una tasa cumpla una de tus reglas, aparecerá aquí.</p>
          ) : (
            <ul className="notification-panel__list">
              {recent.map((notification) => (
                <li key={notification.id} className={!notification.read ? 'is-unread' : undefined}>
                  <button type="button" className="notification-panel__item" onClick={() => handleNotificationClick(notification.id)}>
                    <span className="notification-panel__dot" aria-hidden="true" />
                    <span>
                      <strong>{notification.title}</strong>
                      <small>{notification.message}</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="notification-panel__delete"
                    onClick={() => removeNotification(notification.id)}
                    aria-label={`Eliminar ${notification.title}`}
                    title="Eliminar notificación"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link to="/dashboard/configuracion/alertas" onClick={() => setOpen(false)} className="notification-panel__link">
            Administrar alertas <span aria-hidden="true">→</span>
          </Link>
        </section>
      )}
    </div>
  )
}

export default NotificationBell