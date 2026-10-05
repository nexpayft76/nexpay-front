/** "Anterior · Página 2 de 5 · Siguiente". No se muestra si todo entra en una página. */
function Pagination({
  page,
  limit,
  total,
  onChange,
}: {
  page: number
  limit: number
  total: number
  onChange: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / limit))
  if (pages <= 1) return null
  return (
    <nav className="pagination" aria-label="Paginación">
      <button type="button" className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Anterior
      </button>
      <span className="pagination__info">
        Página {page} de {pages}
      </span>
      <button type="button" className="btn btn--ghost btn--sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Siguiente
      </button>
    </nav>
  )
}

export default Pagination
