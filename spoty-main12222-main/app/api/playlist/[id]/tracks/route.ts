import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

/**
 * API Route para obtener los tracks de una playlist específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get("spotify_access_token")?.value
    const { id: playlistId } = await params

    if (!accessToken) {
      return NextResponse.json(
        { error: "No autenticado. Por favor conecta tu cuenta de Spotify." },
        { status: 401 }
      )
    }

    if (!playlistId) {
      return NextResponse.json(
        { error: "ID de playlist requerido" },
        { status: 400 }
      )
    }

    // Obtener tracks de la playlist desde Spotify
    const tracksResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&market=US`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      }
    )

    if (!tracksResponse.ok) {
      const errorText = await tracksResponse.text()
      return NextResponse.json(
        { error: `Error obteniendo tracks: ${tracksResponse.status} ${errorText}` },
        { status: tracksResponse.status }
      )
    }

    const tracksData = await tracksResponse.json()

    // Formatear tracks para el frontend
    const tracks = tracksData.items
      .filter((item: any) => item.track && !item.track.is_local) // Filtrar tracks locales
      .map((item: any, index: number) => {
        const track = item.track
        return {
          id: track.id,
          name: track.name,
          artist: track.artists?.[0]?.name || "Unknown Artist",
          album: track.album?.name || "Unknown Album",
          image: track.album?.images?.[0]?.url || "/playlist.png",
          duration_ms: track.duration_ms || 0,
          preview_url: track.preview_url || null,
          uri: track.uri,
          added_at: item.added_at,
          position: index,
        }
      })

    return NextResponse.json({
      success: true,
      tracks,
      total: tracksData.total || tracks.length,
    })
  } catch (error) {
    console.error("Error obteniendo tracks de playlist:", error)
    return NextResponse.json(
      {
        error: "Error obteniendo tracks de la playlist",
        message: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}

/**
 * API Route para agregar tracks a una playlist
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get("spotify_access_token")?.value
    const { id: playlistId } = await params

    if (!accessToken) {
      return NextResponse.json(
        { error: "No autenticado. Por favor conecta tu cuenta de Spotify." },
        { status: 401 }
      )
    }

    if (!playlistId) {
      return NextResponse.json(
        { error: "ID de playlist requerido" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { uris } = body

    if (!uris || !Array.isArray(uris) || uris.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de URIs de tracks" },
        { status: 400 }
      )
    }

    // Validar y limpiar URIs
    const validUris = uris
      .filter((uri: string) => uri && typeof uri === 'string')
      .map((uri: string) => {
        // Si es solo un ID, convertir a URI
        if (!uri.startsWith('spotify:track:')) {
          return `spotify:track:${uri}`
        }
        return uri
      })
      .filter((uri: string) => uri.startsWith('spotify:track:'))

    if (validUris.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron URIs válidos" },
        { status: 400 }
      )
    }

    console.log(`[POST tracks] Agregando ${validUris.length} tracks a playlist ${playlistId}`)
    console.log(`[POST tracks] URIs:`, validUris.slice(0, 3), '...')

    // Agregar tracks a la playlist en Spotify
    const addResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: validUris }),
      }
    )

    if (!addResponse.ok) {
      const errorText = await addResponse.text()
      console.error(`[POST tracks] Error de Spotify (${addResponse.status}):`, errorText)
      
      // Intentar parsear el error de Spotify
      let spotifyError = "Error desconocido de Spotify"
      try {
        const errorJson = JSON.parse(errorText)
        spotifyError = errorJson.error?.message || errorText
      } catch {
        spotifyError = errorText
      }
      
      return NextResponse.json(
        { error: spotifyError, status: addResponse.status },
        { status: addResponse.status }
      )
    }

    const result = await addResponse.json()

    return NextResponse.json({
      success: true,
      snapshot_id: result.snapshot_id,
      added: uris.length,
    })
  } catch (error) {
    console.error("Error agregando tracks a playlist:", error)
    return NextResponse.json(
      {
        error: "Error agregando tracks a la playlist",
        message: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}

