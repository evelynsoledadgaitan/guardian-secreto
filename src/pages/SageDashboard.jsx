import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, TRIBES } from '../lib/supabaseClient.js'
import TribeBadge from '../components/TribeBadge.jsx'
import Loader from '../components/Loader.jsx'

const EMPTY_FORM = { question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a' }

export default function SageDashboard() {
  const navigate = useNavigate()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [savingActivity, setSavingActivity] = useState(false)
  const [participants, setParticipants] = useState([])
  const [bulkText, setBulkText] = useState('')
  const [bulkTribe, setBulkTribe] = useState('mapuche')
  const [singleName, setSingleName] = useState('')
  const [singleTribe, setSingleTribe] = useState('mapuche')
  const [notice, setNotice] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [revealStage, setRevealStage] = useState(1)
  const [responses, setResponses] = useState([])

  // --- Auth guard -----------------------------------------------------
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/sabio')
      } else {
        setCheckingAuth(false)
      }
    })
  }, [navigate])

  // --- Cargar actividad más reciente -----------------------------------
  const loadActivity = useCallback(async () => {
    setLoading(true)
    const { data: acts } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    const current = acts && acts[0] ? acts[0] : null
    setActivity(current)
    if (current) {
      setForm({
        question: current.question || '',
        option_a: current.option_a || '',
        option_b: current.option_b || '',
        option_c: current.option_c || '',
        option_d: current.option_d || '',
        correct_option: current.correct_option || 'a'
      })
      await loadParticipants(current.id)
    } else {
      setParticipants([])
    }
    setLoading(false)
  }, [])

  const loadParticipants = useCallback(async (activityId) => {
    const { data } = await supabase
      .from('participants')
      .select('id, name, tribe, responded')
      .eq('activity_id', activityId)
      .order('tribe', { ascending: true })
      .order('name', { ascending: true })
    setParticipants(data || [])
  }, [])

  useEffect(() => {
    if (!checkingAuth) loadActivity()
  }, [checkingAuth, loadActivity])

  // --- Realtime: refrescar conteos mientras la actividad está activa ---
  useEffect(() => {
    if (!activity || activity.status !== 'active') return
    const channel = supabase
      .channel(`activity-${activity.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `activity_id=eq.${activity.id}` },
        () => loadParticipants(activity.id))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [activity, loadParticipants])

  function flash(msg) {
    setNotice(msg)
    setTimeout(() => setNotice(''), 3500)
  }

  // --- Crear / editar actividad -----------------------------------------
  async function saveActivity(e) {
    e.preventDefault()
    setSavingActivity(true)

    const payload = { ...form }

    let result
    if (activity && activity.status === 'draft') {
      result = await supabase.from('activities').update(payload).eq('id', activity.id).select().single()
    } else {
      result = await supabase.from('activities').insert({ ...payload, status: 'draft' }).select().single()
    }

    setSavingActivity(false)
    if (result.error) {
      flash('No se pudo guardar la actividad.')
      return
    }
    setActivity(result.data)
    flash('Actividad guardada.')
  }

  // --- Participantes ------------------------------------------------------
  async function addSingleParticipant() {
    if (!activity || !singleName.trim()) return
    const { error } = await supabase.from('participants').insert({
      activity_id: activity.id,
      tribe: singleTribe,
      name: singleName.trim()
    })
    if (error) {
      flash('No se pudo agregar el integrante.')
      return
    }
    setSingleName('')
    loadParticipants(activity.id)
  }

  async function addBulkParticipants() {
    if (!activity || !bulkText.trim()) return
    const names = bulkText
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean)

    if (names.length === 0) return

    const rows = names.map((name) => ({ activity_id: activity.id, tribe: bulkTribe, name }))
    const { error } = await supabase.from('participants').insert(rows)
    if (error) {
      flash('No se pudo cargar la lista.')
      return
    }
    setBulkText('')
    loadParticipants(activity.id)
    flash(`${names.length} integrantes agregados a ${bulkTribe}.`)
  }

  async function updateParticipantName(id, name) {
    await supabase.from('participants').update({ name }).eq('id', id)
    if (activity) loadParticipants(activity.id)
  }

  async function deleteParticipant(id) {
    await supabase.from('participants').delete().eq('id', id)
    if (activity) loadParticipants(activity.id)
  }

  // --- Ciclo de vida de la actividad --------------------------------------
  async function startActivity() {
    if (!activity) return
    const { data, error } = await supabase
      .from('activities')
      .update({ status: 'active' })
      .eq('id', activity.id)
      .select()
      .single()
    if (error) {
      flash('No se pudo iniciar la actividad.')
      return
    }
    setActivity(data)
    flash('¡Actividad iniciada!')
  }

  async function closeActivity() {
    if (!activity) return
    const { data, error } = await supabase
      .from('activities')
      .update({ status: 'closed' })
      .eq('id', activity.id)
      .select()
      .single()
    if (error) {
      flash('No se pudo cerrar la actividad.')
      return
    }
    setActivity(data)
    setShowResults(false)
    flash('Actividad cerrada.')
  }

  async function resetActivity() {
    if (!confirm('Esto creará una nueva actividad en blanco para otro curso. ¿Continuar?')) return
    setActivity(null)
    setParticipants([])
    setForm(EMPTY_FORM)
    setShowResults(false)
    setRevealStage(1)
    flash('Listo para configurar una nueva actividad.')
  }

  async function viewResults() {
    if (!activity) return
    const { data } = await supabase
      .from('responses')
      .select('tribe, option_chosen, is_correct')
      .eq('activity_id', activity.id)
    setResponses(data || [])
    setShowResults(true)
    setRevealStage(1)
  }

  async function logout() {
    await supabase.auth.signOut()
    navigate('/sabio')
  }

  // --- Derivados ----------------------------------------------------------
  const counts = useMemo(() => {
    const map = {}
    TRIBES.forEach((t) => {
      const all = participants.filter((p) => p.tribe === t.id)
      map[t.id] = {
        total: all.length,
        responded: all.filter((p) => p.responded).length
      }
    })
    return map
  }, [participants])

  const resultsByTribe = useMemo(() => {
    const map = {}
    TRIBES.forEach((t) => {
      const rs = responses.filter((r) => r.tribe === t.id)
      const opts = { a: 0, b: 0, c: 0, d: 0 }
      rs.forEach((r) => { opts[r.option_chosen] = (opts[r.option_chosen] || 0) + 1 })
      const correct = rs.filter((r) => r.is_correct).length
      map[t.id] = {
        opts,
        total: rs.length,
        correct,
        pct: rs.length ? Math.round((correct / rs.length) * 100) : 0
      }
    })
    return map
  }, [responses])

  const winner = useMemo(() => {
    const entries = TRIBES.map((t) => ({ id: t.id, ...resultsByTribe[t.id] }))
    const max = Math.max(...entries.map((e) => e.correct || 0))
    const top = entries.filter((e) => (e.correct || 0) === max && max > 0)
    return { top, max }
  }, [resultsByTribe])

  const totals = useMemo(() => {
    const totalParticipants = participants.length
    const totalResponses = responses.length
    const totalCorrect = responses.filter((r) => r.is_correct).length
    return {
      totalParticipants,
      totalResponses,
      totalCorrect,
      totalIncorrect: totalResponses - totalCorrect,
      pct: totalResponses ? Math.round((totalCorrect / totalResponses) * 100) : 0
    }
  }, [participants, responses])

  if (checkingAuth || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader label="Cargando panel del Sabio…" />
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-8">
      <header className="mx-auto flex max-w-4xl items-center justify-between">
        <div>
          <span className="label-eyebrow">Panel del</span>
          <h1 className="font-display text-2xl font-bold text-ember-50">Sabio</h1>
        </div>
        <div className="flex gap-3">
          <Link to="/" className="btn-ghost text-sm">Ver inicio</Link>
          <button onClick={logout} className="btn-ghost text-sm">Salir</button>
        </div>
      </header>

      {notice && (
        <div className="mx-auto mt-4 max-w-4xl animate-fade-up rounded-xl bg-ember-500/15 px-4 py-3 text-sm text-ember-100">
          {notice}
        </div>
      )}

      <div className="mx-auto mt-8 max-w-4xl space-y-8">
        {/* Estado actual */}
        <section className="card flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="label-eyebrow">Estado de la actividad</span>
            <p className="mt-1 font-display text-xl font-bold text-ember-50 capitalize">
              {activity ? STATUS_LABEL[activity.status] : 'Sin actividad creada'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {activity?.status === 'draft' && (
              <button onClick={startActivity} className="btn-primary">Iniciar actividad</button>
            )}
            {activity?.status === 'active' && (
              <button onClick={closeActivity} className="btn-primary">Cerrar actividad</button>
            )}
            {activity?.status === 'closed' && (
              <>
                <button onClick={viewResults} className="btn-primary">Ver resultados</button>
                <button onClick={resetActivity} className="btn-ghost">Reiniciar para otro curso</button>
              </>
            )}
          </div>
        </section>

        {/* Configuración de la pregunta */}
        {(!activity || activity.status === 'draft') && (
          <section className="card animate-fade-up">
            <span className="label-eyebrow">Configurar pregunta</span>
            <form onSubmit={saveActivity} className="mt-4 flex flex-col gap-4">
              <textarea
                required
                placeholder="Escribí la pregunta de opción múltiple"
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                className="min-h-[80px] rounded-xl border border-white/10 bg-night-700 px-4 py-3 text-ember-50 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ember-300"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                {['a', 'b', 'c', 'd'].map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-ember-500/20 font-display font-bold text-ember-300">
                      {key.toUpperCase()}
                    </span>
                    <input
                      required
                      placeholder={`Opción ${key.toUpperCase()}`}
                      value={form[`option_${key}`]}
                      onChange={(e) => setForm((f) => ({ ...f, [`option_${key}`]: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-night-700 px-3 py-2 text-ember-50 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ember-300"
                    />
                  </div>
                ))}
              </div>

              <div>
                <span className="label-eyebrow">Respuesta correcta</span>
                <div className="mt-2 flex gap-2">
                  {['a', 'b', 'c', 'd'].map((key) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setForm((f) => ({ ...f, correct_option: key }))}
                      className={`h-10 w-10 rounded-lg font-display font-bold transition-colors ${
                        form.correct_option === key
                          ? 'bg-jade-500 text-night-900'
                          : 'bg-night-700 text-ember-100 hover:bg-night-600'
                      }`}
                    >
                      {key.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={savingActivity} className="btn-primary self-start">
                {savingActivity ? 'Guardando…' : activity ? 'Guardar cambios' : 'Crear actividad'}
              </button>
            </form>
          </section>
        )}

        {/* Carga de participantes */}
        {activity && activity.status === 'draft' && (
          <section className="card animate-fade-up">
            <span className="label-eyebrow">Participantes</span>

            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-ember-100">Agregar uno por uno</p>
                <div className="mt-2 flex flex-col gap-2">
                  <select
                    value={singleTribe}
                    onChange={(e) => setSingleTribe(e.target.value)}
                    className="rounded-xl border border-white/10 bg-night-700 px-3 py-2 text-ember-50"
                  >
                    {TRIBES.map((t) => (
                      <option key={t.id} value={t.id}>{t.plural}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      placeholder="Nombre y apellido"
                      value={singleName}
                      onChange={(e) => setSingleName(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-night-700 px-3 py-2 text-ember-50"
                    />
                    <button onClick={addSingleParticipant} className="btn-ghost">Agregar</button>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-ember-100">Pegar lista completa</p>
                <div className="mt-2 flex flex-col gap-2">
                  <select
                    value={bulkTribe}
                    onChange={(e) => setBulkTribe(e.target.value)}
                    className="rounded-xl border border-white/10 bg-night-700 px-3 py-2 text-ember-50"
                  >
                    {TRIBES.map((t) => (
                      <option key={t.id} value={t.id}>{t.plural}</option>
                    ))}
                  </select>
                  <textarea
                    placeholder={'Un nombre por línea\nJuan Pérez\nAna Gómez'}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="min-h-[88px] rounded-xl border border-white/10 bg-night-700 px-3 py-2 text-ember-50"
                  />
                  <button onClick={addBulkParticipants} className="btn-ghost self-start">Cargar lista</button>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {TRIBES.map((t) => (
                <div key={t.id}>
                  <TribeBadge tribeId={t.id}>{t.plural} ({participants.filter((p) => p.tribe === t.id).length})</TribeBadge>
                  <ul className="mt-2 divide-y divide-white/5 rounded-xl border border-white/5">
                    {participants.filter((p) => p.tribe === t.id).map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <input
                          defaultValue={p.name}
                          onBlur={(e) => {
                            if (e.target.value.trim() && e.target.value !== p.name) {
                              updateParticipantName(p.id, e.target.value.trim())
                            }
                          }}
                          className="w-full bg-transparent text-sm text-ember-50 outline-none"
                        />
                        <button onClick={() => deleteParticipant(p.id)} className="text-xs text-red-300 hover:text-red-200">
                          Eliminar
                        </button>
                      </li>
                    ))}
                    {participants.filter((p) => p.tribe === t.id).length === 0 && (
                      <li className="px-3 py-2 text-xs text-ember-100/40">Sin integrantes cargados.</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tablero en vivo */}
        {activity && activity.status === 'active' && (
          <section className="card animate-fade-up">
            <span className="label-eyebrow">Tablero en vivo</span>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-ember-100/60">
                    <th className="py-2">Tribu</th>
                    <th className="py-2">Respondieron</th>
                    <th className="py-2">Pendientes</th>
                  </tr>
                </thead>
                <tbody>
                  {TRIBES.map((t) => (
                    <tr key={t.id} className="border-t border-white/5">
                      <td className="py-3"><TribeBadge tribeId={t.id}>{t.plural}</TribeBadge></td>
                      <td className="py-3 font-display text-lg text-jade-400">{counts[t.id]?.responded ?? 0}</td>
                      <td className="py-3 font-display text-lg text-ember-300">
                        {(counts[t.id]?.total ?? 0) - (counts[t.id]?.responded ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <Stat label="Participantes" value={participants.length} />
              <Stat label="Respondieron" value={participants.filter((p) => p.responded).length} />
              <Stat label="Pendientes" value={participants.filter((p) => !p.responded).length} />
            </div>
          </section>
        )}

        {/* Resultados */}
        {activity && activity.status === 'closed' && showResults && (
          <ResultsView
            stage={revealStage}
            onContinue={() => setRevealStage(2)}
            resultsByTribe={resultsByTribe}
            winner={winner}
            totals={totals}
            activity={activity}
          />
        )}
      </div>
    </main>
  )
}

const STATUS_LABEL = { draft: 'En preparación', active: 'Activa — recibiendo respuestas', closed: 'Finalizada' }

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-white/5 px-4 py-4">
      <p className="font-display text-2xl font-bold text-ember-50">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-ember-100/50">{label}</p>
    </div>
  )
}

function ResultsView({ stage, onContinue, resultsByTribe, winner, totals, activity }) {
  const optionLabel = { a: activity.option_a, b: activity.option_b, c: activity.option_c, d: activity.option_d }

  if (stage === 1) {
    return (
      <section className="card animate-fade-up">
        <span className="label-eyebrow">Resumen de respuestas</span>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          {TRIBES.map((t) => {
            const r = resultsByTribe[t.id]
            return (
              <div key={t.id}>
                <TribeBadge tribeId={t.id}>{t.plural}</TribeBadge>
                <ul className="mt-3 space-y-1 text-sm text-ember-100/80">
                  {['a', 'b', 'c', 'd'].map((k) => (
                    <li key={k} className="flex justify-between">
                      <span>Opción {k.toUpperCase()}</span>
                      <span className="font-semibold text-ember-50">{r.opts[k]}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-ember-100/50">Total: {r.total} respuestas</p>
              </div>
            )
          })}
        </div>
        <button onClick={onContinue} className="btn-primary mt-8">Continuar</button>
      </section>
    )
  }

  return (
    <section className="card animate-fade-up text-center">
      <span className="label-eyebrow">Respuesta correcta</span>
      <p className="mt-3 animate-reveal font-display text-3xl font-black text-jade-400">
        ✅ OPCIÓN {activity.correct_option.toUpperCase()} — {optionLabel[activity.correct_option]}
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {TRIBES.map((t) => {
          const r = resultsByTribe[t.id]
          return (
            <div key={t.id} className="rounded-xl bg-white/5 p-4">
              <TribeBadge tribeId={t.id}>{t.plural}</TribeBadge>
              <p className="mt-3 font-display text-2xl font-bold text-ember-50">{r.correct}</p>
              <p className="text-xs text-ember-100/50">correctas · {r.pct}% de aciertos</p>
            </div>
          )
        })}
      </div>

      <div className="mt-10 animate-reveal rounded-2xl border border-ember-300/40 bg-ember-500/10 p-6">
        {winner.max === 0 ? (
          <p className="font-display text-xl text-ember-100">Nadie respondió correctamente todavía.</p>
        ) : winner.top.length > 1 ? (
          <>
            <p className="text-3xl">🏆</p>
            <p className="mt-2 font-display text-2xl font-black text-ember-50">EMPATE</p>
            <p className="mt-1 text-sm text-ember-100/70">
              entre {winner.top.map((w) => TRIBES.find((t) => t.id === w.id).plural).join(' y ')}
            </p>
          </>
        ) : (
          <>
            <p className="text-3xl">🏆</p>
            <p className="mt-2 label-eyebrow">Tribu ganadora</p>
            <p className="mt-1 font-display text-3xl font-black text-ember-50">
              {TRIBES.find((t) => t.id === winner.top[0].id).plural}
            </p>
            <p className="mt-1 text-sm text-ember-100/70">
              {winner.top[0].correct} respuestas correctas · {winner.top[0].pct}% de aciertos
            </p>
          </>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Participantes" value={totals.totalParticipants} />
        <Stat label="Respuestas" value={totals.totalResponses} />
        <Stat label="Correctas" value={totals.totalCorrect} />
        <Stat label="Incorrectas" value={totals.totalIncorrect} />
      </div>
      <p className="mt-4 text-sm text-ember-100/60">Porcentaje general de aciertos: {totals.pct}%</p>
    </section>
  )
}
