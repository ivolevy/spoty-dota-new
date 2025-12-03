/**
 * Detecta géneros musicales en un prompt de texto
 */

import { findMatchingActivities } from "./activity-matcher"

export type Genre = "trap" | "rock" | "pop"

/**
 * Detecta si el prompt menciona algún género musical
 * Las actividades y géneros pueden coexistir - no son mutuamente excluyentes
 * @param prompt - Texto del prompt del usuario
 * @returns Género detectado o null si no se detecta ninguno
 */
export function detectGenreFromPrompt(prompt: string): Genre | null {
  const normalizedPrompt = prompt.toLowerCase().trim()
  
  // Las actividades y géneros pueden coexistir - no bloqueamos la detección de género
  const activities = findMatchingActivities(prompt)
  if (activities.length > 0) {
    console.log(`🎯 Actividad detectada: "${activities[0].actividad}" - También se puede filtrar por género si se menciona`)
  }
  
  // Palabras clave para cada género (ordenadas de más específicas a menos específicas)
  // Usamos palabras completas para evitar falsos positivos
  const trapKeywords = [
    "trap latino", "trap argentino", "argentina trap", "trap", 
    "rap", "hip hop", "hip-hop", "urban", "reggaeton", "reggaeton latino"
  ]
  const rockKeywords = [
    "rock argentino", "rock nacional", "argentine rock", "indie rock", 
    "hard rock", "rock alternativo", "rock", "alternativo"
  ]
  const popKeywords = [
    "pop latino", "pop urbano", "música pop", "pop argentino", 
    "pop", "balada", "balada pop"
  ]
  
  // Función auxiliar para verificar si una palabra completa está en el prompt
  const hasKeyword = (keywords: string[]): boolean => {
    return keywords.some(keyword => {
      const normalizedKeyword = keyword.toLowerCase().trim()
      // Buscar como palabra completa o como substring significativo
      const words = normalizedPrompt.split(/\s+/)
      return words.some(word => 
        word === normalizedKeyword || 
        word.includes(normalizedKeyword) || 
        normalizedKeyword.includes(word)
      ) || normalizedPrompt.includes(normalizedKeyword)
    })
  }
  
  // Verificar trap primero (más específico)
  if (hasKeyword(trapKeywords)) {
    return "trap"
  }
  
  // Verificar rock
  if (hasKeyword(rockKeywords)) {
    return "rock"
  }
  
  // Verificar pop
  if (hasKeyword(popKeywords)) {
    return "pop"
  }
  
  return null
}

/**
 * Obtiene todos los géneros disponibles en el catálogo
 */
export function getAvailableGenres(): Genre[] {
  return ["trap", "rock", "pop"]
}

