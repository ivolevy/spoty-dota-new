import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { spotifyApiRequest } from "@/lib/spotify"
import { deletePlaylist as deletePlaylistFromDB } from "@/lib/supabase-playlists"
import { getUserBySpotifyId } from "@/lib/supabase-users"

/**
 * API Route para eliminar una playlist (dejar de seguir en Spotify y borrar de BD)
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get("spotify_access_token")?.value
    const spotifyUserId = cookieStore.get("spotify_user_id")?.value

    if (!accessToken) {
      return NextResponse.json(
        { error: "No autenticado. Por favor conecta tu cuenta de Spotify." },
        { status: 401 }
      )
    }

    if (!spotifyUserId) {
      return NextResponse.json(
        { error: "Usuario no identificado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { playlistId } = body

    if (!playlistId) {
      return NextResponse.json(
        { error: "ID de playlist requerido" },
        { status: 400 }
      )
    }

    // 1. Verificar que la playlist pertenece al usuario
    const dbUser = await getUserBySpotifyId(spotifyUserId)
    if (!dbUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado en la base de datos" },
        { status: 404 }
      )
    }

    // 2. Dejar de seguir la playlist en Spotify (unfollow)
    // Nota: Spotify no permite borrar playlists directamente con la API,
    // solo podemos dejar de seguirla (unfollow)
    try {
      const unfollowResponse = await spotifyApiRequest(
        `/playlists/${playlistId}/followers`,
        accessToken,
        {
          method: "DELETE",
        }
      )

      if (!unfollowResponse.ok && unfollowResponse.status !== 404) {
        // 404 significa que la playlist ya no existe o no la seguimos, está bien
        const errorText = await unfollowResponse.text()
        console.warn(`[delete-playlist] Advertencia al dejar de seguir playlist: ${unfollowResponse.status} ${errorText}`)
      }
    } catch (spotifyError) {
      console.error("[delete-playlist] Error dejando de seguir playlist en Spotify:", spotifyError)
      // Continuamos aunque falle, para intentar borrar de la BD de todas formas
    }

    // 3. Borrar de la base de datos
    try {
      await deletePlaylistFromDB(playlistId)
      console.log(`[delete-playlist] ✅ Playlist ${playlistId} eliminada de la base de datos`)
    } catch (dbError) {
      console.error("[delete-playlist] Error eliminando playlist de BD:", dbError)
      // Si falla la BD pero Spotify funcionó, aún retornamos éxito parcial
      // porque la playlist ya no está siendo seguida
    }

    return NextResponse.json({
      success: true,
      message: "Playlist eliminada exitosamente",
    })
  } catch (error) {
    console.error("Error eliminando playlist:", error)
    return NextResponse.json(
      {
        error: "Error eliminando playlist",
        message: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}

