/**
 * Cliente de Supabase para DATOS/CANCIONES (artist_tracks)
 * Esta es la base de datos que contiene el catálogo de canciones
 * URL: https://lsfqvzqmmbjhmbcnbqds.supabase.co
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Función para obtener las variables de entorno en tiempo de ejecución
function getSupabaseDataConfig() {
  // Leer directamente de process.env en tiempo de ejecución
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || '').trim()
  
  // Debug: mostrar valores RAW antes de procesar
  console.log('🔍 [Supabase Data Config RAW]:')
  console.log('   - process.env.SUPABASE_URL:', process.env.SUPABASE_URL)
  console.log('   - process.env.SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? `${process.env.SUPABASE_ANON_KEY.substring(0, 30)}...` : 'undefined')
  console.log('   - Todas las vars que empiezan con SUPABASE:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
  
  return { supabaseUrl, supabaseAnonKey }
}

// Función para obtener el cliente de Supabase para datos/canciones
function getSupabaseDataClient(): SupabaseClient {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseDataConfig()
  
  // Debug: Log para ver qué valores tenemos
  console.log('🔍 [Supabase Data Config] Verificando variables de entorno:')
  console.log('   - SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET')
  console.log('   - SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET')
  console.log('   - supabaseUrl final:', supabaseUrl || 'EMPTY')
  console.log('   - supabaseAnonKey final:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'EMPTY')
  
  // Si las variables están configuradas, usar valores reales
  if (supabaseUrl && supabaseAnonKey && 
      supabaseUrl !== '' && 
      supabaseAnonKey !== '' &&
      !supabaseUrl.includes('placeholder') &&
      !supabaseAnonKey.includes('placeholder')) {
    console.log('✅ [Supabase Data Config] Usando configuración real de Supabase para datos/canciones')
    return createClient(supabaseUrl, supabaseAnonKey)
  }
  
  // En producción, lanzar error claro si faltan las variables
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
    const missingVars = []
    if (!supabaseUrl || supabaseUrl === '' || supabaseUrl.includes('placeholder')) {
      missingVars.push('SUPABASE_URL')
    }
    if (!supabaseAnonKey || supabaseAnonKey === '' || supabaseAnonKey.includes('placeholder')) {
      missingVars.push('SUPABASE_ANON_KEY')
    }
    
    console.error('❌ ERROR: Variables de entorno de Supabase DATA no configuradas en producción:')
    console.error('   Faltan:', missingVars.join(', '))
    console.error('   Valores actuales:', {
      url: supabaseUrl || 'undefined',
      key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'undefined'
    })
    console.error('   Configúralas en Vercel Dashboard → Settings → Environment Variables')
    
    // Lanzar error para que sea visible en los logs
    throw new Error(`Variables de entorno de Supabase DATA faltantes: ${missingVars.join(', ')}. Configúralas en Vercel.`)
  }
  
  // Solo en desarrollo/build, usar valores placeholder válidos
  const placeholderUrl = 'https://placeholder.supabase.co'
  const placeholderKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder'
  
  console.warn('⚠️ [Supabase Data Config] SUPABASE_URL o SUPABASE_ANON_KEY no están configurados. Usando cliente placeholder (solo desarrollo).')
  
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

