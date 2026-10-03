import { Link } from 'react-router-dom'
import Icon from '../../components/common/Icon'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import ProfileDetails from './ProfileDetails'
import './ProfilePage.css'

/** Configuración → Usuario. Por ahora solo lectura: editar datos y cerrar la cuenta necesitan endpoints /me en el back. */
function ProfilePage() {
  useDocumentTitle('Usuario')
  // Al cerrar sesión el usuario queda en null y ProtectedRoute redirige solo al login.
  const { user, logout } = useAuth()

  return (
    <section className="dashboard-content profile-page" aria-labelledby="profile-title">
      <header className="profile-page__hero">
        <div>
          <p className="dashboard-eyebrow">Configuración</p>
          <h1 id="profile-title">Tu usuario</h1>
          <p>Estos son los datos de tu cuenta de NexPay.</p>
        </div>
        <div className="profile-page__mark" aria-hidden="true"><Icon name="user" size={24} /></div>
      </header>

      <div className="profile-page__body">
        {user ? <ProfileDetails user={user} /> : <p role="status">No se pudieron cargar los datos de tu cuenta.</p>}

        <div className="profile-page__actions">
          <Link to="/dashboard/configuracion/preferencias" className="btn btn--ghost">
            <Icon name="settings" size={18} /> Ir a Preferencias
          </Link>
          <button type="button" className="btn btn--ghost" onClick={logout}>
            <Icon name="logout" size={18} /> Cerrar sesión
          </button>
        </div>
      </div>
    </section>
  )
}

export default ProfilePage
