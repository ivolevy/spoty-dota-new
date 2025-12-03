import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAllArtistsFromDB, getAllTracksFromDB } from "@/lib/search-tracks-from-db"
import { supabaseData } from "@/lib/supabase-data"

export const dynamic = 'force-dynamic'

/**
 * API Route para obtener métricas de negocio avanzadas
 * Métricas que ayudan a tomar decisiones estratégicas y optimizar ROI
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

    // 2. Obtener todas las playlists del usuario desde Supabase con followers
    const { supabase } = await import('@/lib/supabase')
    const { data: playlistsData, error: playlistsError } = await supabase
      .from('playlists')
      .select('spotify_playlist_id, created_at')
      .order('created_at', { ascending: false })

    if (playlistsError) {
      throw new Error("Error obteniendo playlists")
    }

    const playlists = playlistsData || []

    // 3. Obtener tracks de playlists con información de followers
    interface PlaylistTrackData {
      trackId: string
      artist: string
      trackName: string
      playlistId: string
      playlistFollowers: number
      playlistCreatedAt: string
    }

    const playlistTracksData: PlaylistTrackData[] = []
    
    for (const playlist of playlists) {
      try {
        // Obtener info de la playlist desde Spotify
        const playlistInfoResponse = await fetch(
          `https://api.spotify.com/v1/playlists/${playlist.spotify_playlist_id}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        )

        let playlistFollowers = 0
        if (playlistInfoResponse.ok) {
          const playlistInfo = await playlistInfoResponse.json()
          playlistFollowers = playlistInfo.followers?.total || 0
        }

        // Obtener tracks
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
              playlistTracksData.push({
                trackId: item.track.id,
                artist: item.track.artists?.[0]?.name || 'Unknown',
                trackName: item.track.name,
                playlistId: playlist.spotify_playlist_id,
                playlistFollowers,
                playlistCreatedAt: playlist.created_at
              })
            }
          })

          // Paginación
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
                  playlistTracksData.push({
                    trackId: item.track.id,
                    artist: item.track.artists?.[0]?.name || 'Unknown',
                    trackName: item.track.name,
                    playlistId: playlist.spotify_playlist_id,
                    playlistFollowers,
                    playlistCreatedAt: playlist.created_at
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
        console.error(`Error obteniendo datos de playlist ${playlist.spotify_playlist_id}:`, error)
      }
    }

    // 4. Obtener catálogo completo con metadata
    const catalogTracks = await getAllTracksFromDB()
    const catalogArtists = await getAllArtistsFromDB()

    // Obtener metadata adicional de tracks desde BD
    const { data: tracksMetadata } = await supabaseData
      .from('artist_tracks')
      .select('spotify_id, release_date, genres')

    const tracksMetadataMap = new Map<string, { release_date: string | null; genres: string[] }>()
    tracksMetadata?.forEach((track: any) => {
      tracksMetadataMap.set(track.spotify_id, {
        release_date: track.release_date,
        genres: track.genres || []
      })
    })

    // 5. Calcular métricas de negocio

    // Normalizar nombres de artistas para matching correcto
    const normalizeArtistName = (name: string): string => {
      return name.toLowerCase().trim()
    }

    // Agrupar tracks por artista normalizado desde catálogo
    const catalogTracksByArtist = new Map<string, Set<string>>()
    catalogTracks.forEach(track => {
      const normalizedArtist = normalizeArtistName(track.artist)
      if (!catalogTracksByArtist.has(normalizedArtist)) {
        catalogTracksByArtist.set(normalizedArtist, new Set())
      }
      catalogTracksByArtist.get(normalizedArtist)!.add(track.id)
    })

    // Agrupar tracks promocionados por artista normalizado
    const promotedTracksByArtist = new Map<string, {
      trackIds: Set<string>
      playlistFollowers: Map<string, number> // playlistId -> followers (para evitar duplicados)
      totalAppearances: number
    }>()

    playlistTracksData.forEach(pt => {
      const normalizedArtist = normalizeArtistName(pt.artist)
      if (!promotedTracksByArtist.has(normalizedArtist)) {
        promotedTracksByArtist.set(normalizedArtist, {
          trackIds: new Set(),
          playlistFollowers: new Map(),
          totalAppearances: 0
        })
      }
      const artistData = promotedTracksByArtist.get(normalizedArtist)!
      artistData.trackIds.add(pt.trackId)
      artistData.totalAppearances++
      // Solo contar followers únicos por playlist (el máximo)
      const currentFollowers = artistData.playlistFollowers.get(pt.playlistId) || 0
      if (pt.playlistFollowers > currentFollowers) {
        artistData.playlistFollowers.set(pt.playlistId, pt.playlistFollowers)
      }
    })

    // Calcular métricas por artista
    const artistROI = new Map<string, {
      name: string
      tracksInCatalog: number
      tracksPromoted: number
      totalFollowersReached: number
      avgFollowersPerTrack: number
      avgAppearancesPerTrack: number
      efficiency: number // % de tracks promocionados (máximo 100%)
      playlistsCount: number
    }>()

    catalogArtists.forEach(artist => {
      const normalizedArtist = normalizeArtistName(artist)
      const tracksInCatalog = catalogTracksByArtist.get(normalizedArtist)?.size || 0
      const promotedData = promotedTracksByArtist.get(normalizedArtist)
      
      if (!promotedData) {
        // Artista sin promoción
        artistROI.set(artist, {
          name: artist,
          tracksInCatalog,
          tracksPromoted: 0,
          totalFollowersReached: 0,
          avgFollowersPerTrack: 0,
          avgAppearancesPerTrack: 0,
          efficiency: 0,
          playlistsCount: 0
        })
        return
      }

      const tracksPromoted = promotedData.trackIds.size
      const totalFollowersReached = Array.from(promotedData.playlistFollowers.values())
        .reduce((sum, followers) => sum + followers, 0)
      const playlistsCount = promotedData.playlistFollowers.size

      // Calcular eficiencia (asegurar que no exceda 100%)
      const efficiency = tracksInCatalog > 0
        ? Math.min(100, Math.round((tracksPromoted / tracksInCatalog) * 100))
        : 0

      artistROI.set(artist, {
        name: artist,
        tracksInCatalog,
        tracksPromoted,
        totalFollowersReached,
        avgFollowersPerTrack: tracksPromoted > 0
          ? Math.round(totalFollowersReached / tracksPromoted)
          : 0,
        avgAppearancesPerTrack: tracksPromoted > 0
          ? Math.round(promotedData.totalAppearances / tracksPromoted)
          : 0,
        efficiency,
        playlistsCount
      })
    })

    // ROI por track: followers alcanzados por track (contando followers únicos por playlist)
    const trackROI = new Map<string, {
      id: string
      name: string
      artist: string
      frequency: number
      totalFollowersReached: number
      avgFollowersPerAppearance: number
      playlistsCount: number
      releaseDate: string | null
      isNew: boolean
      playlistFollowersMap?: Map<string, number> // Temporal para cálculo
      playlistIds?: Set<string> // Temporal para contar playlists únicas
    }>()

    playlistTracksData.forEach(pt => {
      const existing = trackROI.get(pt.trackId)
      
      if (!existing) {
        const releaseDate = tracksMetadataMap.get(pt.trackId)?.release_date || null
        let isNew = false
        if (releaseDate) {
          const rd = new Date(releaseDate)
          const threeMonthsAgo = new Date()
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
          isNew = rd >= threeMonthsAgo
        }

        const playlistFollowersMap = new Map<string, number>()
        playlistFollowersMap.set(pt.playlistId, pt.playlistFollowers)
        const playlistIds = new Set<string>()
        playlistIds.add(pt.playlistId)

        trackROI.set(pt.trackId, {
          id: pt.trackId,
          name: pt.trackName,
          artist: pt.artist,
          frequency: 1,
          totalFollowersReached: pt.playlistFollowers,
          avgFollowersPerAppearance: pt.playlistFollowers,
          playlistsCount: 1,
          releaseDate,
          isNew,
          playlistFollowersMap,
          playlistIds
        })
      } else {
        existing.frequency++
        // Solo contar followers únicos por playlist (el máximo)
        const playlistFollowersMap = existing.playlistFollowersMap || new Map()
        const playlistIds = existing.playlistIds || new Set()
        
        const currentFollowers = playlistFollowersMap.get(pt.playlistId) || 0
        if (pt.playlistFollowers > currentFollowers) {
          existing.totalFollowersReached = existing.totalFollowersReached - currentFollowers + pt.playlistFollowers
          playlistFollowersMap.set(pt.playlistId, pt.playlistFollowers)
        }
        
        // Actualizar playlistsCount si es una playlist nueva
        if (!playlistIds.has(pt.playlistId)) {
          playlistIds.add(pt.playlistId)
          existing.playlistsCount = playlistIds.size
          if (!playlistFollowersMap.has(pt.playlistId)) {
            playlistFollowersMap.set(pt.playlistId, pt.playlistFollowers)
          }
        }
        
        existing.playlistFollowersMap = playlistFollowersMap
        existing.playlistIds = playlistIds
        existing.avgFollowersPerAppearance = existing.frequency > 0
          ? Math.round(existing.totalFollowersReached / existing.frequency)
          : 0
      }
    })

    // Limpiar campos temporales antes de retornar
    trackROI.forEach((track) => {
      delete track.playlistFollowersMap
      delete track.playlistIds
    })

    // Tracks que nunca aparecieron (dinero desperdiciado)
    const tracksNeverPromoted = catalogTracks.filter(track => 
      !Array.from(trackROI.keys()).includes(track.id)
    ).map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artist,
      releaseDate: tracksMetadataMap.get(track.id)?.release_date || null,
      isNew: (() => {
        const releaseDate = tracksMetadataMap.get(track.id)?.release_date
        if (!releaseDate) return false
        const rd = new Date(releaseDate)
        const threeMonthsAgo = new Date()
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
        return rd >= threeMonthsAgo
      })()
    }))

    // Oportunidades: tracks nuevos sin promoción
    const newTracksNotPromoted = tracksNeverPromoted.filter(t => t.isNew)

    // Concentración de riesgo: % de followers concentrados en top tracks
    const sortedTracksByFollowers = Array.from(trackROI.values())
      .sort((a, b) => b.totalFollowersReached - a.totalFollowersReached)
    
    const totalFollowersAll = sortedTracksByFollowers.reduce((sum, t) => sum + t.totalFollowersReached, 0)
    const top10TracksFollowers = sortedTracksByFollowers.slice(0, 10).reduce((sum, t) => sum + t.totalFollowersReached, 0)
    const concentrationRisk = totalFollowersAll > 0
      ? Math.round((top10TracksFollowers / totalFollowersAll) * 100)
      : 0

    // Eficiencia de catálogo: % de tracks promocionados
    const catalogEfficiency = catalogTracks.length > 0
      ? Math.round((trackROI.size / catalogTracks.length) * 100)
      : 0

    // Costo de oportunidad: artistas con baja eficiencia pero alta disponibilidad
    const opportunityArtists = Array.from(artistROI.values())
      .filter(a => a.tracksInCatalog >= 3 && a.efficiency < 50)
      .sort((a, b) => b.tracksInCatalog - a.tracksInCatalog)
      .slice(0, 10)

    // Tendencias: crecimiento de playlists por mes
    const monthlyPlaylistGrowth: Record<string, number> = {}
    playlists.forEach(p => {
      const date = new Date(p.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyPlaylistGrowth[key] = (monthlyPlaylistGrowth[key] || 0) + 1
    })

    // Top tracks por ROI (followers alcanzados)
    const topTracksByROI = sortedTracksByFollowers.slice(0, 20)

    // Top artistas por followers alcanzados (métrica más útil que ROI score)
    const topArtistsByROI = Array.from(artistROI.values())
      .sort((a, b) => b.totalFollowersReached - a.totalFollowersReached)
      .slice(0, 20)

    // Artistas con mejor eficiencia (alta promoción de su catálogo)
    const topEfficientArtists = Array.from(artistROI.values())
      .filter(a => a.tracksInCatalog >= 2)
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      metrics: {
        roi: {
          topTracksByROI: topTracksByROI.map(t => ({
            name: t.name,
            artist: t.artist,
            totalFollowersReached: t.totalFollowersReached,
            frequency: t.frequency,
            playlistsCount: t.playlistsCount,
            avgFollowersPerAppearance: t.avgFollowersPerAppearance,
            isNew: t.isNew
          })),
          topArtistsByROI: topArtistsByROI.map(a => ({
            name: a.name,
            tracksInCatalog: a.tracksInCatalog,
            tracksPromoted: a.tracksPromoted,
            totalFollowersReached: a.totalFollowersReached,
            avgFollowersPerTrack: a.avgFollowersPerTrack,
            avgAppearancesPerTrack: a.avgAppearancesPerTrack,
            efficiency: a.efficiency,
            playlistsCount: a.playlistsCount
          }))
        },
        efficiency: {
          catalogEfficiency,
          tracksNeverPromoted: tracksNeverPromoted.length,
          tracksPromoted: trackROI.size,
          totalTracksInCatalog: catalogTracks.length,
          concentrationRisk,
          topEfficientArtists: topEfficientArtists.map(a => ({
            name: a.name,
            tracksInCatalog: a.tracksInCatalog,
            tracksPromoted: a.tracksPromoted,
            efficiency: a.efficiency
          }))
        },
        opportunities: {
          newTracksNotPromoted: newTracksNotPromoted.slice(0, 20),
          opportunityArtists: opportunityArtists.map(a => ({
            name: a.name,
            tracksInCatalog: a.tracksInCatalog,
            tracksPromoted: a.tracksPromoted,
            efficiency: a.efficiency,
            potentialFollowers: a.tracksInCatalog * 1000 // Estimación conservadora
          })),
          tracksNeverPromoted: tracksNeverPromoted.slice(0, 30)
        },
        trends: {
          monthlyPlaylistGrowth,
          totalPlaylists: playlists.length,
          totalFollowersReached: Array.from(trackROI.values())
            .reduce((sum, t) => sum + t.totalFollowersReached, 0)
        }
      }
    })

  } catch (error) {
    console.error("Error calculando métricas de negocio:", error)
    
    return NextResponse.json(
      {
        error: "Error calculando métricas de negocio",
        message: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}

