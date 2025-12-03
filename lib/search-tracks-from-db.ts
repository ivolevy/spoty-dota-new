/**
 * Busca tracks desde la base de datos Supabase en lugar de hacer requests a Spotify
 * Esto elimina completamente el consumo de la API de Spotify
 */

import type { Track } from "./search-daleplay"
import { supabaseData } from "./supabase-data"

interface TrackFromDB {
  id: number
  spotify_id: string
  name: string
  artists: string[]
  artist_main: string | null
  album: string | null
  release_date: string | null
  duration_ms: number | null
  bpm: number | null
  genres: string[] | null
  preview_url: string | null
  cover_url: string | null
  fetched_at: string | null
}

/**
 * Normaliza strings para comparación (case-insensitive, sin acentos opcionales)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Elimina acentos
}

/**
 * Verifica si un track coincide con un género específico
 * Usa coincidencia inteligente por palabras completas y substrings:
 * - "rock" coincide con "argentine rock", "rock argentino", "hard rock", "rock", etc.
 * - "trap" coincide con "argentina trap", "trap latino", "trap", etc.
 */
function matchesGenre(track: TrackFromDB, genre?: string): boolean {
  if (!genre) return true // Si no hay filtro de género, aceptar todos
  
  const normalizedGenre = normalizeString(genre)
  const trackGenres = track.genres || []
  
  // Dividir el género buscado en palabras
  const genreWords = normalizedGenre.split(/\s+/).filter(w => w.length > 0)
  
  return trackGenres.some(g => {
    const normalizedTrackGenre = normalizeString(g)
    
    // 1. Coincidencia exacta
    if (normalizedTrackGenre === normalizedGenre) {
      return true
    }
    
    // 2. Coincidencia por palabras completas: verificar si alguna palabra del género buscado
    // está presente como palabra completa en el género del track
    const trackGenreWords = normalizedTrackGenre.split(/\s+/).filter(w => w.length > 0)
    const hasMatchingWord = genreWords.some(word => 
      trackGenreWords.some(trackWord => 
        trackWord === word || 
        trackWord.startsWith(word) || 
        trackWord.endsWith(word) ||
        word.startsWith(trackWord) ||
        word.endsWith(trackWord)
      )
    )
    
    if (hasMatchingWord) {
      return true
    }
    
    // 3. Coincidencia por substring (para casos como "trap" en "trap latino")
    // Solo si el substring es significativo (más de 3 caracteres)
    if (normalizedGenre.length >= 3) {
      if (normalizedTrackGenre.includes(normalizedGenre) || normalizedGenre.includes(normalizedTrackGenre)) {
        return true
      }
    }
    
    return false
  })
}

/**
 * Busca un track en la base de datos por nombre y artista, opcionalmente filtrado por género
 */
async function findTrackInDB(
  trackName: string,
  artistName: string,
  genre?: string
): Promise<TrackFromDB | null> {
  const normalizedTrackName = normalizeString(trackName)
  const normalizedArtistName = normalizeString(artistName)

  try {
    // Primero intentar búsqueda exacta por nombre y artista principal
    let { data, error } = await supabaseData
      .from('artist_tracks')
      .select('*')
      .ilike('name', normalizedTrackName)
      .ilike('artist_main', normalizedArtistName)
      .limit(10) // Obtener varios resultados para filtrar por género después

    if (error) {
      console.error('Error en búsqueda exacta:', error)
    }

    // Si encontramos resultados, filtrar por género si se especifica
    if (data && data.length > 0) {
      for (const track of data as TrackFromDB[]) {
        if (matchesGenre(track, genre)) {
          return track
        }
      }
      // Si hay filtro de género y no encontramos coincidencia, retornar null
      if (genre) {
        return null
      }
      // Si no hay filtro de género, retornar el primero
      return data[0] as TrackFromDB
    }

    // Si no encontramos exacto, buscar por coincidencia parcial en nombre
    // y verificar si alguno de los artistas coincide
    const { data: partialData, error: partialError } = await supabaseData
      .from('artist_tracks')
      .select('*')
      .ilike('name', `%${normalizedTrackName}%`)
      .limit(50) // Limitar resultados para eficiencia

    if (partialError) {
      console.error('Error en búsqueda parcial:', partialError)
      return null
    }

    if (!partialData || partialData.length === 0) {
      return null
    }

    // Filtrar manualmente por artista y género
    for (const track of partialData as TrackFromDB[]) {
      // Verificar género si se especifica
      if (!matchesGenre(track, genre)) continue

      // Verificar si alguno de los artistas coincide
      const trackArtists = track.artists || []
      const normalizedTrackArtists = trackArtists.map(a => normalizeString(a))
      const artistMain = track.artist_main ? normalizeString(track.artist_main) : null

      if (
        artistMain === normalizedArtistName ||
        normalizedTrackArtists.some(a => 
          a === normalizedArtistName || 
          a.includes(normalizedArtistName) || 
          normalizedArtistName.includes(a)
        )
      ) {
        return track
      }
    }

    return null
  } catch (error) {
    console.error('Error buscando track en DB:', error)
    return null
  }
}

/**
 * Convierte un TrackFromDB a Track (formato esperado por el sistema)
 */
function convertToTrack(trackDb: TrackFromDB): Track {
  return {
    id: trackDb.spotify_id,
    name: trackDb.name,
    artist: trackDb.artist_main || trackDb.artists?.[0] || "Unknown Artist",
    album: trackDb.album || "Unknown Album",
    image: trackDb.cover_url || "/playlist.png",
    duration_ms: trackDb.duration_ms || 0,
    preview_url: trackDb.preview_url || undefined,
    uri: `spotify:track:${trackDb.spotify_id}`,
  }
}

export interface TrackQuery {
  trackName: string
  artistName: string
}

/**
 * Busca tracks específicos en la base de datos en lugar de hacer requests a Spotify
 * Esto elimina completamente el consumo de la API de Spotify
 * @param trackQueries - Lista de tracks a buscar
 * @param genreFilter - Género opcional para filtrar los resultados (trap, rock, pop)
 */
export async function searchTracksFromDB(
  trackQueries: TrackQuery[],
  genreFilter?: string
): Promise<Track[]> {
  const foundTracks: Track[] = []
  const seenTrackIds = new Set<string>()

  const genreInfo = genreFilter ? ` (filtrado por género: ${genreFilter})` : ""
  console.log(`📦 Buscando ${trackQueries.length} tracks en Supabase${genreInfo}...`)

  for (let i = 0; i < trackQueries.length; i++) {
    const query = trackQueries[i]

    try {
      const trackDb = await findTrackInDB(query.trackName, query.artistName, genreFilter)

      if (trackDb && !seenTrackIds.has(trackDb.spotify_id)) {
        seenTrackIds.add(trackDb.spotify_id)
        const track = convertToTrack(trackDb)
        foundTracks.push(track)
        const genreInfo = trackDb.genres ? ` [${trackDb.genres.join(", ")}]` : ""
        console.log(`✅ [${i + 1}/${trackQueries.length}] Encontrado en DB: "${track.name}" de "${track.artist}"${genreInfo}`)
      } else if (!trackDb) {
        console.warn(`❌ [${i + 1}/${trackQueries.length}] No encontrado en DB: "${query.trackName}" de "${query.artistName}"${genreFilter ? ` (o no coincide con género: ${genreFilter})` : ""}`)
      } else {
        console.warn(`⚠️ [${i + 1}/${trackQueries.length}] Track duplicado ignorado: "${query.trackName}"`)
      }
    } catch (error) {
      console.error(`❌ [${i + 1}/${trackQueries.length}] Error procesando "${query.trackName}":`, error)
      continue
    }
  }

  console.log(`🎵 Resultado final desde DB: ${foundTracks.length} de ${trackQueries.length} tracks encontrados${genreFilter ? ` (filtrado por ${genreFilter})` : ""}`)
  return foundTracks
}

/**
 * Obtiene todos los tracks disponibles en la base de datos
 */
export async function getAllTracksFromDB(): Promise<Track[]> {
  try {
    const { data, error } = await supabaseData
      .from('artist_tracks')
      .select('*')

    if (error) {
      console.error('Error obteniendo tracks de DB:', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    return data.map((track: TrackFromDB) => convertToTrack(track))
  } catch (error) {
    console.error('Error obteniendo todos los tracks:', error)
    return []
  }
}

