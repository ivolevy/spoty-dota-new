/**
 * Busca tracks desde el archivo tracks.json en lugar de hacer requests a Spotify
 * Esto elimina completamente el consumo de la API de Spotify
 */

import type { Track } from "./search-daleplay"
import { readFileSync } from "fs"
import { join } from "path"

// Cargar tracks.json una vez al importar el módulo
let tracksData: TracksJSON | null = null

function loadTracksData(): TracksJSON {
  if (!tracksData) {
    try {
      const filePath = join(process.cwd(), "tracks.json")
      const fileContent = readFileSync(filePath, "utf-8")
      tracksData = JSON.parse(fileContent) as TracksJSON
      console.log(`📦 Cargados ${tracksData.tracks.length} tracks desde tracks.json`)
    } catch (error) {
      console.error("❌ Error cargando tracks.json:", error)
      throw new Error("No se pudo cargar tracks.json")
    }
  }
  return tracksData
}

interface TrackFromJSON {
  id: string
  name: string
  artists: string[]
  album: string
  album_id: string
  label: string
  release_date: string
  duration_ms: number
  popularity: number
  external_urls: {
    spotify: string
  }
  preview_url: string | null
  genres?: string[]
}

interface TracksJSON {
  metadata: {
    label_search: string
    description: string
    total_unique_tracks: number
    search_date: string
  }
  tracks: TrackFromJSON[]
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
 */
function matchesGenre(track: TrackFromJSON, genre?: string): boolean {
  if (!genre) return true // Si no hay filtro de género, aceptar todos
  
  const normalizedGenre = normalizeString(genre)
  const trackGenres = track.genres || []
  
  return trackGenres.some(g => normalizeString(g) === normalizedGenre)
}

/**
 * Busca un track en el JSON por nombre y artista, opcionalmente filtrado por género
 */
function findTrackInJSON(
  trackName: string,
  artistName: string,
  genre?: string
): TrackFromJSON | null {
  const data = loadTracksData()
  const normalizedTrackName = normalizeString(trackName)
  const normalizedArtistName = normalizeString(artistName)

  // Buscar por nombre exacto del track y artista
  for (const track of data.tracks) {
    // Filtrar por género si se especifica
    if (!matchesGenre(track, genre)) continue
    
    const normalizedTrack = normalizeString(track.name)
    const normalizedArtists = track.artists.map(a => normalizeString(a))

    // Verificar si el nombre del track coincide
    if (normalizedTrack === normalizedTrackName) {
      // Verificar si alguno de los artistas coincide
      if (normalizedArtists.some(a => a === normalizedArtistName)) {
        return track
      }
    }
  }

  // Si no encuentra exacto, buscar por coincidencia parcial del nombre
  for (const track of data.tracks) {
    // Filtrar por género si se especifica
    if (!matchesGenre(track, genre)) continue
    
    const normalizedTrack = normalizeString(track.name)
    const normalizedArtists = track.artists.map(a => normalizeString(a))

    // Buscar si el nombre contiene el término buscado
    if (normalizedTrack.includes(normalizedTrackName) || 
        normalizedTrackName.includes(normalizedTrack)) {
      // Verificar si alguno de los artistas coincide parcialmente
      if (normalizedArtists.some(a => 
        a === normalizedArtistName || 
        a.includes(normalizedArtistName) || 
        normalizedArtistName.includes(a)
      )) {
        return track
      }
    }
  }

  return null
}

/**
 * Convierte un TrackFromJSON a Track (formato esperado por el sistema)
 */
function convertToTrack(trackJson: TrackFromJSON): Track {
  return {
    id: trackJson.id,
    name: trackJson.name,
    artist: trackJson.artists[0] || "Unknown Artist",
    album: trackJson.album,
    image: "/playlist.png", // Imagen por defecto, puedes mejorarlo si tienes URLs de imágenes
    duration_ms: trackJson.duration_ms,
    preview_url: trackJson.preview_url || undefined,
    uri: `spotify:track:${trackJson.id}`,
  }
}

export interface TrackQuery {
  trackName: string
  artistName: string
}

/**
 * Busca tracks específicos en el JSON en lugar de hacer requests a Spotify
 * Esto elimina completamente el consumo de la API de Spotify
 * @param trackQueries - Lista de tracks a buscar
 * @param genreFilter - Género opcional para filtrar los resultados (trap, rock, pop)
 */
export async function searchTracksFromJSON(
  trackQueries: TrackQuery[],
  genreFilter?: string
): Promise<Track[]> {
  const foundTracks: Track[] = []
  const seenTrackIds = new Set<string>()

  const genreInfo = genreFilter ? ` (filtrado por género: ${genreFilter})` : ""
  console.log(`📦 Buscando ${trackQueries.length} tracks en tracks.json${genreInfo}...`)

  for (let i = 0; i < trackQueries.length; i++) {
    const query = trackQueries[i]

    try {
      const trackJson = findTrackInJSON(query.trackName, query.artistName, genreFilter)

      if (trackJson && !seenTrackIds.has(trackJson.id)) {
        seenTrackIds.add(trackJson.id)
        const track = convertToTrack(trackJson)
        foundTracks.push(track)
        const genreInfo = trackJson.genres ? ` [${trackJson.genres.join(", ")}]` : ""
        console.log(`✅ [${i + 1}/${trackQueries.length}] Encontrado en JSON: "${track.name}" de "${track.artist}"${genreInfo}`)
      } else if (!trackJson) {
        console.warn(`❌ [${i + 1}/${trackQueries.length}] No encontrado en JSON: "${query.trackName}" de "${query.artistName}"${genreFilter ? ` (o no coincide con género: ${genreFilter})` : ""}`)
      } else {
        console.warn(`⚠️ [${i + 1}/${trackQueries.length}] Track duplicado ignorado: "${query.trackName}"`)
      }
    } catch (error) {
      console.error(`❌ [${i + 1}/${trackQueries.length}] Error procesando "${query.trackName}":`, error)
      continue
    }
  }

  console.log(`🎵 Resultado final desde JSON: ${foundTracks.length} de ${trackQueries.length} tracks encontrados${genreFilter ? ` (filtrado por ${genreFilter})` : ""}`)
  return foundTracks
}

/**
 * Obtiene todos los tracks disponibles en el JSON
 */
export function getAllTracksFromJSON(): Track[] {
  const data = loadTracksData()
  return data.tracks.map(convertToTrack)
}

