/**
 * Cliente de Supabase
 * Configuración para conectarse a la base de datos
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Función para obtener las variables de entorno en tiempo de ejecución
function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
  
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
  
  // En producción, lanzar error claro si faltan las variables
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
    const missingVars = []
    if (!supabaseUrl || supabaseUrl === '' || supabaseUrl.includes('placeholder')) {
      missingVars.push('NEXT_PUBLIC_SUPABASE_URL o SUPABASE_URL')
    }
    if (!supabaseAnonKey || supabaseAnonKey === '' || supabaseAnonKey.includes('placeholder')) {
      missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_ANON_KEY')
    }
    
    console.error('❌ ERROR: Variables de entorno de Supabase no configuradas en producción:')
    console.error('   Faltan:', missingVars.join(', '))
    console.error('   Valores actuales:', {
      url: supabaseUrl || 'undefined',
      key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'undefined'
    })
    console.error('   Configúralas en Vercel Dashboard → Settings → Environment Variables')
    
    // Lanzar error para que sea visible en los logs
    throw new Error(`Variables de entorno de Supabase faltantes: ${missingVars.join(', ')}. Configúralas en Vercel.`)
  }
  
  // Solo en desarrollo/build, usar valores placeholder válidos
  // Estos permiten que el build complete sin errores
  const placeholderUrl = 'https://placeholder.supabase.co'
  const placeholderKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder'
  
  console.warn('⚠️ Supabase URL o Anon Key no están configurados. Usando cliente placeholder (solo desarrollo).')
  
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
