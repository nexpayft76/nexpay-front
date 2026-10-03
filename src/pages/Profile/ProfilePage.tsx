import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/common/Icon'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import type { UpdateProfilePayload } from '../../types/user'
import CloseAccountSection from './CloseAccountSection'
import ProfileDetails from './ProfileDetails'
import ProfileEditForm from './ProfileEditForm'
import './ProfilePage.css'

/** Configuración → Usuario: ver y editar nombre y email, y cerrar la cuenta. */
function ProfilePage() {
  useDocumentTitle('Usuario')
  // Al cerrar sesión o la cuenta, el usuario queda en null y ProtectedRoute redirige solo al login.
  const { user, logout, updateProfile, closeAccount } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(payload: UpdateProfilePayload) {
    await updateProfile(payload)
    setEditing(false)
    setSaved(true)
  }

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
        {saved && <p className="profile-page__saved" role="status">✓ Datos actualizados.</p>}

        {!user ? (
          <p role="status">No se pudieron cargar los datos de tu cuenta.</p>
        ) : editing ? (
          <ProfileEditForm user={user} onSave={handleSave} onCancel={() => setEditing(false)} />
        ) : (
          <ProfileDetails user={user} />
        )}

        <div className="profile-page__actions">
          {user && !editing && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setSaved(false)
                setEditing(true)
              }}
            >
              <Icon name="edit" size={18} /> Editar datos
            </button>
          )}
          <Link to="/dashboard/configuracion/preferencias" className="btn btn--ghost">
            <Icon name="settings" size={18} /> Ir a Preferencias
          </Link>
          <button type="button" className="btn btn--ghost" onClick={logout}>
            <Icon name="logout" size={18} /> Cerrar sesión
          </button>
        </div>

        {user && <CloseAccountSection onClose={closeAccount} />}
      </div>
    </section>
  )
}

export default ProfilePage
