import type { AuthUser } from '../../types/auth'
import { formatMemberSince, initials, statusLabel } from '../../utils/profile'

/** Datos de la cuenta en solo lectura. No conoce la sesión: recibe el usuario por props. */
function ProfileDetails({ user }: { user: AuthUser }) {
  return (
    <section className="profile-card" aria-labelledby="profile-card-title">
      <div className="profile-card__identity">
        <span className="profile-card__avatar" aria-hidden="true">{initials(user.full_name)}</span>
        <div className="profile-card__names">
          <h2 id="profile-card-title">{user.full_name}</h2>
          <p>{user.email}</p>
        </div>
        <span className={`profile-status profile-status--${user.status}`}>{statusLabel(user.status)}</span>
      </div>

      <dl className="profile-card__list">
        <div>
          <dt>Nombre completo</dt>
          <dd>{user.full_name}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Estado de la cuenta</dt>
          <dd>{statusLabel(user.status)}</dd>
        </div>
        <div>
          <dt>Miembro desde</dt>
          <dd>{formatMemberSince(user.created_at)}</dd>
        </div>
      </dl>
    </section>
  )
}

export default ProfileDetails
