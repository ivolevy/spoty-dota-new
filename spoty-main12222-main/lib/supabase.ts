/**
 * Cliente de Supabase para USUARIOS (users, playlists, etc.)
 * Esta es la base de datos que contiene información de usuarios y sus playlists
 * URL: https://klafufgasozdtawtytsh.supabase.co
 * 
 * Para consultar canciones (artist_tracks), usar supabaseData de supabase-data.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Función para obtener las variables de entorno en tiempo de ejecución
// Solo usa las variables de USUARIOS (NEXT_PUBLIC_*)
function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  
  return { supabaseUrl, supabaseAnonKey }
}

// Función para obtener el cliente de Supabase (evalúa en tiempo de ejecución)
function getSupabaseClient(): SupabaseClient {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
  
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
    throw new Error(`Variables de entorno de Supabase USUARIOS faltantes: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Configúralas en Vercel.`)
  }
  
  // Solo en desarrollo/build, usar valores placeholder
  const placeholderUrl = 'https://placeholder.supabase.co'
  const placeholderKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder'
  
  return createClient(placeholderUrl, placeholderKey)
}

// Cliente para uso en el servidor (con Row Level Security)
// Se crea en tiempo de ejecución, no en tiempo de módulo
let supabaseInstance: SupabaseClient | null = null

export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    if (!supabaseInstance) {
      supabaseInstance = getSupabaseClient()
    }
    return (supabaseInstance as any)[prop]
  }
})
