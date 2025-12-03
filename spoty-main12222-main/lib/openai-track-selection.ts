/**
 * Función para que OpenAI seleccione canciones del catálogo REAL de la base de datos
 * OpenAI recibe la lista completa de tracks y elige de ahí.
 */

import { supabase } from "./supabase"

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

/**
 * Carga los tracks de la base de datos y los formatea para OpenAI
 */
async function getAvailableTracks(): Promise<{ trackName: string; artistName: string; genres: string[] }[]> {
  try {
    const { data, error } = await supabase
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

    return data.map((track: TrackFromDB) => ({
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
  maxTracks: number
): Promise<TrackSelectionResult> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY no está configurada")
  }

  // Obtener catálogo REAL de tracks desde la base de datos
  const availableTracks = await getAvailableTracks()
  
  if (availableTracks.length === 0) {
    throw new Error("No hay tracks disponibles en el catálogo")
  }

  // Formatear catálogo para OpenAI
  const catalogList = availableTracks.map((t, i) => 
    `${i + 1}. "${t.trackName}" - ${t.artistName} [${t.genres.join(", ")}]`
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

  const systemMessage = `Eres un curador de música experto. Tu tarea es seleccionar canciones de un catálogo específico para crear playlists personalizadas.

REGLAS CRÍTICAS:
1. SOLO puedes elegir canciones que aparecen EXACTAMENTE en el catálogo proporcionado
2. Los nombres de tracks y artistas deben ser EXACTOS (copia y pega del catálogo)
3. NO inventes canciones que no estén en el catálogo
4. Selecciona canciones que se ajusten al mood/género/actividad del prompt del usuario

GÉNEROS EN EL CATÁLOGO:
- TRAP: Música urbana, trap latino, rap
- ROCK: Rock argentino, rock nacional
- POP: Pop latino, pop urbano, baladas

Si el usuario pide un género específico, prioriza canciones de ese género.`

  const userMessage = `PROMPT DEL USUARIO: "${userPrompt}"

CATÁLOGO DISPONIBLE (SOLO puedes elegir de esta lista):
${catalogList}

TAREA:
Selecciona ${maxTracks} canciones del catálogo anterior que se ajusten al prompt del usuario.
- Los nombres deben ser EXACTOS como aparecen arriba
- Varía los artistas para tener diversidad
- Si el usuario pide un género, prioriza ese género

Usa la función selectPlaylistTracks para devolver las ${maxTracks} canciones.`

  try {
    console.log(`🤖 OpenAI seleccionando ${maxTracks} canciones del catálogo (${availableTracks.length} disponibles)...`)
    
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
