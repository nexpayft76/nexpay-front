import { Link } from 'react-router-dom'
import Icon, { type IconName } from '../../components/common/Icon'

interface ComingSoonProps {
  title: string
  description: string
  icon: IconName
}

/** Pantalla para las secciones del menú que todavía no están construidas. */
function ComingSoon({ title, description, icon }: ComingSoonProps) {
  return (
    <section className="dashboard-content" aria-labelledby="coming-soon-title">
      <div className="coming-soon">
        <span className="coming-soon__icon">
          <Icon name={icon} size={32} />
        </span>
        <p className="dashboard-eyebrow">Próximamente</p>
        <h1 id="coming-soon-title">{title}</h1>
        <p>{description}</p>
        <Link to="/dashboard" className="btn btn--ghost">
          Volver a mi wallet
        </Link>
      </div>
    </section>
  )
}

export default ComingSoon
