export default function Loader({ label = 'Cargando…' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-ember-200">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-ember-500/30 border-t-ember-300" />
      <p className="label-eyebrow">{label}</p>
    </div>
  )
}
