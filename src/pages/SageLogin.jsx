import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, ADMIN_EMAIL } from '../lib/supabaseClient.js'

export default function SageLogin() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!ADMIN_EMAIL) {
      setError('Falta configurar VITE_ADMIN_EMAIL en las variables de entorno.')
      return
    }

    setLoading(true)
    // La contraseña se valida de forma segura por Supabase Auth (nunca se compara en el cliente).
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password
    })
    setLoading(false)

    if (authErr) {
      setError('Contraseña incorrecta.')
      return
    }
    navigate('/sabio/panel')
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm animate-fade-up card">
        <span className="label-eyebrow">Acceso restringido</span>
        <h1 className="mt-2 font-display text-2xl font-bold text-ember-50">Ingresar como Sabio</h1>
        <p className="mt-2 text-sm text-ember-100/60">
          Solo el administrador de la actividad puede ingresar aquí.
        </p>

        <label htmlFor="password" className="label-eyebrow mt-6 block">Contraseña</label>
        <input
          id="password"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-night-700 px-4 py-3 text-ember-50 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ember-300"
        />

        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

        <button type="submit" disabled={loading || !password} className="btn-primary mt-6 w-full">
          {loading ? 'Verificando…' : 'Ingresar'}
        </button>

        <Link to="/" className="mt-4 block text-center text-xs text-ember-100/50 hover:text-ember-100">
          ← Volver al inicio
        </Link>
      </form>
    </main>
  )
}
