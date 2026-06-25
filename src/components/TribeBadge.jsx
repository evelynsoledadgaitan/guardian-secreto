const STYLES = {
  mapuche: 'bg-mapuche/15 text-violet-200 border-mapuche/50',
guarani: 'bg-guarani/15 text-lime-200 border-guarani/50',
mocovi: 'bg-mocovi/15 text-orange-200 border-mocovi/50'
}

export default function TribeBadge({ tribeId, children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${STYLES[tribeId] || ''} ${className}`}
    >
      {children}
    </span>
  )
}
