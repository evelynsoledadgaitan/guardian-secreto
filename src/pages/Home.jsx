import { Link } from 'react-router-dom'
import { TRIBES } from '../lib/supabaseClient.js'
import GuardianSigil from '../components/GuardianSigil.jsx'

const TRIBE_GRADIENT = {
  mapuche: 'from-mapuche/30 to-mapuche/5 hover:from-mapuche/50',
  guarani: 'from-guarani/30 to-guarani/5 hover:from-guarani/50',
  mocovi: 'from-mocovi/30 to-mocovi/5 hover:from-mocovi/50'
}

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div className="absolute -top-24 left-1/2 -z-0 h-[480px] w-[480px] -translate-x-1/2 opacity-30 blur-sm">
        <GuardianSigil pulse className="h-full w-full" />
      </div>

      <div className="relative z-10 flex max-w-xl flex-col items-center text-center animate-fade-up">
        <span className="label-eyebrow mb-4">Una prueba ancestral de saber</span>
        <h1 className="font-display text-4xl font-black leading-tight tracking-wide text-ember-50 sm:text-5xl md:text-6xl">
          EL GUARDIÁN <span className="text-ember-400">SECRETO</span>
        </h1>
        <p className="mt-5 max-w-md text-sm text-ember-100/70 sm:text-base">
          Tres tribus, una sola pregunta. Elegí tu camino y demostrá el conocimiento de tu pueblo.
        </p>
      </div>

      <div className="relative z-10 mt-12 grid w-full max-w-xl gap-4 sm:grid-cols-2">
        {TRIBES.map((tribe, i) => (
          <Link
            key={tribe.id}
            to={`/tribu/${tribe.id}`}
            style={{ animationDelay: `${i * 90}ms` }}
            className={`animate-fade-up rounded-2xl border border-white/10 bg-gradient-to-br ${TRIBE_GRADIENT[tribe.id]} p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-300`}
          >
            <span className="label-eyebrow">Soy</span>
            <p className="mt-1 font-display text-2xl font-bold text-ember-50">{tribe.label}</p>
          </Link>
        ))}

        <Link
          to="/sabio"
          style={{ animationDelay: '270ms' }}
          className="animate-fade-up flex items-center justify-between rounded-2xl border border-ember-500/30 bg-night-700/60 p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-ember-300 hover:shadow-xl hover:shadow-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-300"
        >
          <div>
            <span className="label-eyebrow">Soy el</span>
            <p className="mt-1 font-display text-2xl font-bold text-ember-300">Sabio</p>
          </div>
          <span aria-hidden="true" className="text-2xl">🜂</span>
        </Link>
      </div>

      <p className="relative z-10 mt-14 text-xs text-ember-100/40">
        Mapuches · Guaraníes · Mocovíes
      </p>
    </main>
  )
}
