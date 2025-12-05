/**
 * Detecta artistas mencionados en un prompt de texto
 */

/**
 * Detecta si el prompt menciona algún artista específico
 * @param prompt - Texto del prompt del usuario
 * @param availableArtists - Lista de artistas disponibles en el catálogo
 * @returns Nombre del artista detectado o null si no se detecta ninguno
 */
export function detectArtistFromPrompt(
  prompt: string,
  availableArtists: string[]
): string | null {
  const normalizedPrompt = prompt.toLowerCase().trim()
  
  // Normalizar lista de artistas disponibles
  const normalizedArtists = availableArtists.map(artist => ({
    original: artist,
    normalized: artist.toLowerCase().trim()
  }))
  
  // Buscar coincidencias exactas primero
  for (const artist of normalizedArtists) {
    // Coincidencia exacta
    if (normalizedPrompt === artist.normalized) {
      return artist.original
    }
    
    // Coincidencia como palabra completa (con espacios alrededor o al inicio/final)
    const wordBoundaryRegex = new RegExp(`\\b${artist.normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (wordBoundaryRegex.test(normalizedPrompt)) {
      return artist.original
    }
    
    // Coincidencia parcial (si el artista tiene más de 3 caracteres)
    if (artist.normalized.length >= 3 && normalizedPrompt.includes(artist.normalized)) {
      return artist.original
    }
  }
  
  return null
}

/**
 * Detecta múltiples artistas mencionados en un prompt
 * @param prompt - Texto del prompt del usuario
 * @param availableArtists - Lista de artistas disponibles en el catálogo
 * @returns Array de nombres de artistas detectados
 */
export function detectArtistsFromPrompt(
  prompt: string,
  availableArtists: string[]
): string[] {
  const normalizedPrompt = prompt.toLowerCase().trim()
  const detectedArtists: string[] = []
  
  // Normalizar lista de artistas disponibles
  const normalizedArtists = availableArtists.map(artist => ({
    original: artist,
    normalized: artist.toLowerCase().trim()
  }))
  
  // Buscar todas las coincidencias
  for (const artist of normalizedArtists) {
    // Coincidencia exacta
    if (normalizedPrompt === artist.normalized) {
      if (!detectedArtists.includes(artist.original)) {
        detectedArtists.push(artist.original)
      }
      continue
    }
    
    // Coincidencia como palabra completa
    const wordBoundaryRegex = new RegExp(`\\b${artist.normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (wordBoundaryRegex.test(normalizedPrompt)) {
      if (!detectedArtists.includes(artist.original)) {
        detectedArtists.push(artist.original)
      }
      continue
    }
    
    // Coincidencia parcial (si el artista tiene más de 3 caracteres)
    if (artist.normalized.length >= 3 && normalizedPrompt.includes(artist.normalized)) {
      if (!detectedArtists.includes(artist.original)) {
        detectedArtists.push(artist.original)
      }
    }
  }
  
  return detectedArtists
}



