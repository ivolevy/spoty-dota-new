/**
 * Cliente de Supabase para DATOS/CANCIONES (artist_tracks)
 * Esta es la base de datos que contiene el catálogo de canciones
 * URL: https://lsfqvzqmmbjhmbcnbqds.supabase.co
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Función para obtener las variables de entorno en tiempo de ejecución
function getSupabaseDataConfig() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || '').trim()
  
  return { supabaseUrl, supabaseAnonKey }
}

// Función para obtener el cliente de Supabase para datos/canciones
function getSupabaseDataClient(): SupabaseClient {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseDataConfig()
  
  // Si las variables están configuradas, usar valores reales
  if (supabaseUrl && supabaseAnonKey && 
      supabaseUrl !== '' && 
      supabaseAnonKey !== '' &&
      !supabaseUrl.includes('placeholder') &&
      !supabaseAnonKey.includes('placeholder')) {
    return createClient(supabaseUrl, supabaseAnonKey)
  }
  
  // En producción, lanzar error si faltan las variables
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
    throw new Error(`Variables de entorno de Supabase DATA faltantes: SUPABASE_URL o SUPABASE_ANON_KEY. Configúralas en Vercel.`)
  }
  
  // Solo en desarrollo/build, usar valores placeholder
  const placeholderUrl = 'https://placeholder.supabase.co'
  const placeholderKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder'
  
  return createClient(placeholderUrl, placeholderKey)
}

// Cliente para uso en el servidor para consultar datos/canciones
// Se crea en tiempo de ejecución, no en tiempo de módulo
let supabaseDataInstance: SupabaseClient | null = null

export const supabaseData = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    if (!supabaseDataInstance) {
      supabaseDataInstance = getSupabaseDataClient()
    }
    return (supabaseDataInstance as any)[prop]
  }
})

