/**
 * Detecta géneros musicales en un prompt de texto
 */

import { findMatchingActivities } from "./activity-matcher"

export type Genre = "trap" | "rock" | "pop"

/**
 * Detecta si el prompt menciona algún género musical
 * IMPORTANTE: Si se detecta una actividad (correr, estudiar, trabajar, etc.), NO se filtra por género
 * @param prompt - Texto del prompt del usuario
 * @returns Género detectado o null si no se detecta ninguno o si hay una actividad
 */
export function detectGenreFromPrompt(prompt: string): Genre | null {
  const normalizedPrompt = prompt.toLowerCase().trim()
  
  // Si hay una actividad detectada, NO filtrar por género
  const activities = findMatchingActivities(prompt)
  if (activities.length > 0) {
    console.log(`🎯 Actividad detectada: "${activities[0].actividad}" - No se filtrará por género`)
    return null
  }
  
  // Palabras clave para cada género
  const trapKeywords = ["trap", "trap latino", "rap", "hip hop", "hip-hop", "urban", "reggaeton"]
  const rockKeywords = ["rock", "rock argentino", "rock nacional", "alternativo", "indie rock"]
  const popKeywords = ["pop", "pop latino", "pop urbano", "balada", "música pop"]
  
  // Verificar trap primero (más específico)
  if (trapKeywords.some(keyword => normalizedPrompt.includes(keyword))) {
    return "trap"
  }
  
  // Verificar rock
  if (rockKeywords.some(keyword => normalizedPrompt.includes(keyword))) {
    return "rock"
  }
  
  // Verificar pop
  if (popKeywords.some(keyword => normalizedPrompt.includes(keyword))) {
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

