import { createClient } from '@supabase/supabase-js'

// Credenciales inyectadas por Vite desde .env (prefijo VITE_ = expuesto al cliente).
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Faltan credenciales de Supabase. Copia .env.example a .env y define ' +
    'VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
  )
}

// Cliente único, reutilizable en toda la app. El acceso real lo gobierna RLS.
export const supabase = createClient(url, anonKey)
