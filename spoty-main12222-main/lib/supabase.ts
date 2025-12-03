/**
 * Cliente de Supabase
 * Configuración para conectarse a la base de datos
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

// Función para obtener el cliente de Supabase
// Durante el build, si las variables no están configuradas, usa valores placeholder válidos
function getSupabaseClient(): SupabaseClient {
  // Si las variables están configuradas, usar valores reales
  if (supabaseUrl && supabaseAnonKey && 
      supabaseUrl !== '' && 
      supabaseAnonKey !== '' &&
      !supabaseUrl.includes('placeholder') &&
      !supabaseAnonKey.includes('placeholder')) {
    return createClient(supabaseUrl, supabaseAnonKey)
  }
  
  // Durante el build o si no están configuradas, usar valores placeholder válidos
  // Estos permiten que el build complete sin errores
  const placeholderUrl = 'https://placeholder.supabase.co'
  const placeholderKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder'
  
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Supabase URL o Anon Key no están configurados. Usando cliente placeholder.')
  }
  
  return createClient(placeholderUrl, placeholderKey)
}

// Cliente para uso en el servidor (con Row Level Security)
export const supabase = getSupabaseClient()
