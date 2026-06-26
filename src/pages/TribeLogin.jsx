import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase, tribeInfo } from '../lib/supabaseClient.js'
import TribeBadge from '../components/TribeBadge.jsx'
import Loader from '../components/Loader.jsx'

export default function TribeLogin() {
  const { tribeId } = useParams()
  const navigate = useNavigate()
  const tribe = tribeInfo(tribeId)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasActiveActivity, setHasActiveActivity] = useState(false)
  const [members, setMembers] = useState([])
  const [selected, setSelected] = useState('')

  useEffect(() => {
    if (!tribe) return
    load()
  }, [tribeId])

  async function load() {
    setLoading(true)
    setError('')

    const { data: people, error: pplErr } = await supabase
      .from('tribe_members')
      .select('id, name')
      .eq('tribe', tribeId)
      .order('name', { ascending: true })

    if (pplErr) {
      setError('No se pudo cargar la lista de integrantes.')
      setLoading(false)
      return
    }
    setMembers(people || [])

    const { data: activities } = await supabase
      .from('activities')
      .select('id')
      .eq('status', 'active')
      .limit(1)

    setHasActiveActivity(Boolean(activities && activities.length > 0))
    setLoading(false)
  }

  function handleContinue() {
    if (!selected) return
    navigate(`/responder/${tribeId}/${selected}`)
  }

  if (!tribe) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-ember-100">Tribu no encontrada. <Link className="underline" to="/">Volver</Link></p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md animate-fade-up card">
        <TribeBadge tribeId={tribe.id}>{tribe.label}</TribeBadge>
        <h1 className="mt-4 font-display text-2xl font-bold text-ember-50">
          Tribu {tribe.plural}
        </h1>

        {loading && <Loader label="Buscando la actividad…" />}

        {!loading && error && (
          <p className="mt-6 rounded-lg bg-red-500/10 p-4 text-sm text-red-200">{error}</p>
        )}

        {!loading && !error && !hasActiveActivity && (
          <p className="mt-6 rounded-lg bg-white/5 p-4 text-sm text-ember-100/80">
            Todavía no hay una actividad activa. Esperá a que el Sabio la inicie.
          </p>
        )}

        {!loading && !error && members.length === 0 && (
          <p className="mt-6 rounded-lg bg-white/5 p-4 text-sm text-ember-100/80">
            Aún no hay integrantes cargados para tu tribu. Consultá con el Sabio.
          </p>
        )}

        {!loading && !error && members.length > 0 && (
          <div className="mt-6 flex flex-col gap-4">
            <label className="label-eyebrow" htmlFor="participant">
              Seleccioná tu nombre
            </label>
            <select
              id="participant"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="rounded-xl border border-white/10 bg-night-700 px-4 py-3 text-ember-50 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ember-300"
            >
              <option value="">-- Elegí tu nombre --</option>
              {members.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <button onClick={handleContinue} disabled={!selected} className="btn-primary">
              Continuar
            </button>
          </div>
        )}

        <Link to="/" className="mt-6 block text-center text-xs text-ember-100/50 hover:text-ember-100">
          ← Volver al inicio
        </Link>
      </div>
    </main>
  )
}