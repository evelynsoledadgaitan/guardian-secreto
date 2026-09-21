import { useEffect, useMemo, useState, useCallback } from 'react'
import * as XLSX from 'xlsx-js-style'
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
  const [members, setMembers] = useState([])
  const [activityResponses, setActivityResponses] = useState([])
  const [bulkText, setBulkText] = useState('')
  const [bulkTribe, setBulkTribe] = useState('mapuche')
  const [singleName, setSingleName] = useState('')
  const [singleTribe, setSingleTribe] = useState('mapuche')
  const [notice, setNotice] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [revealStage, setRevealStage] = useState(1)
  const [responsesForResults, setResponsesForResults] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate('/sabio') } else { setCheckingAuth(false) }
    })
  }, [navigate])

  const loadMembers = useCallback(async () => {
    const { data } = await supabase.from('tribe_members').select('id, name, tribe').order('tribe', { ascending: true }).order('name', { ascending: true })
    setMembers(data || [])
  }, [])

  const loadActivity = useCallback(async () => {
    setLoading(true)
    const { data: acts } = await supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(1)
    const current = acts && acts[0] ? acts[0] : null
    setActivity(current)
    if (current) {
      setForm({ question: current.question || '', option_a: current.option_a || '', option_b: current.option_b || '', option_c: current.option_c || '', option_d: current.option_d || '', correct_option: current.correct_option || 'a' })
      if (current.status === 'active') await loadActivityResponses(current.id)
    }
    await loadMembers()
    setLoading(false)
  }, [loadMembers])

  const loadActivityResponses = useCallback(async (activityId) => {
    const { data } = await supabase.from('member_responses').select('member_id').eq('activity_id', activityId)
    setActivityResponses(data || [])
  }, [])

  useEffect(() => { if (!checkingAuth) loadActivity() }, [checkingAuth, loadActivity])

  useEffect(() => {
    if (!activity || activity.status !== 'active') return
    const channel = supabase.channel(`activity-${activity.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_responses', filter: `activity_id=eq.${activity.id}` }, () => loadActivityResponses(activity.id))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [activity, loadActivityResponses])

  function flash(msg) { setNotice(msg); setTimeout(() => setNotice(''), 3500) }

  async function saveActivity(e) {
    e.preventDefault(); setSavingActivity(true)
    const payload = { ...form }
    let result
    if (activity && activity.status === 'draft') {
      result = await supabase.from('activities').update(payload).eq('id', activity.id).select().single()
    } else {
      result = await supabase.from('activities').insert({ ...payload, status: 'draft' }).select().single()
    }
    setSavingActivity(false)
    if (result.error) { flash('No se pudo guardar la actividad.'); return }
    setActivity(result.data); flash('Actividad guardada.')
  }

  async function addSingleMember() {
    if (!singleName.trim()) return
    const { error } = await supabase.from('tribe_members').insert({ tribe: singleTribe, name: singleName.trim() })
    if (error) { flash('No se pudo agregar el integrante.'); return }
    setSingleName(''); loadMembers()
  }

  async function addBulkMembers() {
    if (!bulkText.trim()) return
    const names = bulkText.split('\n').map((n) => n.trim()).filter(Boolean)
    if (names.length === 0) return
    const { error } = await supabase.from('tribe_members').insert(names.map((name) => ({ tribe: bulkTribe, name })))
    if (error) { flash('No se pudo cargar la lista.'); return }
    setBulkText(''); loadMembers(); flash(`${names.length} integrantes agregados.`)
  }

  async function updateMemberName(id, name) { await supabase.from('tribe_members').update({ name }).eq('id', id); loadMembers() }
  async function deleteMember(id) { await supabase.from('tribe_members').delete().eq('id', id); loadMembers() }

  async function startActivity() {
    if (!activity) return
    const { data, error } = await supabase.from('activities').update({ status: 'active' }).eq('id', activity.id).select().single()
    if (error) { flash('No se pudo iniciar la actividad.'); return }
    setActivity(data); setActivityResponses([]); flash('¡Actividad iniciada!')
  }

  async function closeActivity() {
    if (!activity) return
    const { data, error } = await supabase.from('activities').update({ status: 'closed' }).eq('id', activity.id).select().single()
    if (error) { flash('No se pudo cerrar la actividad.'); return }
    setActivity(data); setShowResults(false); flash('Actividad cerrada.')
  }

  async function resetActivity() {
    if (!confirm('Esto crea una pregunta nueva en blanco. Los integrantes se mantienen guardados. ¿Continuar?')) return
    setActivity(null); setForm(EMPTY_FORM); setShowResults(false); setRevealStage(1)
    flash('Listo para configurar una nueva pregunta.')
  }

  async function viewResults() {
    if (!activity) return
    const { data } = await supabase.from('member_responses').select('tribe, option_chosen, is_correct').eq('activity_id', activity.id)
    setResponsesForResults(data || []); setShowResults(true); setRevealStage(1)
  }

  async function logout() { await supabase.auth.signOut(); navigate('/sabio') }

  const respondedMemberIds = useMemo(() => new Set(activityResponses.map((r) => r.member_id)), [activityResponses])

  const counts = useMemo(() => {
    const map = {}
    TRIBES.forEach((t) => {
      const all = members.filter((m) => m.tribe === t.id)
      map[t.id] = { total: all.length, responded: all.filter((m) => respondedMemberIds.has(m.id)).length }
    })
    return map
  }, [members, respondedMemberIds])

  const resultsByTribe = useMemo(() => {
    const map = {}
    TRIBES.forEach((t) => {
      const rs = responsesForResults.filter((r) => r.tribe === t.id)
      const opts = { a: 0, b: 0, c: 0, d: 0 }
      rs.forEach((r) => { opts[r.option_chosen] = (opts[r.option_chosen] || 0) + 1 })
      const correct = rs.filter((r) => r.is_correct).length
      map[t.id] = { opts, total: rs.length, correct, pct: rs.length ? Math.round((correct / rs.length) * 100) : 0 }
    })
    return map
  }, [responsesForResults])

  const winner = useMemo(() => {
    const entries = TRIBES.map((t) => ({ id: t.id, ...resultsByTribe[t.id] }))
    const max = Math.max(...entries.map((e) => e.correct || 0))
    const top = entries.filter((e) => (e.correct || 0) === max && max > 0)
    return { top, max }
  }, [resultsByTribe])

  const totals = useMemo(() => {
    const totalParticipants = members.length
    const totalResponses = responsesForResults.length
    const totalCorrect = responsesForResults.filter((r) => r.is_correct).length
    return { totalParticipants, totalResponses, totalCorrect, totalIncorrect: totalResponses - totalCorrect, pct: totalResponses ? Math.round((totalCorrect / totalResponses) * 100) : 0 }
  }, [members, responsesForResults])

  if (checkingAuth || loading) return <main className="flex min-h-screen items-center justify-center"><Loader label="Cargando panel del Sabio…" /></main>

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

      {notice && <div className="mx-auto mt-4 max-w-4xl animate-fade-up rounded-xl bg-ember-500/15 px-4 py-3 text-sm text-ember-100">{notice}</div>}

      <div className="mx-auto mt-8 max-w-4xl space-y-8">
        <section className="card flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="label-eyebrow">Estado de la actividad</span>
            <p className="mt-1 font-display text-xl font-bold text-ember-50 capitalize">{activity ? STATUS_LABEL[activity.status] : 'Sin actividad creada'}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {activity?.status === 'draft' && <button onClick={startActivity} className="btn-primary">Iniciar actividad</button>}
            {activity?.status === 'active' && <button onClick={closeActivity} className="btn-primary">Cerrar actividad</button>}
            {activity?.status === 'closed' && (<><button onClick={viewResults} className="btn-primary">Ver resultados</button><button onClick={resetActivity} className="btn-ghost">Nueva pregunta</button></>)}
          </div>
        </section>

        {(!activity || activity.status === 'draft') && (
          <section className="card animate-fade-up">
            <span className="label-eyebrow">Configurar pregunta</span>
            <form onSubmit={saveActivity} className="mt-4 flex flex-col gap-4">
              <textarea required placeholder="Escribí la pregunta de opción múltiple" value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} className="min-h-[80px] rounded-xl border border-white/10 bg-night-700 px-4 py-3 text-ember-50 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ember-300" />
              <div className="grid gap-3 sm:grid-cols-2">
                {['a', 'b', 'c', 'd'].map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-ember-500/20 font-display font-bold text-ember-300">{key.toUpperCase()}</span>
                    <input required placeholder={`Opción ${key.toUpperCase()}`} value={form[`option_${key}`]} onChange={(e) => setForm((f) => ({ ...f, [`option_${key}`]: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-night-700 px-3 py-2 text-ember-50 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ember-300" />
                  </div>
                ))}
              </div>
              <div>
                <span className="label-eyebrow">Respuesta correcta</span>
                <div className="mt-2 flex gap-2">
                  {['a', 'b', 'c', 'd'].map((key) => (
                    <button type="button" key={key} onClick={() => setForm((f) => ({ ...f, correct_option: key }))} className={`h-10 w-10 rounded-lg font-display font-bold transition-colors ${form.correct_option === key ? 'bg-jade-500 text-night-900' : 'bg-night-700 text-ember-100 hover:bg-night-600'}`}>{key.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={savingActivity} className="btn-primary self-start">{savingActivity ? 'Guardando…' : activity ? 'Guardar cambios' : 'Crear actividad'}</button>
            </form>
          </section>
        )}

        <section className="card animate-fade-up">
          <span className="label-eyebrow">Integrantes de las tribus</span>
          <p className="mt-1 text-xs text-ember-100/50">Esta lista queda guardada permanentemente: no hace falta volver a cargarla al crear una pregunta nueva.</p>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-ember-100">Agregar uno por uno</p>
              <div className="mt-2 flex flex-col gap-2">
                <select value={singleTribe} onChange={(e) => setSingleTribe(e.target.value)} className="rounded-xl border border-white/10 bg-night-700 px-3 py-2 text-ember-50">{TRIBES.map((t) => <option key={t.id} value={t.id}>{t.plural}</option>)}</select>
                <div className="flex gap-2">
                  <input placeholder="Nombre y apellido" value={singleName} onChange={(e) => setSingleName(e.target.value)} className="w-full rounded-xl border border-white/10 bg-night-700 px-3 py-2 text-ember-50" />
                  <button onClick={addSingleMember} className="btn-ghost">Agregar</button>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-ember-100">Pegar lista completa</p>
              <div className="mt-2 flex flex-col gap-2">
                <select value={bulkTribe} onChange={(e) => setBulkTribe(e.target.value)} className="rounded-xl border border-white/10 bg-night-700 px-3 py-2 text-ember-50">{TRIBES.map((t) => <option key={t.id} value={t.id}>{t.plural}</option>)}</select>
                <textarea placeholder={'Un nombre por línea\nJuan Pérez\nAna Gómez'} value={bulkText} onChange={(e) => setBulkText(e.target.value)} className="min-h-[88px] rounded-xl border border-white/10 bg-night-700 px-3 py-2 text-ember-50" />
                <button onClick={addBulkMembers} className="btn-ghost self-start">Cargar lista</button>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-5">
            {TRIBES.map((t) => (
              <div key={t.id}>
                <TribeBadge tribeId={t.id}>{t.plural} ({members.filter((m) => m.tribe === t.id).length})</TribeBadge>
                <ul className="mt-2 divide-y divide-white/5 rounded-xl border border-white/5">
                  {members.filter((m) => m.tribe === t.id).map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <input defaultValue={m.name} onBlur={(e) => { if (e.target.value.trim() && e.target.value !== m.name) updateMemberName(m.id, e.target.value.trim()) }} className="w-full bg-transparent text-sm text-ember-50 outline-none" />
                      <button onClick={() => deleteMember(m.id)} className="text-xs text-red-300 hover:text-red-200">Eliminar</button>
                    </li>
                  ))}
                  {members.filter((m) => m.tribe === t.id).length === 0 && <li className="px-3 py-2 text-xs text-ember-100/40">Sin integrantes cargados.</li>}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {activity && activity.status === 'active' && (
          <section className="card animate-fade-up">
            <span className="label-eyebrow">Tablero en vivo</span>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="text-ember-100/60"><th className="py-2">Tribu</th><th className="py-2">Respondieron</th><th className="py-2">Pendientes</th></tr></thead>
                <tbody>
                  {TRIBES.map((t) => (
                    <tr key={t.id} className="border-t border-white/5">
                      <td className="py-3"><TribeBadge tribeId={t.id}>{t.plural}</TribeBadge></td>
                      <td className="py-3 font-display text-lg text-jade-400">{counts[t.id]?.responded ?? 0}</td>
                      <td className="py-3 font-display text-lg text-ember-300">{(counts[t.id]?.total ?? 0) - (counts[t.id]?.responded ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <Stat label="Participantes" value={members.length} />
              <Stat label="Respondieron" value={activityResponses.length} />
              <Stat label="Pendientes" value={members.length - activityResponses.length} />
            </div>
          </section>
        )}

        {activity && activity.status === 'closed' && showResults && (
          <ResultsView stage={revealStage} onContinue={() => setRevealStage(2)} resultsByTribe={resultsByTribe} winner={winner} totals={totals} activity={activity} />
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

  function downloadExcel() {
    const fecha = new Date().toLocaleDateString('es-AR')
    const hora = new Date().toLocaleTimeString('es-AR')

    const TRIBE_COLORS = {
      Mapuches: { rgb: '7c3aed' },
      Guaraníes: { rgb: '65a30d' },
      Mocovíes: { rgb: 'ea580c' }
    }
    const WHITE = { rgb: 'FFFFFF' }
    const DARK = { rgb: '1e1e2e' }
    const GRAY = { rgb: 'e5e7eb' }

    function sc(ws, ref, style) {
      if (!ws[ref]) ws[ref] = { v: '', t: 's' }
      ws[ref].s = style
    }

    // Ordenar tribus por correctas de mayor a menor
    const sorted = TRIBES.map(t => ({
      ...t,
      correct: resultsByTribe[t.id].correct,
      pct: resultsByTribe[t.id].pct
    })).sort((a, b) => b.correct - a.correct)

    const medals = ['🥇', '🥈', '🥉']

    const rows = [
      ['RESUMEN POR TRIBU', '', '', '', ''],
      ['Tribu', 'Respondieron', 'Correctas', 'Incorrectas', 'Porcentaje'],
      ...TRIBES.map((t) => {
        const r = resultsByTribe[t.id]
        return [t.plural, r.total, r.correct, r.total - r.correct, `${r.pct}%`]
      }),
      [],
      ['DETALLE POR OPCIÓN', '', '', '', '', ''],
      ['Tribu', 'Opción A', 'Opción B', 'Opción C', 'Opción D', 'Total'],
      ...TRIBES.map((t) => {
        const r = resultsByTribe[t.id]
        return [t.plural, r.opts.a, r.opts.b, r.opts.c, r.opts.d, r.total]
      }),
      [],
      ['INFORMACIÓN DE LA ACTIVIDAD', ''],
      ['Pregunta', activity.question],
      ['Respuesta correcta', `Opción ${activity.correct_option.toUpperCase()} — ${optionLabel[activity.correct_option]}`],
      ['Exportado el', `${fecha} ${hora}`],
      [],
      ['POSICIONES FINALES', '', '', ''],
      ['Puesto', 'Tribu', 'Correctas', 'Porcentaje'],
      ...sorted.map((t, i) => [`${medals[i] || ''} ${i + 1}°`, t.plural, t.correct, `${t.pct}%`])
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }]

    const sectionStyle = { font: { bold: true, color: WHITE, sz: 13 }, fill: { patternType: 'solid', fgColor: DARK } }
    sc(ws, 'A1', sectionStyle)
    sc(ws, 'A7', sectionStyle)
    sc(ws, 'A13', sectionStyle)
    sc(ws, 'A19', sectionStyle)

    const hStyle = { font: { bold: true }, fill: { patternType: 'solid', fgColor: GRAY }, alignment: { horizontal: 'center' } }
    ;['A2','B2','C2','D2','E2','A8','B8','C8','D8','E8','F8','A20','B20','C20','D20'].forEach(r => sc(ws, r, hStyle))

    const r1 = { Mapuches: 3, Guaraníes: 4, Mocovíes: 5 }
    const r2 = { Mapuches: 9, Guaraníes: 10, Mocovíes: 11 }

    Object.entries(r1).forEach(([tribe, row]) => {
      ;['A','B','C','D','E'].forEach(col => {
        sc(ws, `${col}${row}`, { fill: { patternType: 'solid', fgColor: { rgb: TRIBE_COLORS[tribe].rgb } }, font: { color: WHITE, bold: col === 'A' }, alignment: { horizontal: col === 'A' ? 'left' : 'center' } })
      })
    })

    Object.entries(r2).forEach(([tribe, row]) => {
      ;['A','B','C','D','E','F'].forEach(col => {
        sc(ws, `${col}${row}`, { fill: { patternType: 'solid', fgColor: { rgb: TRIBE_COLORS[tribe].rgb } }, font: { color: WHITE, bold: col === 'A' }, alignment: { horizontal: col === 'A' ? 'left' : 'center' } })
      })
    })

    const iStyle = { font: { bold: true } }
    sc(ws, 'A14', iStyle); sc(ws, 'A15', iStyle); sc(ws, 'A16', iStyle)

    // Posiciones con color de cada tribu
    sorted.forEach((t, i) => {
      const row = 21 + i
      const colorRgb = TRIBE_COLORS[t.plural]?.rgb || '444444'
      ;['A','B','C','D'].forEach(col => {
        sc(ws, `${col}${row}`, {
          fill: { patternType: 'solid', fgColor: { rgb: colorRgb } },
          font: { bold: true, color: WHITE },
          alignment: { horizontal: col === 'B' ? 'left' : 'center' }
        })
      })
    })

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados')
    XLSX.writeFile(wb, `Guardian_Secreto_${fecha.replace(/\//g, '-')}.xlsx`)
  }

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
            <p className="mt-1 text-sm text-ember-100/70">entre {winner.top.map((w) => TRIBES.find((t) => t.id === w.id).plural).join(' y ')}</p>
          </>
        ) : (
          <>
            <p className="text-3xl">🏆</p>
            <p className="mt-2 label-eyebrow">Tribu ganadora</p>
            <p className="mt-1 font-display text-3xl font-black text-ember-50">{TRIBES.find((t) => t.id === winner.top[0].id).plural}</p>
            <p className="mt-1 text-sm text-ember-100/70">{winner.top[0].correct} respuestas correctas · {winner.top[0].pct}% de aciertos</p>
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

      <button onClick={downloadExcel} className="btn-primary mt-6 inline-flex items-center gap-2">
        📊 Descargar Excel
      </button>
    </section>
  )
}
