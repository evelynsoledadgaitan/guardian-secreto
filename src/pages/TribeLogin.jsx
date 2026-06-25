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
  const [activity, setActivity] = useState(null)
  const [participants, setParticipants] = useState([])
  const [selected, setSelected] = useState('')

  useEffect(() => {
    if (!tribe) return
    load()
  }, [tribeId])

  async function load() {
    setLoading(true)
    setError('')

    // Buscamos la actividad actualmente activa.
    const { data: activities, error: actErr } = await supabase
      .from('activities')
      .select('id, status, question')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)

    if (actErr) {
      setError('No se pudo conectar con el servidor. Intentá nuevamente.')
      setLoading(false)
      return
    }

    if (!activities || activities.length === 0) {
      setActivity(null)
      setParticipants([])
      setLoading(false)
      return
    }

    const current = activities[0]
    setActivity(current)

    const { data: people, error: pplErr } = await supabase
      .from('participants')
      .select('id, name, responded')
      .eq('activity_id', current.id)
      .eq('tribe', tribeId)
      .order('name', { ascending: true })

    if (pplErr) {
      setError('No se pudo cargar la lista de integrantes.')
    } else {
      setParticipants(people || [])
    }
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

        {!loading && !error && !activity && (
          <p className="mt-6 rounded-lg bg-white/5 p-4 text-sm text-ember-100/80">
            Todavía no hay una actividad activa. Esperá a que el Sabio la inicie.
          </p>
        )}

        {!loading && !error && activity && participants.length === 0 && (
          <p className="mt-6 rounded-lg bg-white/5 p-4 text-sm text-ember-100/80">
            Aún no hay integrantes cargados para tu tribu. Consultá con el Sabio.
          </p>
        )}

        {!loading && !error && activity && participants.length > 0 && (
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
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.responded ? ' (ya respondió)' : ''}
                </option>
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
