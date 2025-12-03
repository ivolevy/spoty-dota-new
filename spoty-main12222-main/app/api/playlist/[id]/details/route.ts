import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

/**
 * API Route para obtener los detalles actualizados de una playlist desde Spotify
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

    // Obtener detalles actualizados de la playlist desde Spotify
    const playlistResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      }
    )

    if (!playlistResponse.ok) {
      const errorText = await playlistResponse.text()
      return NextResponse.json(
        { error: `Error obteniendo playlist: ${playlistResponse.status} ${errorText}` },
        { status: playlistResponse.status }
      )
    }

    const spotifyData = await playlistResponse.json()

    return NextResponse.json({
      success: true,
      playlist: {
        followers: spotifyData.followers?.total || 0,
        tracks_count: spotifyData.tracks?.total || 0,
        public: spotifyData.public || false,
        collaborative: spotifyData.collaborative || false,
        // Nota: Spotify API no proporciona views ni saves
        // Estos datos no están disponibles en la API pública de Spotify
      },
    })
  } catch (error) {
    console.error("Error obteniendo detalles de playlist:", error)
    return NextResponse.json(
      {
        error: "Error obteniendo detalles de la playlist",
        message: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}

/**
 * API Route para actualizar los detalles de una playlist en Spotify
 * Soporta: name, description, public
 */
export async function PUT(
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
    const { name, description, public: isPublic } = body

    // Construir el objeto de actualización
    const updateData: { name?: string; description?: string; public?: boolean } = {}
    
    if (name !== undefined && name.trim()) {
      updateData.name = name.trim()
    }
    if (description !== undefined) {
      updateData.description = description
    }
    if (isPublic !== undefined) {
      updateData.public = isPublic
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No hay datos para actualizar" },
        { status: 400 }
      )
    }

    // Actualizar playlist en Spotify
    const updateResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      }
    )

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error("Error actualizando playlist:", updateResponse.status, errorText)
      return NextResponse.json(
        { error: `Error actualizando playlist: ${updateResponse.status}`, details: errorText },
        { status: updateResponse.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Playlist actualizada correctamente",
      updated: updateData,
    })
  } catch (error) {
    console.error("Error actualizando playlist:", error)
    return NextResponse.json(
      {
        error: "Error actualizando la playlist",
        message: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}
