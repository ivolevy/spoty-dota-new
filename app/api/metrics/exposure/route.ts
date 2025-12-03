import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAllArtistsFromDB, getAllTracksFromDB } from "@/lib/search-tracks-from-db"

export const dynamic = 'force-dynamic'

/**
 * API Route para obtener métricas de exposición del catálogo
 * Compara qué artistas/tracks aparecen en playlists vs catálogo completo
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Obtener token de acceso de las cookies
    const cookieStore = await cookies()
    const accessToken = cookieStore.get("spotify_access_token")?.value

    if (!accessToken) {
      return NextResponse.json(
        { error: "No autenticado. Por favor conecta tu cuenta de Spotify." },
        { status: 401 }
      )
    }

    // 2. Obtener todas las playlists del usuario desde Supabase
    const { supabase } = await import('@/lib/supabase')
    const { data: playlistsData, error: playlistsError } = await supabase
      .from('playlists')
      .select('spotify_playlist_id')
      .order('created_at', { ascending: false })

    if (playlistsError) {
      throw new Error("Error obteniendo playlists")
    }

    const playlists = playlistsData || []

    // 3. Obtener todos los tracks de las playlists desde Spotify API
    const allPlaylistTracks: Array<{ id: string; artist: string; name: string }> = []
    
    for (const playlist of playlists) {
      try {
        const tracksResponse = await fetch(
          `https://api.spotify.com/v1/playlists/${playlist.spotify_playlist_id}/tracks?limit=100`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        )

        if (tracksResponse.ok) {
          const tracksData = await tracksResponse.json()
          const tracks = tracksData.items || []
          
          tracks.forEach((item: any) => {
            if (item.track && !item.track.is_local && item.track.id) {
              allPlaylistTracks.push({
                id: item.track.id,
                artist: item.track.artists?.[0]?.name || 'Unknown',
                name: item.track.name
              })
            }
          })

          // Manejar paginación si hay más de 100 tracks
          let nextUrl = tracksData.next
          while (nextUrl) {
            const nextResponse = await fetch(nextUrl, {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            })
            if (nextResponse.ok) {
              const nextData = await nextResponse.json()
              nextData.items?.forEach((item: any) => {
                if (item.track && !item.track.is_local && item.track.id) {
                  allPlaylistTracks.push({
                    id: item.track.id,
                    artist: item.track.artists?.[0]?.name || 'Unknown',
                    name: item.track.name
                  })
                }
              })
              nextUrl = nextData.next
            } else {
              break
            }
          }
        }
      } catch (error) {
        console.error(`Error obteniendo tracks de playlist ${playlist.spotify_playlist_id}:`, error)
      }
    }

    // 4. Obtener catálogo completo de la base de datos
    const catalogArtists = await getAllArtistsFromDB()
    const catalogTracks = await getAllTracksFromDB()

    // 5. Calcular métricas de exposición
    // Artistas que aparecieron en playlists
    const artistsInPlaylists = new Set<string>()
    allPlaylistTracks.forEach(track => {
      if (track.artist && track.artist !== 'Unknown') {
        artistsInPlaylists.add(track.artist)
      }
    })

    // Tracks que aparecieron en playlists (por spotify_id)
    const tracksInPlaylists = new Set<string>()
    allPlaylistTracks.forEach(track => {
      if (track.id) {
        tracksInPlaylists.add(track.id)
      }
    })

    // Contar frecuencia de aparición por artista
    const artistFrequency = new Map<string, number>()
    allPlaylistTracks.forEach(track => {
      if (track.artist && track.artist !== 'Unknown') {
        artistFrequency.set(track.artist, (artistFrequency.get(track.artist) || 0) + 1)
      }
    })

    // Contar frecuencia de aparición por track
    const trackFrequency = new Map<string, number>()
    allPlaylistTracks.forEach(track => {
      if (track.id) {
        trackFrequency.set(track.id, (trackFrequency.get(track.id) || 0) + 1)
      }
    })

    // Artistas que NO aparecieron en ninguna playlist
    const artistsNotInPlaylists = catalogArtists.filter(artist => !artistsInPlaylists.has(artist))

    // Tracks que NO aparecieron en ninguna playlist
    const tracksNotInPlaylists = catalogTracks.filter(track => !tracksInPlaylists.has(track.id))

    // Distribución de géneros en playlists
    const genreDistribution = new Map<string, number>()
    catalogTracks.forEach(track => {
      if (tracksInPlaylists.has(track.id)) {
        // Necesitamos obtener géneros del track desde la BD
        // Por ahora, usamos un enfoque simplificado
      }
    })

    // Calcular estadísticas
    const artistExposureStats = catalogArtists.map(artist => ({
      name: artist,
      appeared: artistsInPlaylists.has(artist),
      frequency: artistFrequency.get(artist) || 0,
      playlistsCount: 0 // Se puede calcular si se trackea por playlist
    })).sort((a, b) => b.frequency - a.frequency)

    const trackExposureStats = catalogTracks.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artist,
      appeared: tracksInPlaylists.has(track.id),
      frequency: trackFrequency.get(track.id) || 0
    })).sort((a, b) => b.frequency - a.frequency)

    // Métricas resumidas
    const metrics = {
      catalog: {
        totalArtists: catalogArtists.length,
        totalTracks: catalogTracks.length
      },
      exposure: {
        artistsAppeared: artistsInPlaylists.size,
        artistsNotAppeared: artistsNotInPlaylists.length,
        artistsExposureRate: catalogArtists.length > 0 
          ? Math.round((artistsInPlaylists.size / catalogArtists.length) * 100) 
          : 0,
        tracksAppeared: tracksInPlaylists.size,
        tracksNotAppeared: tracksNotInPlaylists.length,
        tracksExposureRate: catalogTracks.length > 0
          ? Math.round((tracksInPlaylists.size / catalogTracks.length) * 100)
          : 0
      },
      distribution: {
        topArtists: artistExposureStats.slice(0, 20),
        artistsWithNoExposure: artistsNotInPlaylists.slice(0, 20),
        topTracks: trackExposureStats.slice(0, 20),
        tracksWithNoExposure: tracksNotInPlaylists.slice(0, 20).map(t => ({
          id: t.id,
          name: t.name,
          artist: t.artist
        }))
      },
      rotation: {
        avgTracksPerArtist: artistFrequency.size > 0
          ? Math.round(Array.from(artistFrequency.values()).reduce((a, b) => a + b, 0) / artistFrequency.size)
          : 0,
        avgFrequencyPerTrack: trackFrequency.size > 0
          ? Math.round(Array.from(trackFrequency.values()).reduce((a, b) => a + b, 0) / trackFrequency.size)
          : 0,
        mostUsedTrack: trackExposureStats[0] || null,
        leastUsedArtists: artistExposureStats.filter(a => a.frequency > 0).slice(-10).reverse()
      }
    }

    return NextResponse.json({
      success: true,
      metrics
    })

  } catch (error) {
    console.error("Error calculando métricas de exposición:", error)
    
    return NextResponse.json(
      {
        error: "Error calculando métricas de exposición",
        message: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}

