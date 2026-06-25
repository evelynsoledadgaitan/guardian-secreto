import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, tribeInfo } from '../lib/supabaseClient.js'
import TribeBadge from '../components/TribeBadge.jsx'
import Loader from '../components/Loader.jsx'

const OPTION_KEYS = ['a', 'b', 'c', 'd']

export default function Quiz() {
  const { tribeId, participantId } = useParams()
  const tribe = tribeInfo(tribeId)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activity, setActivity] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    load()
  }, [participantId])

  async function load() {
    setLoading(true)
    setError('')

    const { data: person, error: pErr } = await supabase
      .from('participants')
      .select('id, name, responded, activity_id, tribe')
      .eq('id', participantId)
      .single()

    if (pErr || !person) {
      setError('No encontramos tu registro. Volvé a ingresar desde tu tribu.')
      setLoading(false)
      return
    }
    setParticipant(person)

    const { data: act, error: aErr } = await supabase
      .from('activities')
      .select('id, status, question, option_a, option_b, option_c, option_d')
      .eq('id', person.activity_id)
      .single()

    if (aErr || !act) {
      setError('No se pudo cargar la pregunta.')
      setLoading(false)
      return
    }
    setActivity(act)
    setLoading(false)
  }

  async function answer(optionKey) {
    if (submitting || participant?.responded || done) return
    setSubmitting(true)
    setError('')

    const { data, error: rpcErr } = await supabase.rpc('submit_response', {
      p_participant_id: participantId,
      p_option: optionKey
    })

    setSubmitting(false)

    if (rpcErr) {
      setError('Ocurrió un error al registrar tu respuesta. Probá de nuevo.')
      return
    }

    if (data === 'already_answered') {
      setDone(true)
      return
    }
    if (data === 'activity_closed') {
      setError('La actividad ya no acepta respuestas.')
      return
    }
    if (data === 'ok') {
      setDone(true)
    }
  }

  if (!tribe) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-ember-100">Tribu no encontrada. <Link className="underline" to="/">Volver</Link></p>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <Loader label="Preparando la pregunta…" />
      </main>
    )
  }

  if (error && !activity) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="card max-w-md">
          <p className="text-red-200">{error}</p>
          <Link to={`/tribu/${tribeId}`} className="btn-ghost mt-6 inline-block">Volver</Link>
        </div>
      </main>
    )
  }

  const alreadyAnswered = participant?.responded || done

  if (activity?.status !== 'active' && !alreadyAnswered) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="card max-w-md animate-fade-up">
          <p className="font-display text-xl text-ember-100">
            La actividad ha finalizado.
          </p>
          <Link to="/" className="btn-ghost mt-6 inline-block">Volver al inicio</Link>
        </div>
      </main>
    )
  }

  if (alreadyAnswered) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="card max-w-md animate-fade-up">
          <span className="text-4xl">🛡️</span>
          <p className="mt-4 font-display text-xl text-ember-100">
            Ya registraste tu respuesta.
          </p>
          <p className="mt-2 text-sm text-ember-100/60">
            Gracias por participar, {participant?.name}. Esperá el anuncio del Sabio.
          </p>
          <Link to="/" className="btn-ghost mt-6 inline-block">Volver al inicio</Link>
        </div>
      </main>
    )
  }

  const options = [
    { key: 'a', text: activity.option_a },
    { key: 'b', text: activity.option_b },
    { key: 'c', text: activity.option_c },
    { key: 'd', text: activity.option_d }
  ]

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg animate-fade-up">
        <div className="flex items-center justify-between">
          <TribeBadge tribeId={tribeId}>{tribe.label}</TribeBadge>
          <span className="text-xs text-ember-100/60">{participant?.name}</span>
        </div>

        <h1 className="mt-5 font-display text-xl font-bold leading-snug text-ember-50 sm:text-2xl">
          {activity.question}
        </h1>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-200">{error}</p>
        )}

        <div className="mt-8 grid gap-3">
          {options.map((opt, i) => (
            <button
              key={opt.key}
              disabled={submitting}
              onClick={() => answer(opt.key)}
              style={{ animationDelay: `${i * 70}ms` }}
              className="animate-fade-up flex items-center gap-4 rounded-2xl border border-white/10 bg-night-700/70 px-5 py-5 text-left text-base font-semibold text-ember-50 transition-all duration-150 hover:-translate-y-0.5 hover:border-ember-300 hover:bg-ember-500/10 disabled:opacity-50"
            >
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ember-500/20 font-display text-sm font-bold text-ember-300">
                {OPTION_KEYS.indexOf(opt.key) > -1 ? opt.key.toUpperCase() : ''}
              </span>
              <span>{opt.text}</span>
            </button>
          ))}
        </div>

        {submitting && <p className="mt-4 text-center text-xs text-ember-100/60">Registrando tu respuesta…</p>}
      </div>
    </main>
  )
}
