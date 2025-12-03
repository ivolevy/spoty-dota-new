/**
 * Función para que OpenAI seleccione canciones del catálogo REAL de la base de datos
 * OpenAI recibe la lista completa de tracks y elige de ahí.
 */

import { supabaseData } from "./supabase-data"

export interface SelectedTrack {
  trackName: string
  artistName: string
  reason?: string
}

export interface TrackSelectionResult {
  playlistName: string
  description: string
  tracks: SelectedTrack[]
}

interface TrackFromDB {
  spotify_id: string
  name: string
  artists: string[]
  artist_main: string | null
  genres: string[] | null
}

interface FilterOptions {
  genre?: string
  artists?: string[]
  maxTracks?: number // Límite máximo de tracks a retornar después del filtrado
}

/**
 * Normaliza strings para comparación (case-insensitive, sin acentos)
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
 * Usa la misma lógica que matchesGenre en search-tracks-from-db.ts
 */
function matchesGenreFilter(track: TrackFromDB, genre?: string): boolean {
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
    
    // 2. Coincidencia por palabras completas
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
    
    // 3. Coincidencia por substring (solo si el substring es significativo)
    if (normalizedGenre.length >= 3) {
      if (normalizedTrackGenre.includes(normalizedGenre) || normalizedGenre.includes(normalizedTrackGenre)) {
        return true
      }
    }
    
    return false
  })
}

/**
 * Verifica si un track coincide con alguno de los artistas filtrados
 */
function matchesArtistsFilter(track: TrackFromDB, artists?: string[]): boolean {
  if (!artists || artists.length === 0) return true // Si no hay filtro de artistas, aceptar todos
  
  const normalizedArtists = artists.map(a => normalizeString(a))
  const trackArtistMain = track.artist_main ? normalizeString(track.artist_main) : null
  const trackArtists = (track.artists || []).map(a => normalizeString(a))
  
  // Verificar si el artista principal coincide
  if (trackArtistMain && normalizedArtists.some(a => 
    trackArtistMain === a || 
    trackArtistMain.includes(a) || 
    a.includes(trackArtistMain)
  )) {
    return true
  }
  
  // Verificar si alguno de los artistas del track coincide
  return trackArtists.some(trackArtist => 
    normalizedArtists.some(filterArtist => 
      trackArtist === filterArtist || 
      trackArtist.includes(filterArtist) || 
      filterArtist.includes(trackArtist)
    )
  )
}

/**
 * Carga los tracks de la base de datos, los filtra según criterios y los formatea para OpenAI
 */
async function getAvailableTracks(filters?: FilterOptions): Promise<{ trackName: string; artistName: string; genres: string[] }[]> {
  try {
    const { data, error } = await supabaseData
      .from('artist_tracks')
      .select('spotify_id, name, artists, artist_main, genres')

    if (error) {
      console.error("Error cargando tracks de DB:", error)
      return []
    }

    if (!data || data.length === 0) {
      console.warn("No se encontraron tracks en la base de datos")
      return []
    }

    // Convertir a formato TrackFromDB y aplicar filtros
    let filteredTracks = (data as TrackFromDB[]).filter(track => {
      // Filtrar por género si se especifica
      if (filters?.genre && !matchesGenreFilter(track, filters.genre)) {
        return false
      }
      
      // Filtrar por artistas si se especifica
      if (filters?.artists && filters.artists.length > 0 && !matchesArtistsFilter(track, filters.artists)) {
        return false
      }
      
      return true
    })

    // Limitar cantidad si se especifica
    if (filters?.maxTracks && filters.maxTracks > 0) {
      filteredTracks = filteredTracks.slice(0, filters.maxTracks)
    }

    const totalBefore = data.length
    const totalAfter = filteredTracks.length
    
    if (filters?.genre || filters?.artists) {
      console.log(`🔍 Pre-filtrado: ${totalBefore} → ${totalAfter} tracks (género: ${filters.genre || 'ninguno'}, artistas: ${filters.artists?.length || 0})`)
    }

    return filteredTracks.map((track: TrackFromDB) => ({
      trackName: track.name,
      artistName: track.artist_main || track.artists?.[0] || "Unknown",
      genres: track.genres || []
    }))
  } catch (error) {
    console.error("Error obteniendo tracks de DB:", error)
    return []
  }
}

/**
 * Llama a OpenAI para que seleccione canciones del catálogo REAL
 */
export async function selectTracksWithOpenAI(
  userPrompt: string,
  labelName: string,
  maxTracks: number,
  preferredArtists?: string[],
  genreFilter?: string
): Promise<TrackSelectionResult> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY no está configurada")
  }

  // Pre-filtrar catálogo según género y artistas detectados
  // Esto reduce significativamente los tokens enviados a OpenAI
  const filterOptions: FilterOptions = {
    genre: genreFilter,
    artists: preferredArtists,
    maxTracks: 300 // Límite máximo de tracks a enviar a OpenAI (balance entre opciones y costo)
  }

  // Obtener catálogo REAL de tracks desde la base de datos (ya pre-filtrado)
  const availableTracks = await getAvailableTracks(filterOptions)
  
  if (availableTracks.length === 0) {
    // Si el filtro es muy restrictivo, intentar sin filtros
    if (genreFilter || (preferredArtists && preferredArtists.length > 0)) {
      console.log(`⚠️ Filtro muy restrictivo, intentando sin filtros...`)
      const fallbackTracks = await getAvailableTracks({ maxTracks: 300 })
      if (fallbackTracks.length === 0) {
        throw new Error("No hay tracks disponibles en el catálogo")
      }
      return selectTracksWithOpenAI(userPrompt, labelName, maxTracks, undefined, undefined)
    }
    throw new Error("No hay tracks disponibles en el catálogo")
  }

  // Sistema de scoring/ranking para priorizar tracks más relevantes
  interface ScoredTrack {
    track: { trackName: string; artistName: string; genres: string[] }
    score: number
  }

  const scoredTracks: ScoredTrack[] = availableTracks.map(track => {
    let score = 0
    
    // Match con género detectado: +10 puntos
    if (genreFilter && track.genres.some(g => {
      const normalizedGenre = normalizeString(genreFilter)
      const normalizedTrackGenre = normalizeString(g)
      return normalizedTrackGenre.includes(normalizedGenre) || normalizedGenre.includes(normalizedTrackGenre)
    })) {
      score += 10
    }
    
    // Match con artista preferido: +10 puntos
    if (preferredArtists && preferredArtists.length > 0) {
      const trackArtist = normalizeString(track.artistName)
      if (preferredArtists.some(artist => {
        const normalizedArtist = normalizeString(artist)
        return trackArtist === normalizedArtist || trackArtist.includes(normalizedArtist) || normalizedArtist.includes(trackArtist)
      })) {
        score += 10
      }
    }
    
    // Bonus por tener géneros (más información): +2 puntos
    if (track.genres.length > 0) {
      score += 2
    }
    
    return { track, score }
  })

  // Ordenar por score descendente y tomar top 250 (balance entre relevancia y variedad)
  const topTracks = scoredTracks
    .sort((a, b) => b.score - a.score)
    .slice(0, 250)
    .map(st => st.track)

  console.log(`📊 Scoring aplicado: ${availableTracks.length} tracks → top ${topTracks.length} por relevancia`)

  // Formatear catálogo optimizado para OpenAI (formato más compacto)
  const catalogList = topTracks.map((t, i) => 
    `${i + 1}. ${t.trackName}|${t.artistName}|${t.genres.join(",")}`
  ).join("\n")

  const functionDefinition = {
    name: "selectPlaylistTracks",
    description: `Selecciona canciones del catálogo proporcionado para crear una playlist personalizada.`,
    parameters: {
      type: "object",
      properties: {
        playlistName: {
          type: "string",
          description: "Nombre sugerido para la playlist (máximo 50 caracteres)"
        },
        description: {
          type: "string",
          description: "Descripción breve de la playlist (máximo 200 caracteres)"
        },
        tracks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              trackName: {
                type: "string",
                description: "Nombre EXACTO de la canción TAL COMO aparece en el catálogo"
              },
              artistName: {
                type: "string",
                description: "Nombre EXACTO del artista TAL COMO aparece en el catálogo"
              },
              reason: {
                type: "string",
                description: "Breve explicación de por qué se seleccionó esta canción"
              }
            },
            required: ["trackName", "artistName"]
          },
          description: `Array de ${maxTracks} canciones seleccionadas del catálogo.`
        }
      },
      required: ["playlistName", "description", "tracks"]
    }
  }

  const artistInstruction = preferredArtists && preferredArtists.length > 0
    ? `\n\nARTISTAS PREFERIDOS DEL USUARIO: ${preferredArtists.join(", ")}
IMPORTANTE: Si el usuario menciona artistas específicos, prioriza canciones de esos artistas.
Puedes incluir canciones de otros artistas también, pero asegúrate de incluir varias canciones de los artistas mencionados.`
    : ""

  const systemMessage = `Eres un curador de música para un sello discográfico. Tu objetivo es crear playlists que promocionen el catálogo completo de manera equitativa, asegurando que todos los artistas y tracks tengan exposición.

REGLAS CRÍTICAS:
1. SOLO puedes elegir canciones que aparecen EXACTAMENTE en el catálogo proporcionado
2. Los nombres de tracks y artistas deben ser EXACTOS (formato: "TrackName|ArtistName|genres")
3. NO inventes canciones que no estén en el catálogo
4. Selecciona canciones que se ajusten al mood/género/actividad del prompt del usuario

OBJETIVOS DE PROMOCIÓN DEL SELLO:
- Distribuye equitativamente entre TODOS los artistas del catálogo
- Máximo 2-3 canciones por artista en esta playlist
- Prioriza artistas con menos exposición cuando sea posible
- Varía entre tracks populares y emergentes
- Balancea géneros si no hay filtro específico

GÉNEROS EN EL CATÁLOGO:
- TRAP: Música urbana, trap latino, rap
- ROCK: Rock argentino, rock nacional
- POP: Pop latino, pop urbano, baladas

ESTRUCTURA DE PLAYLIST:
- Inicio: Canciones que establezcan el mood (suaves o energéticas según el prompt)
- Desarrollo: Varía la energía y mantén el interés
- Cierre: Canciones memorables que dejen buena impresión

Si el usuario pide un género específico, prioriza canciones de ese género pero también incluye variedad.${artistInstruction}`

  const artistTaskInstruction = preferredArtists && preferredArtists.length > 0
    ? `\n- PRIORIDAD: El usuario mencionó los siguientes artistas: ${preferredArtists.join(", ")}. Incluye varias canciones de estos artistas en la playlist.`
    : ""

  const userMessage = `PROMPT DEL USUARIO: "${userPrompt}"

CATÁLOGO DISPONIBLE (formato: TrackName|ArtistName|genres):
${catalogList}

TAREA:
Selecciona EXACTAMENTE ${maxTracks} canciones del catálogo anterior que se ajusten al prompt del usuario.

INSTRUCCIONES DE SELECCIÓN:
- Los nombres deben ser EXACTOS como aparecen arriba (formato: TrackName|ArtistName|genres)
- Distribuye equitativamente entre artistas (máximo 2-3 canciones por artista)
- Varía los artistas para tener diversidad y promocionar todo el catálogo
- Crea un flujo musical coherente: inicio → desarrollo → cierre
- Si el usuario pide un género, prioriza ese género pero incluye variedad${artistTaskInstruction}

IMPORTANTE: 
- Separa los campos con "|" cuando copies del catálogo
- Ejemplo: Si ves "Song Name|Artist Name|rock,pop" → trackName="Song Name", artistName="Artist Name"

Usa la función selectPlaylistTracks para devolver las ${maxTracks} canciones.`

  try {
    console.log(`🤖 OpenAI seleccionando ${maxTracks} canciones del catálogo (${topTracks.length} tracks pre-filtrados y rankeados de ${availableTracks.length} totales)...`)
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        functions: [functionDefinition],
        function_call: { name: "selectPlaylistTracks" },
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }
      throw new Error(`OpenAI API error: ${response.status} ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    const functionCall = data.choices?.[0]?.message?.function_call

    if (!functionCall || functionCall.name !== "selectPlaylistTracks") {
      throw new Error("OpenAI no devolvió la función esperada")
    }

    const result = JSON.parse(functionCall.arguments)

    if (!result.playlistName || !result.tracks || !Array.isArray(result.tracks)) {
      throw new Error("OpenAI no devolvió el formato esperado")
    }

    // Validar y limpiar tracks
    const validTracks = result.tracks
      .filter((t: any) => {
        const isValid = t && 
          t.trackName && 
          typeof t.trackName === 'string' && 
          t.trackName.trim().length > 0 &&
          t.artistName && 
          typeof t.artistName === 'string' && 
          t.artistName.trim().length > 0
        
        if (!isValid) {
          console.warn(`⚠️ Track inválido recibido de OpenAI:`, t)
        }
        return isValid
      })
      .map((t: any) => ({
        trackName: String(t.trackName).trim(),
        artistName: String(t.artistName).trim(),
        reason: t.reason ? String(t.reason).trim() : undefined
      }))

    if (validTracks.length === 0) {
      throw new Error(`OpenAI no devolvió tracks válidos`)
    }

    console.log(`✅ OpenAI seleccionó ${validTracks.length} canciones del catálogo`)

    return {
      playlistName: result.playlistName,
      description: result.description || "Playlist generada con IA",
      tracks: validTracks
    }

  } catch (error) {
    console.error("Error llamando a OpenAI API:", error)
    throw error
  }
}
