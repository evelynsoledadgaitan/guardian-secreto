// El "Ojo del Guardián": sigilo decorativo y firma visual de la app.
// Un círculo geométrico con trazos que recuerda a un sol ceremonial / nudo ancestral.
export default function GuardianSigil({ className = '', pulse = false }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`${className} ${pulse ? 'animate-glow-pulse' : ''}`}
      aria-hidden="true"
    >
      <circle cx="100" cy="100" r="92" fill="none" stroke="#d97a1f" strokeOpacity="0.35" strokeWidth="2" />
      <circle cx="100" cy="100" r="70" fill="none" stroke="#eab165" strokeOpacity="0.5" strokeWidth="1.5" />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 12
        const x1 = 100 + Math.cos(angle) * 70
        const y1 = 100 + Math.sin(angle) * 70
        const x2 = 100 + Math.cos(angle) * 92
        const y2 = 100 + Math.sin(angle) * 92
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d97a1f" strokeOpacity="0.4" strokeWidth="2" />
        )
      })}
      <circle cx="100" cy="100" r="34" fill="#0f1410" stroke="#eab165" strokeWidth="2" />
      <circle cx="100" cy="100" r="14" fill="#d97a1f" />
      <circle cx="100" cy="100" r="6" fill="#fdf3e9" />
    </svg>
  )
}
