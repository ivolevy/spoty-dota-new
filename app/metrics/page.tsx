"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, Music, Loader2, LogOut, ChevronDown, ListMusic, 
  BarChart3, Users, Clock, Disc3, TrendingUp, Award, 
  PieChart, Activity, Calendar, Headphones, Mic2, Album, Mail, Send, X
} from "lucide-react"
import { ParticlesBackground } from "@/components/particles-background"
import { useSpotifyAuth } from "@/hooks/use-spotify-auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

interface Playlist {
  id: string
  spotify_playlist_id: string
  name: string
  description: string
  image: string
  tracks_count: number
  external_url: string
  created_at: string
  followers?: number
  views?: number
  saves?: number
  public?: boolean
  collaborative?: boolean
}

interface Track {
  id: string
  name: string
  artist: string
  album: string
  image: string
  duration_ms: number
  preview_url: string | null
  uri: string
  added_at?: string
  position: number
}

interface PlaylistWithTracks extends Playlist {
  tracks: Track[]
}

interface ArtistStats {
  name: string
  trackCount: number
  totalDuration: number
  playlists: string[]
}

interface AlbumStats {
  name: string
  artist: string
  trackCount: number
  image: string
}

export default function MetricsPage() {
  const [playlists, setPlaylists] = useState<PlaylistWithTracks[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 })
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailInput, setEmailInput] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)
  const { isAuthenticated, isLoading, user, logout } = useSpotifyAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/")
      return
    }

    if (isAuthenticated) {
      fetchAllData()
    }
  }, [isAuthenticated, isLoading])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      
      // Fetch playlists
      const playlistsResponse = await fetch("/api/my-playlists", {
        credentials: "include",
      })

      if (!playlistsResponse.ok) {
        throw new Error("Error fetching playlists")
      }

      const playlistsData = await playlistsResponse.json()
      const playlistsList: Playlist[] = playlistsData.playlists || []
      
      setLoadingProgress({ current: 0, total: playlistsList.length })

      // Fetch tracks for each playlist
      const playlistsWithTracks: PlaylistWithTracks[] = []
      
      for (let i = 0; i < playlistsList.length; i++) {
        const playlist = playlistsList[i]
        setLoadingProgress({ current: i + 1, total: playlistsList.length })
        
        try {
          const tracksResponse = await fetch(`/api/playlist/${playlist.spotify_playlist_id}/tracks`, {
            credentials: "include",
          })

          if (tracksResponse.ok) {
            const tracksData = await tracksResponse.json()
            playlistsWithTracks.push({
              ...playlist,
              tracks: tracksData.tracks || []
            })
          } else {
            playlistsWithTracks.push({
              ...playlist,
              tracks: []
            })
          }
        } catch {
          playlistsWithTracks.push({
            ...playlist,
            tracks: []
          })
        }
        
        // Small delay to avoid rate limiting
        if (i < playlistsList.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      setPlaylists(playlistsWithTracks)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Error loading metrics", {
        description: "Please try again",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  // Calculate all metrics
  const metrics = useMemo(() => {
    if (playlists.length === 0) return null

    // All tracks across all playlists
    const allTracks = playlists.flatMap(p => p.tracks)
    
    // Unique tracks by ID
    const uniqueTracksMap = new Map<string, Track>()
    allTracks.forEach(track => {
      if (!uniqueTracksMap.has(track.id)) {
        uniqueTracksMap.set(track.id, track)
      }
    })
    const uniqueTracks = Array.from(uniqueTracksMap.values())

    // Artist statistics
    const artistMap = new Map<string, ArtistStats>()
    playlists.forEach(playlist => {
      playlist.tracks.forEach(track => {
        const existing = artistMap.get(track.artist) || {
          name: track.artist,
          trackCount: 0,
          totalDuration: 0,
          playlists: []
        }
        existing.trackCount++
        existing.totalDuration += track.duration_ms
        if (!existing.playlists.includes(playlist.name)) {
          existing.playlists.push(playlist.name)
        }
        artistMap.set(track.artist, existing)
      })
    })
    const artistStats = Array.from(artistMap.values()).sort((a, b) => b.trackCount - a.trackCount)

    // Album statistics
    const albumMap = new Map<string, AlbumStats>()
    allTracks.forEach(track => {
      const key = `${track.album}-${track.artist}`
      const existing = albumMap.get(key) || {
        name: track.album,
        artist: track.artist,
        trackCount: 0,
        image: track.image
      }
      existing.trackCount++
      albumMap.set(key, existing)
    })
    const albumStats = Array.from(albumMap.values()).sort((a, b) => b.trackCount - a.trackCount)

    // Total duration
    const totalDuration = allTracks.reduce((sum, t) => sum + t.duration_ms, 0)
    
    // Average tracks per playlist
    const avgTracksPerPlaylist = Math.round(allTracks.length / playlists.length)
    
    // Total followers
    const totalFollowers = playlists.reduce((sum, p) => sum + (p.followers || 0), 0)
    
    // Public vs private
    const publicCount = playlists.filter(p => p.public !== false).length
    const privateCount = playlists.length - publicCount

    // Playlists by tracks count
    const playlistsByTracks = [...playlists].sort((a, b) => b.tracks.length - a.tracks.length)

    // Playlists by followers
    const playlistsByFollowers = [...playlists].sort((a, b) => (b.followers || 0) - (a.followers || 0))

    // Creation timeline
    const playlistsByDate = [...playlists].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // Monthly creation stats
    const monthlyCreation: Record<string, number> = {}
    playlists.forEach(p => {
      const date = new Date(p.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyCreation[key] = (monthlyCreation[key] || 0) + 1
    })

    return {
      totalPlaylists: playlists.length,
      totalTracks: allTracks.length,
      uniqueTracks: uniqueTracks.length,
      uniqueArtists: artistStats.length,
      uniqueAlbums: albumStats.length,
      totalDuration,
      avgTracksPerPlaylist,
      totalFollowers,
      publicCount,
      privateCount,
      artistStats,
      albumStats,
      playlistsByTracks,
      playlistsByFollowers,
      playlistsByDate,
      monthlyCreation
    }
  }, [playlists])

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatDurationLong = (ms: number) => {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    if (hours > 0) {
      return `${hours} hours, ${minutes} minutes`
    }
    return `${minutes} minutes, ${seconds} seconds`
  }

  const handleSendReport = async () => {
    if (!emailInput.trim()) {
      toast.error("Please enter an email address")
      return
    }

    if (!metrics) {
      toast.error("No metrics data available")
      return
    }

    setSendingEmail(true)

    try {
      const reportData = {
        totalPlaylists: metrics.totalPlaylists,
        totalTracks: metrics.totalTracks,
        uniqueTracks: metrics.uniqueTracks,
        uniqueArtists: metrics.uniqueArtists,
        uniqueAlbums: metrics.uniqueAlbums,
        totalDuration: metrics.totalDuration,
        avgTracksPerPlaylist: metrics.avgTracksPerPlaylist,
        totalFollowers: metrics.totalFollowers,
        publicCount: metrics.publicCount,
        privateCount: metrics.privateCount,
        topArtists: metrics.artistStats.slice(0, 5).map(a => ({
          name: a.name,
          trackCount: a.trackCount
        })),
        topAlbums: metrics.albumStats.slice(0, 5).map(a => ({
          name: a.name,
          artist: a.artist,
          trackCount: a.trackCount
        })),
        topPlaylists: metrics.playlistsByTracks.slice(0, 5).map(p => ({
          name: p.name,
          tracksCount: p.tracks.length,
          followers: p.followers || 0
        }))
      }

      const response = await fetch("/api/send-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailInput.trim(),
          metrics: reportData,
          userName: user?.display_name || user?.email || "User"
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send report")
      }

      toast.success("Report sent!", {
        description: `The report has been sent to ${emailInput}`,
        duration: 4000,
      })
      setShowEmailModal(false)
      setEmailInput("")
    } catch (error) {
      console.error("Error sending report:", error)
      toast.error("Failed to send report", {
        description: error instanceof Error ? error.message : "Please try again",
        duration: 4000,
      })
    } finally {
      setSendingEmail(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen w-full flex flex-col relative" style={{ backgroundColor: "#000" }}>
        <ParticlesBackground />
        <div className="flex-1 flex items-center justify-center relative z-10">
          <Loader2 className="w-8 h-8 text-[#1DB954] animate-spin" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen w-full flex flex-col relative" style={{ backgroundColor: "#000" }}>
      <ParticlesBackground />
      
      {/* Navbar */}
      <nav className="w-full px-6 py-4 relative z-10" style={{ backgroundColor: "transparent" }}>
        <div
          className="flex items-center justify-between rounded-full px-6 py-3 max-w-6xl mx-auto"
          style={{ backgroundColor: "#1DB954" }}
        >
          {/* Logo */}
          <a href="/" className="flex items-center cursor-pointer transition-opacity duration-300 hover:opacity-80">
            <img 
              src="/logo.png" 
              alt="Spoty" 
              className="h-10 w-auto"
            />
          </a>

          {/* Authentication button */}
          {isLoading ? (
            <div className="px-5 py-2 text-sm text-gray-600" style={{ color: "#000" }}>
              Loading...
            </div>
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 font-sans text-sm font-medium hover:opacity-90 min-w-[180px] justify-between"
                  style={{
                    backgroundColor: "#000",
                    color: "#1DB954",
                    border: "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 0 12px rgba(29, 185, 84, 0.3)"
                    e.currentTarget.style.transform = "scale(1.02)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none"
                    e.currentTarget.style.transform = "scale(1)"
                  }}
                >
                  <div className="flex items-center gap-2">
                    {/* User avatar */}
                    {user.images && user.images[0] ? (
                      <img
                        src={user.images[0].url}
                        alt={user.display_name || "User"}
                        className="w-7 h-7 rounded-full"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                        style={{ backgroundColor: "#1DB954", color: "#000" }}
                      >
                        {user.display_name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                    {/* Greeting and name */}
                    <span className="text-sm font-medium truncate max-w-[60px]" style={{ color: "#1DB954" }}>
                      Hi, {(() => {
                        const name = user.display_name?.split(" ")[0] || user.email?.split("@")[0] || "User"
                        return name.length > 4 ? name.substring(0, 4) + "..." : name
                      })()}
                    </span>
                  </div>
                  <ChevronDown size={16} style={{ color: "#1DB954" }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[180px] rounded-lg"
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                }}
              >
                <DropdownMenuItem
                  onClick={() => router.push("/my-playlists")}
                  className="cursor-pointer focus:bg-[#1DB954] focus:text-black"
                  style={{ color: "#fff" }}
                >
                  <ListMusic className="mr-2 h-4 w-4" />
                  <span className="font-normal">My Playlists</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/metrics")}
                  className="cursor-pointer focus:bg-[#1DB954] focus:text-black"
                  style={{ color: "#fff" }}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <span className="font-normal">Metrics</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer focus:bg-[#1DB954] focus:text-black"
                  style={{ color: "#fff" }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
                
                {/* Plaquita Dale Play */}
                <div className="pl-2 pr-3 py-2 flex items-center gap-1 cursor-default border-t border-[#333]" style={{ backgroundColor: "#1a1a1a" }}>
                  <img 
                    src="/dp.png" 
                    alt="Dale Play" 
                    className="h-4 w-auto opacity-80"
                  />
                  <p className="font-semibold text-xs opacity-50" style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "#fff" }}>
                    Dale Play
                  </p>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => router.push("/")}
              className="px-5 py-2 rounded-full transition-all duration-300 font-sans text-sm font-medium hover:opacity-90"
              style={{
                backgroundColor: "#000",
                color: "#1DB954",
                border: "1px solid #1DB954",
              }}
            >
              Connect with Spotify
            </button>
          )}
        </div>
      </nav>

      <div className="flex-1 flex flex-col relative z-10 py-8 px-4">
        <div className="w-full max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 mb-6 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Back</span>
            </button>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2" style={{ fontFamily: "system-ui, -apple-system, sans-serif", letterSpacing: "0.02em" }}>
                  Metrics Dashboard
                </h1>
                <p className="text-gray-500 text-sm">
                  Insights and statistics about your music library
                </p>
              </div>
              {metrics && (
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all duration-300 text-sm self-start sm:self-auto"
                  style={{ backgroundColor: "#1DB954", color: "#000" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#1ed760"
                    e.currentTarget.style.transform = "scale(1.02)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#1DB954"
                    e.currentTarget.style.transform = "scale(1)"
                  }}
                >
                  <Mail size={16} />
                  Send Report
                </button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-[#1DB954] animate-spin mb-4" />
              <p className="text-white text-lg mb-2">Loading your metrics...</p>
              {loadingProgress.total > 0 && (
                <div className="w-64">
                  <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#1DB954] transition-all duration-300"
                      style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-2 text-center">
                    Analyzing playlist {loadingProgress.current} of {loadingProgress.total}
                  </p>
                </div>
              )}
            </div>
          ) : !metrics ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: "#1a1a1a" }}>
                <BarChart3 className="w-12 h-12 text-gray-600" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">No data yet</h2>
              <p className="text-gray-400 mb-6">Create some playlists to see your metrics</p>
              <button
                onClick={() => router.push("/")}
                className="px-6 py-3 rounded-full font-medium transition-all duration-300"
                style={{ backgroundColor: "#1DB954", color: "#000" }}
              >
                Create Playlist
              </button>
            </div>
          ) : (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                <MetricCard 
                  icon={<Disc3 className="w-5 h-5" />}
                  label="Playlists"
                  value={metrics.totalPlaylists}
                  color="#1DB954"
                />
                <MetricCard 
                  icon={<Music className="w-5 h-5" />}
                  label="Total Tracks"
                  value={metrics.totalTracks}
                  color="#1ed760"
                />
                <MetricCard 
                  icon={<Headphones className="w-5 h-5" />}
                  label="Unique Songs"
                  value={metrics.uniqueTracks}
                  color="#22c55e"
                />
                <MetricCard 
                  icon={<Mic2 className="w-5 h-5" />}
                  label="Artists"
                  value={metrics.uniqueArtists}
                  color="#4ade80"
                />
                <MetricCard 
                  icon={<Album className="w-5 h-5" />}
                  label="Albums"
                  value={metrics.uniqueAlbums}
                  color="#86efac"
                />
                <MetricCard 
                  icon={<Clock className="w-5 h-5" />}
                  label="Total Time"
                  value={formatDuration(metrics.totalDuration)}
                  color="#a7f3d0"
                />
              </div>

              {/* Second Row Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <MetricCard 
                  icon={<Users className="w-5 h-5" />}
                  label="Total Followers"
                  value={metrics.totalFollowers}
                  color="#fbbf24"
                />
                <MetricCard 
                  icon={<TrendingUp className="w-5 h-5" />}
                  label="Avg Tracks/Playlist"
                  value={metrics.avgTracksPerPlaylist}
                  color="#f472b6"
                />
                <MetricCard 
                  icon={<Activity className="w-5 h-5" />}
                  label="Public"
                  value={metrics.publicCount}
                  color="#60a5fa"
                />
                <MetricCard 
                  icon={<PieChart className="w-5 h-5" />}
                  label="Private"
                  value={metrics.privateCount}
                  color="#c084fc"
                />
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Top Artists */}
                <div className="rounded-xl p-6" style={{ backgroundColor: "#1a1a1a" }}>
                  <div className="flex items-center gap-2 mb-6">
                    <Mic2 className="w-5 h-5 text-[#1DB954]" />
                    <h2 className="text-lg font-semibold text-white">Top Artists</h2>
                  </div>
                  <div className="space-y-3">
                    {metrics.artistStats.slice(0, 10).map((artist, index) => (
                      <div key={artist.name} className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ 
                            backgroundColor: index < 3 ? "#1DB954" : "#333",
                            color: index < 3 ? "#000" : "#fff"
                          }}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{artist.name}</p>
                          <p className="text-gray-500 text-xs">
                            {artist.trackCount} tracks • {formatDuration(artist.totalDuration)}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <div className="h-2 rounded-full bg-[#333] w-24 overflow-hidden">
                            <div 
                              className="h-full bg-[#1DB954]"
                              style={{ width: `${(artist.trackCount / metrics.artistStats[0].trackCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Albums */}
                <div className="rounded-xl p-6" style={{ backgroundColor: "#1a1a1a" }}>
                  <div className="flex items-center gap-2 mb-6">
                    <Album className="w-5 h-5 text-[#1DB954]" />
                    <h2 className="text-lg font-semibold text-white">Top Albums</h2>
                  </div>
                  <div className="space-y-3">
                    {metrics.albumStats.slice(0, 8).map((album, index) => (
                      <div key={`${album.name}-${album.artist}`} className="flex items-center gap-3">
                        <img 
                          src={album.image || "/playlist.png"} 
                          alt={album.name}
                          className="w-10 h-10 rounded object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{album.name}</p>
                          <p className="text-gray-500 text-xs truncate">{album.artist}</p>
                        </div>
                        <div className="text-[#1DB954] text-sm font-medium shrink-0">
                          {album.trackCount} tracks
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Playlists by Tracks */}
                <div className="rounded-xl p-6" style={{ backgroundColor: "#1a1a1a" }}>
                  <div className="flex items-center gap-2 mb-6">
                    <Music className="w-5 h-5 text-[#1DB954]" />
                    <h2 className="text-lg font-semibold text-white">Largest Playlists</h2>
                  </div>
                  <div className="space-y-3">
                    {metrics.playlistsByTracks.slice(0, 8).map((playlist, index) => (
                      <div 
                        key={playlist.id} 
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#252525] cursor-pointer transition-colors"
                        onClick={() => router.push("/my-playlists")}
                      >
                        <img 
                          src={playlist.image || "/playlist.png"} 
                          alt={playlist.name}
                          className="w-10 h-10 rounded object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{playlist.name}</p>
                          <p className="text-gray-500 text-xs">
                            {playlist.tracks.length} tracks
                          </p>
                        </div>
                        <div className="shrink-0">
                          <div className="h-2 rounded-full bg-[#333] w-16 overflow-hidden">
                            <div 
                              className="h-full bg-[#1DB954]"
                              style={{ width: `${(playlist.tracks.length / metrics.playlistsByTracks[0].tracks.length) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Playlists by Followers */}
                <div className="rounded-xl p-6" style={{ backgroundColor: "#1a1a1a" }}>
                  <div className="flex items-center gap-2 mb-6">
                    <Users className="w-5 h-5 text-[#1DB954]" />
                    <h2 className="text-lg font-semibold text-white">Most Followed</h2>
                  </div>
                  <div className="space-y-3">
                    {metrics.playlistsByFollowers.slice(0, 8).map((playlist, index) => (
                      <div 
                        key={playlist.id} 
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#252525] cursor-pointer transition-colors"
                        onClick={() => router.push("/my-playlists")}
                      >
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ 
                            backgroundColor: index === 0 ? "#fbbf24" : index === 1 ? "#9ca3af" : index === 2 ? "#d97706" : "#333",
                            color: index < 3 ? "#000" : "#fff"
                          }}
                        >
                          {index + 1}
                        </div>
                        <img 
                          src={playlist.image || "/playlist.png"} 
                          alt={playlist.name}
                          className="w-10 h-10 rounded object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{playlist.name}</p>
                          <p className="text-gray-500 text-xs">
                            {playlist.followers || 0} followers
                          </p>
                        </div>
                        {index === 0 && (playlist.followers || 0) > 0 && (
                          <Award className="w-5 h-5 text-[#fbbf24] shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="rounded-xl p-6 mb-8" style={{ backgroundColor: "#1a1a1a" }}>
                <div className="flex items-center gap-2 mb-6">
                  <Calendar className="w-5 h-5 text-[#1DB954]" />
                  <h2 className="text-lg font-semibold text-white">Recent Playlists</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {metrics.playlistsByDate.slice(0, 8).map((playlist) => (
                    <div 
                      key={playlist.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#252525] cursor-pointer transition-colors"
                      onClick={() => router.push("/my-playlists")}
                    >
                      <img 
                        src={playlist.image || "/playlist.png"} 
                        alt={playlist.name}
                        className="w-12 h-12 rounded object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{playlist.name}</p>
                        <p className="text-gray-500 text-xs">
                          {new Date(playlist.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fun Facts */}
              <div className="rounded-xl p-6" style={{ backgroundColor: "rgba(29, 185, 84, 0.1)", border: "1px solid rgba(29, 185, 84, 0.3)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-[#1DB954]" />
                  <h2 className="text-lg font-semibold text-white">Fun Facts</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-gray-300 text-sm">
                    <span className="text-[#1DB954] font-semibold">🎵 Total listening time:</span>{" "}
                    {formatDurationLong(metrics.totalDuration)}
                  </div>
                  <div className="text-gray-300 text-sm">
                    <span className="text-[#1DB954] font-semibold">🎤 Most featured artist:</span>{" "}
                    {metrics.artistStats[0]?.name || "N/A"} ({metrics.artistStats[0]?.trackCount || 0} tracks)
                  </div>
                  <div className="text-gray-300 text-sm">
                    <span className="text-[#1DB954] font-semibold">💿 Most featured album:</span>{" "}
                    {metrics.albumStats[0]?.name || "N/A"} ({metrics.albumStats[0]?.trackCount || 0} tracks)
                  </div>
                  <div className="text-gray-300 text-sm">
                    <span className="text-[#1DB954] font-semibold">📊 Diversity score:</span>{" "}
                    {Math.round((metrics.uniqueArtists / metrics.totalTracks) * 100)}% unique artists per track
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
          onClick={() => !sendingEmail && setShowEmailModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl p-6"
            style={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(29, 185, 84, 0.2)" }}>
                  <Mail className="w-5 h-5 text-[#1DB954]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Send Report</h2>
                  <p className="text-gray-500 text-xs">Receive your metrics via email</p>
                </div>
              </div>
              <button
                onClick={() => !sendingEmail && setShowEmailModal(false)}
                className="p-2 rounded-full hover:bg-[#333] transition-colors"
                disabled={sendingEmail}
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {/* Email Input */}
            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2">Email address</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !sendingEmail) {
                    handleSendReport()
                  }
                }}
                placeholder="Enter email address..."
                className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] text-white placeholder-gray-600 outline-none border border-[#333] focus:border-[#1DB954] transition-colors"
                disabled={sendingEmail}
                autoFocus
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 px-4 py-3 rounded-full font-medium transition-all duration-300 text-sm"
                style={{ backgroundColor: "#333", color: "#fff" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#444"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#333"
                }}
                disabled={sendingEmail}
              >
                Cancel
              </button>
              <button
                onClick={handleSendReport}
                disabled={sendingEmail || !emailInput.trim()}
                className="flex-1 px-4 py-3 rounded-full font-medium transition-all duration-300 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#1DB954", color: "#000" }}
                onMouseEnter={(e) => {
                  if (!sendingEmail && emailInput.trim()) {
                    e.currentTarget.style.backgroundColor = "#1ed760"
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#1DB954"
                }}
              >
                {sendingEmail ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// Metric Card Component
function MetricCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
}) {
  return (
    <div 
      className="rounded-xl p-4 transition-all duration-300 hover:scale-105"
      style={{ backgroundColor: "#1a1a1a" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div style={{ color }}>{icon}</div>
        <span className="text-gray-400 text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

