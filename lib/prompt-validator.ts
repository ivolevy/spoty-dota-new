/**
 * Funciones para validar el prompt del usuario
 */

import { findMatchingActivities } from "./activity-matcher"

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Detecta si el prompt menciona algún género musical (para validación)
 * NO requiere actividad si hay género
 */
function hasGenreInPrompt(prompt: string): boolean {
  const normalizedPrompt = prompt.toLowerCase().trim()
  
  // Palabras clave para cada género
  const genreKeywords = [
    // Trap
    "trap", "trap latino", "rap", "hip hop", "hip-hop", "urban", "reggaeton",
    // Rock
    "rock", "rock argentino", "rock nacional", "alternativo", "indie rock",
    // Pop
    "pop", "pop latino", "pop urbano", "balada", "música pop"
  ]
  
  return genreKeywords.some(keyword => normalizedPrompt.includes(keyword))
}

/**
 * Valida que el prompt tenga los campos obligatorios
 * IMPORTANTE: Si se detecta un género, la actividad NO es obligatoria
 */
export function validatePrompt(prompt: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const promptLower = (prompt && typeof prompt === 'string' ? prompt : '').toLowerCase().trim()

  // Detectar si hay un género mencionado
  const hasGenre = hasGenreInPrompt(prompt)
  const activities = findMatchingActivities(prompt)
  
  // Validar: necesita actividad O género (uno de los dos)
  if (activities.length === 0 && !hasGenre) {
    errors.push("Debes especificar una actividad (ej: correr, estudiar) o un género (trap, rock, pop)")
  }

  // Validar tiempo (obligatorio)
  const timePatterns = [
    /(\d+)\s*(?:hora|horas|hr|hrs|h)\s*(?:y|,)?\s*(\d+)?\s*(?:minuto|minutos|min|mins)?/i,
    /(\d+)\s*(?:minuto|minutos|min|mins)/i,
    /aprox(?:imadamente)?\s*(\d+)\s*(?:minuto|minutos|min|mins)/i,
    /(\d+)\s*(?:min|mins)/i,
  ]

  let hasTime = false
  for (const pattern of timePatterns) {
    if (pattern.test(promptLower)) {
      hasTime = true
      break
    }
  }

  if (!hasTime) {
    errors.push("Debes especificar la duración (ej: 45 minutos, 1 hora, 2 horas)")
  }

  // Validar intensidad (opcional, pero recomendado)
  const intensityKeywords = [
    'chill', 'más chill', 'relajada', 'suave',
    'media', 'moderada',
    'alta', 'fuerte', 'entrenamiento fuerte', 'intensa', 'muy alta'
  ]
  
  const hasIntensity = intensityKeywords.some(keyword => 
    promptLower.includes(keyword)
  )

  if (!hasIntensity && activities.length > 0) {
    warnings.push("Puedes especificar la intensidad para mejores resultados (ej: más chill, entrenamiento fuerte)")
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

