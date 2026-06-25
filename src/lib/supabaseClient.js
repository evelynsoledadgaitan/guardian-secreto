import { createClient } from '@supabase/supabase-js'

// Las credenciales se leen desde variables de entorno (nunca quedan escritas en el código).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Aviso claro en desarrollo si falta configurar el archivo .env
  console.warn(
    'Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Copiá .env.example a .env y completá los valores.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

// Tres tribus soportadas por la aplicación.
export const TRIBES = [
  { id: 'mapuche', label: 'Mapuche', plural: 'Mapuches', color: 'mapuche' },
  { id: 'guarani', label: 'Guaraní', plural: 'Guaraníes', color: 'guarani' },
  { id: 'mocovi', label: 'Mocoví', plural: 'Mocovíes', color: 'mocovi' }
]

export const tribeInfo = (id) => TRIBES.find((t) => t.id === id)
