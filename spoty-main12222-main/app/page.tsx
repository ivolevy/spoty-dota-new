"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Send, LogOut, ChevronDown, Music, Loader2, CheckCircle2, ExternalLink, RefreshCw, Edit2, Save, HelpCircle, ListMusic, ArrowLeft, X, GripVertical, Trash2, Layers, Minus, Plus, BarChart3 } from "lucide-react"
import { useRouter } from "next/navigation"
import { ParticlesBackground } from "@/components/particles-background"
import { useSpotifyAuth } from "@/hooks/use-spotify-auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { validatePrompt } from "@/lib/prompt-validator"

interface Track {
  id: string
  name: string
  artist: string
  album: string
  image: string
  duration_ms: number
  preview_url?: string
  uri?: string
}

type FlowState = 'idle' | 'loading' | 'preview' | 'creating' | 'success'

export default function PlaylistPrompt() {
  const [prompt, setPrompt] = useState("")
  const [editPrompt, setEditPrompt] = useState("")
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [flowState, setFlowState] = useState<FlowState>('idle')
  const [tracks, setTracks] = useState<Track[]>([])
  const [playlistUrl, setPlaylistUrl] = useState<string>("")
  const [playlistName, setPlaylistName] = useState("")
  const [playlistDescription, setPlaylistDescription] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("Analyzing your request...")
  const [draggedTrack, setDraggedTrack] = useState<number | null>(null)
  // Massive playlist creation
  const [massiveMode, setMassiveMode] = useState(false)
  const [playlistCount, setPlaylistCount] = useState(2)
  const [massiveProgress, setMassiveProgress] = useState({ current: 0, total: 0 })
  const [createdPlaylists, setCreatedPlaylists] = useState<{ name: string; url: string }[]>([])
  const { isAuthenticated, user, isLoading, login, logout } = useSpotifyAuth()
  const router = useRouter()

  // Check if there's an error or success in the URL (from callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get("error")
    const connected = params.get("connected")
    
    if (error) {
      console.error("Authentication error:", error)
      
      let errorMessage = "Oops! Connection failed"
      let errorDescription = "Let's try again"
      
      switch (error) {
        case "user_fetch_failed":
          errorMessage = "Couldn't get your info"
          errorDescription = "Try connecting again"
          break
        case "token_exchange_failed":
          errorMessage = "Connection issue"
          errorDescription = "Give it another shot"
          break
        case "invalid_state":
          errorMessage = "Security check"
          errorDescription = "Please reconnect"
          break
        default:
          errorMessage = "Something went wrong"
          errorDescription = "Try again in a moment"
      }
      
      toast.error(errorMessage, {
        description: errorDescription,
        duration: 4000,
      })
      window.history.replaceState({}, "", "/")
    } else if (connected === "true") {
      // Limpiar la URL - el hook manejará la verificación
      window.history.replaceState({}, "", "/")
      // Mostrar mensaje de éxito
      toast.success("All set!", {
        description: "You're connected to Spotify",
        duration: 2000,
      })
    }
  }, [])

  // Generate tracks using OpenAI and Spotify API
  const generateTracks = async (
    promptText: string, 
    options?: { isEdit?: boolean; trackCount?: number }
  ): Promise<{ tracks: Track[]; playlistName: string; description: string }> => {
    const response = await fetch("/api/generate-playlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ 
        prompt: promptText,
        isEdit: options?.isEdit || false,
        trackCount: options?.trackCount
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error generating playlist")
    }

    const data = await response.json()
    
    return {
      tracks: data.tracks,
      playlistName: data.playlistName,
      description: data.description || "",
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check if user is authenticated
    if (!isAuthenticated) {
      setShowConnectModal(true)
      return
    }

    if (!prompt.trim()) {
      toast.error("What do you want to hear?", {
        description: "Tell us about your playlist",
        duration: 3000,
      })
      return
    }

    // Validar campos obligatorios
    const validation = validatePrompt(prompt.trim())
    
    if (!validation.isValid) {
      const errorMessage = validation.errors.length === 1 
        ? validation.errors[0]
        : "Missing info"
      const errorDescription = validation.errors.join(". ")
      
      toast.error(errorMessage, {
        description: errorDescription,
        duration: 4000,
      })
      return
    }

    // Mostrar warnings si existen (pero no bloquear)
    if (validation.warnings.length > 0) {
      // Los warnings se pueden mostrar pero no bloquean el submit
      console.log("Warnings:", validation.warnings)
    }

    // Check if massive mode
    if (massiveMode) {
      await handleMassiveCreate()
      return
    }

    // Paso 1: Loading/Generación
    setFlowState('loading')
    setLoadingMessage("Analyzing your request...")
    
    // Cambiar mensajes durante la carga
    const messages = [
      "Analyzing your request...",
      "Searching for perfect songs...",
      "Curating your playlist...",
      "Almost ready...",
    ]
    
    let messageIndex = 0
    const messageInterval = setInterval(() => {
      messageIndex++
      if (messageIndex < messages.length) {
        setLoadingMessage(messages[messageIndex])
      }
    }, 500)
    
    try {
      // Generar canciones usando OpenAI y Spotify
      const result = await generateTracks(prompt)
      clearInterval(messageInterval)
      
      setTracks(result.tracks)
      setPlaylistName(result.playlistName)
      setPlaylistDescription(result.description || "")
      
      // Paso 2: Preview
      setFlowState('preview')
    } catch (error) {
      clearInterval(messageInterval)
      const errorMessage = error instanceof Error ? error.message : "Try again"
      toast.error("Couldn't create playlist", {
        description: errorMessage,
        duration: 4000,
      })
      setFlowState('idle')
    }
  }

  // Shuffle array helper function
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Handle massive playlist creation
  const handleMassiveCreate = async () => {
    setFlowState('creating')
    setMassiveProgress({ current: 0, total: playlistCount })
    setCreatedPlaylists([])
    
    const results: { name: string; url: string }[] = []
    
    // Variation keywords to get different tracks
    const variations = [
      "",
      " with different songs",
      " alternative selection",
      " fresh picks",
      " new mix",
      " another version",
      " different vibe",
      " remix selection",
      " unique picks",
      " special edition"
    ]
    
    // Collect ALL tracks from multiple generations first
    setLoadingMessage("Generating unique track pool...")
    const allTracks: Track[] = []
    const trackIdSet = new Set<string>()
    
    // Generate more tracks to have a larger pool
    const generationsNeeded = Math.min(playlistCount + 2, 5)
    for (let g = 0; g < generationsNeeded; g++) {
      try {
        const variation = variations[g] || ` variation ${g + 1}`
        const result = await generateTracks(prompt + variation, { trackCount: 20 })
        
        // Add only new tracks to the pool
        for (const track of result.tracks) {
          if (!trackIdSet.has(track.id)) {
            trackIdSet.add(track.id)
            allTracks.push(track)
          }
        }
      } catch (error) {
        console.error(`Error generating tracks pool ${g + 1}:`, error)
      }
    }
    
    console.log(`📦 Total unique tracks in pool: ${allTracks.length}`)
    
    // Calculate tracks per playlist
    const tracksPerPlaylist = Math.max(10, Math.floor(allTracks.length / playlistCount))
    
    // Create each playlist with different tracks
    for (let i = 0; i < playlistCount; i++) {
      setMassiveProgress({ current: i + 1, total: playlistCount })
      setLoadingMessage(`Creating playlist ${i + 1} of ${playlistCount}...`)
      
      try {
        // Shuffle all tracks and take a slice for this playlist
        const shuffledTracks = shuffleArray(allTracks)
        
        // Take different slice for each playlist to maximize uniqueness
        const startIndex = (i * tracksPerPlaylist) % allTracks.length
        let playlistTracks: Track[] = []
        
        // Get tracks starting from different positions
        for (let j = 0; j < tracksPerPlaylist && playlistTracks.length < tracksPerPlaylist; j++) {
          const index = (startIndex + j) % shuffledTracks.length
          playlistTracks.push(shuffledTracks[index])
        }
        
        // Shuffle again to ensure different order even with overlapping tracks
        playlistTracks = shuffleArray(playlistTracks)
        
        // Generate a unique playlist name
        const baseName = prompt.length > 30 ? prompt.substring(0, 30) + "..." : prompt
        const playlistNameWithIndex = `${baseName} #${i + 1}`
        
        const createResponse = await fetch("/api/create-playlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: playlistNameWithIndex,
            description: `Playlist ${i + 1} of ${playlistCount} - Unique mix generated from: ${prompt}`,
            tracks: playlistTracks.map(track => ({
              uri: track.uri || `spotify:track:${track.id}`,
            })),
          }),
        })
        
        if (createResponse.ok) {
          const data = await createResponse.json()
          results.push({ name: playlistNameWithIndex, url: data.playlistUrl })
        }
        
        // Small delay between creations to avoid rate limiting
        if (i < playlistCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 800))
        }
      } catch (error) {
        console.error(`Error creating playlist ${i + 1}:`, error)
      }
    }
    
    setCreatedPlaylists(results)
    setFlowState('success')
    
    if (results.length === playlistCount) {
      toast.success(`${playlistCount} playlists created!`, {
        description: "All playlists have been added to your Spotify with unique tracks",
        duration: 4000,
      })
    } else if (results.length > 0) {
      toast.warning(`${results.length} of ${playlistCount} playlists created`, {
        description: "Some playlists couldn't be created",
        duration: 4000,
      })
    }
  }

  const handleCreatePlaylist = async () => {
    // Paso 3: Creando playlist
    setFlowState('creating')
    
    try {
      // Crear playlist en Spotify
      const response = await fetch("/api/create-playlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: playlistName || "My Playlist",
          description: playlistDescription || "",
          tracks: tracks.map(track => ({
            uri: track.uri || `spotify:track:${track.id}`,
          })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error creating playlist")
      }

      const data = await response.json()
      setPlaylistUrl(data.playlistUrl)
      
      // Paso 4: Éxito
      setFlowState('success')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Try again"
      toast.error("Couldn't save to Spotify", {
        description: errorMessage,
        duration: 4000,
      })
      setFlowState('preview')
    }
  }

  const handleRegenerate = () => {
    setFlowState('loading')
    setLoadingMessage("Regenerating playlist...")
    generateTracks(prompt).then((result) => {
      setTracks(result.tracks)
      setPlaylistName(result.playlistName)
      setPlaylistDescription(result.description || "")
      setFlowState('preview')
    }).catch((error) => {
      const errorMessage = error instanceof Error ? error.message : "Try again"
      toast.error("Couldn't regenerate", {
        description: errorMessage,
        duration: 4000,
      })
      setFlowState('idle')
    })
  }

  const handleReset = () => {
    setFlowState('idle')
    setTracks([])
    setPrompt("")
    setEditPrompt("")
    setPlaylistUrl("")
    setPlaylistName("")
    setPlaylistDescription("")
    setIsEditingName(false)
    // Reset massive mode
    setMassiveMode(false)
    setPlaylistCount(2)
    setMassiveProgress({ current: 0, total: 0 })
    setCreatedPlaylists([])
  }

  // Editar playlist con IA
  const handleEditWithAI = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editPrompt.trim()) {
      toast.error("What should we change?", {
        description: "Tell us how to modify it",
        duration: 3000,
      })
      return
    }

    setLoadingMessage("Editing playlist with AI...")
    
    try {
      // Usar el número de tracks actual o 10 por defecto
      const currentTrackCount = tracks.length || 10
      const result = await generateTracks(editPrompt, { 
        isEdit: true, 
        trackCount: currentTrackCount 
      })
      setTracks(result.tracks)
      setPlaylistName(result.playlistName)
      setPlaylistDescription(result.description || "")
      setEditPrompt("")
      toast.success("Updated!", {
        description: "Your playlist is ready",
        duration: 2000,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Try again"
      toast.error("Couldn't update playlist", {
        description: errorMessage,
        duration: 4000,
      })
    }
  }

  // Eliminar track
  const handleDeleteTrack = (trackId: string) => {
    setTracks(tracks.filter(track => track.id !== trackId))
    toast.success("Removed!", {
      description: "Track removed from playlist",
      duration: 2000,
    })
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedTrack(index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedTrack === null) return

    const newTracks = [...tracks]
    const draggedItem = newTracks[draggedTrack]
    newTracks.splice(draggedTrack, 1)
    newTracks.splice(dropIndex, 0, draggedItem)
    
    setTracks(newTracks)
    setDraggedTrack(null)
  }

  // Manejar salida con confirmación
  const handleBackClick = () => {
    setShowExitModal(true)
  }

  const handleExitConfirm = (action: 'save' | 'discard') => {
    setShowExitModal(false)
    if (action === 'save') {
      handleCreatePlaylist()
    } else {
      handleReset()
    }
  }

  const handleSaveName = () => {
    if (playlistName.trim()) {
      setIsEditingName(false)
    }
  }

  const handleConnect = () => {
    setShowConnectModal(false)
    login()
  }

  return (
    <main className="min-h-screen w-full flex flex-col relative" style={{ backgroundColor: "#000" }}>
      <ParticlesBackground />
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
                  onClick={(e) => {
                    e.preventDefault()
                    router.push("/my-playlists")
                  }}
                  className="cursor-pointer focus:bg-[#1DB954] focus:text-black"
                  style={{ color: "#fff" }}
                >
                  <ListMusic className="mr-2 h-4 w-4" />
                  <span className="font-normal">My Playlists</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    router.push("/metrics")
                  }}
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
            <div className="flex items-center gap-4">
              {/* Connect button */}
            <button
              onClick={login}
              className="px-5 py-2 rounded-full transition-all duration-300 font-sans text-sm font-medium"
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
              Connect with Spotify
            </button>
            </div>
          )}
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-8 pt-32">
        {flowState === 'idle' && (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto px-4 flex flex-col items-center gap-4 relative">
          {/* Globos decorativos */}
          <div className="absolute -top-16 left-0 hidden md:block" style={{ transform: "rotate(-12deg)" }}>
            <div className="relative bg-[#1DB954] rounded-2xl px-4 py-2 shadow-lg" style={{ border: "1px solid #1DB954" }}>
              <p className="text-black text-sm font-medium whitespace-nowrap" style={{ letterSpacing: "0.05em" }}>"Energetic workout mix"</p>
              {/* Triángulo apuntando hacia abajo */}
              <div 
                className="absolute bottom-0 right-6" 
                style={{ 
                  transform: "translateY(100%)",
                  width: "0",
                  height: "0",
                  borderLeft: "8px solid transparent",
                  borderRight: "8px solid transparent",
                  borderTop: "8px solid #1DB954",
                  outline: "none",
                  borderBottom: "none",
                  lineHeight: "0"
                }}
              />
            </div>
          </div>
          
          <div className="absolute -top-16 right-0 hidden md:block" style={{ transform: "rotate(12deg)" }}>
            <div className="relative bg-[#1DB954] rounded-2xl px-4 py-2 shadow-lg" style={{ border: "1px solid #1DB954" }}>
              <p className="text-black text-sm font-medium whitespace-nowrap" style={{ letterSpacing: "0.05em" }}>"Slow and relaxing"</p>
              {/* Triángulo apuntando hacia abajo */}
              <div 
                className="absolute bottom-0 right-6" 
                style={{ 
                  transform: "translateY(100%)",
                  width: "0",
                  height: "0",
                  borderLeft: "8px solid transparent",
                  borderRight: "8px solid transparent",
                  borderTop: "8px solid #1DB954",
                  outline: "none",
                  borderBottom: "none",
                  lineHeight: "0"
                }}
              />
            </div>
          </div>

          {isAuthenticated ? (
            <h1 
              className="text-6xl mb-8 text-center font-semibold relative z-10"
              style={{ 
                color: "#ffffff",
                fontFamily: "var(--font-instrument-serif), 'Instrument Serif', serif",
                letterSpacing: "0.02em",
              }}
            >
              Scale Your <br /> Playlist Creation
            </h1>
          ) : (
            <h1 
              className="text-6xl mb-8 text-center font-semibold relative z-10"
              style={{ 
                color: "#ffffff",
                fontFamily: "var(--font-instrument-serif), 'Instrument Serif', serif",
                letterSpacing: "0.01em",
              }}
            >
              Smart Playlisting <br /> Powered by AI
            </h1>
          )}
          
          <div className="flex items-center gap-2 w-full">
            {/* Main Input */}
            <div
              className="flex items-center gap-0 rounded-full transition-all duration-300 flex-1"
              style={{ backgroundColor: "#1a1a1a" }}
            >
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the playlist you want…"
                className="flex-1 px-6 py-4 bg-transparent text-white placeholder-gray-500 outline-none font-sans text-base"
                style={{ color: "#ffffff" }}
              />

              <button
                type="submit"
                className="mr-3 p-2 rounded-full transition-all duration-300 hover:scale-110 flex items-center justify-center"
                style={{
                  backgroundColor: "#1DB954",
                  color: "#000",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 16px rgba(29, 185, 84, 0.4)"
                  e.currentTarget.style.backgroundColor = "#1ed760"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none"
                  e.currentTarget.style.backgroundColor = "#1DB954"
                }}
                aria-label="Send prompt"
              >
                <Send size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Massive Mode Toggle */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setMassiveMode(!massiveMode)}
                className={`flex items-center gap-2 px-4 py-3 rounded-full transition-all duration-300 ${
                  massiveMode 
                    ? 'bg-[#1DB954] text-black' 
                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                }`}
                title="Massive mode: Create multiple playlists at once"
              >
                <Layers size={18} />
                <span className="text-sm font-medium hidden sm:inline">Massive</span>
              </button>
            </div>
          </div>

          {/* Massive Mode Controls */}
          {massiveMode && (
            <div 
              className="w-full flex items-center justify-center gap-4 p-4 rounded-xl mt-2 animate-in fade-in slide-in-from-top-2 duration-300"
              style={{ backgroundColor: "rgba(29, 185, 84, 0.1)", border: "1px solid rgba(29, 185, 84, 0.3)" }}
            >
              <div className="flex items-center gap-3">
                <Layers size={18} className="text-[#1DB954]" />
                <span className="text-white text-sm font-medium">Create</span>
                
                {/* Quantity Selector */}
                <div className="flex items-center gap-1 bg-[#0a0a0a] rounded-full px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setPlaylistCount(Math.max(2, playlistCount - 1))}
                    className="p-1.5 rounded-full hover:bg-[#1a1a1a] text-gray-400 hover:text-white transition-colors"
                    disabled={playlistCount <= 2}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-[#1DB954] font-bold text-lg w-8 text-center">{playlistCount}</span>
                  <button
                    type="button"
                    onClick={() => setPlaylistCount(Math.min(10, playlistCount + 1))}
                    className="p-1.5 rounded-full hover:bg-[#1a1a1a] text-gray-400 hover:text-white transition-colors"
                    disabled={playlistCount >= 10}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                
                <span className="text-white text-sm font-medium">unique playlists</span>
              </div>
              
              <div className="text-gray-500 text-xs">
                Each playlist will have different songs
              </div>
            </div>
          )}
          
          {/* Recommendations Tooltip */}
          <div className="mt-4 w-full max-w-2xl mx-auto px-4">
            <div 
              className="rounded-lg p-4"
              style={{ 
                backgroundColor: "rgba(26, 26, 26, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.1)"
              }}
            >
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#1DB954" }} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white mb-2">Tips for better results:</p>
                  <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                    <li><strong>Activity:</strong> Specify what you'll be doing (e.g., running, studying, working, gym)</li>
                    <li><strong>Context:</strong> Describe the setting or occasion (e.g., morning commute, party, focus session)</li>
                    <li><strong>Time:</strong> Include the duration (e.g., 30 minutes, 1 hour, 2 hours)</li>
                    <li>You can also mention intensity, mood, or genre preferences for more personalized results</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </form>
        )}


        {flowState === 'loading' && (
          <div className="w-full max-w-2xl mx-auto px-4 flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-6">
              {/* Spinner grande */}
              <div className="relative">
                <Loader2 className="w-16 h-16 text-[#1DB954] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Music className="w-6 h-6 text-[#1DB954] opacity-60" />
                </div>
              </div>
              
              {/* Texto animado */}
              <div className="text-center">
                <h2 className="text-white text-2xl font-medium mb-3" style={{ fontFamily: "system-ui, sans-serif" }}>
                  Creating your playlist
                </h2>
                <p className="text-gray-400 text-sm animate-pulse">
                  {loadingMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {flowState === 'preview' && (
          <div className="w-full max-w-4xl mx-auto px-4 flex flex-col gap-6">
            {/* Back Button */}
            <button
              onClick={handleBackClick}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors self-start mb-2"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Back</span>
            </button>

            {/* Card de Playlist */}
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              {/* Cuadrado de playlist (como Spotify) */}
              <div className="w-full sm:w-72 h-72 rounded-lg flex-shrink-0 shadow-2xl overflow-hidden" style={{ backgroundColor: "#1a1a1a" }}>
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src="/playlist.png"
                    alt="Playlist"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/playlist.png";
                    }}
                  />
                </div>
              </div>

              {/* Información de la playlist */}
              <div className="flex-1 w-full flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  {isEditingName ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={playlistName}
                        onChange={(e) => setPlaylistName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveName()
                          }
                          if (e.key === 'Escape') {
                            setIsEditingName(false)
                          }
                        }}
                        className="flex-1 px-4 py-2 rounded-lg bg-[#1a1a1a] text-white text-xl font-semibold outline-none border-2 border-[#1DB954] focus:border-[#1ed760]"
                        autoFocus
                        placeholder="Playlist name"
                      />
                      <button
                        onClick={handleSaveName}
                        className="p-2 rounded-lg transition-all duration-300"
                        style={{
                          backgroundColor: "#1DB954",
                          color: "#000",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#1ed760"
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#1DB954"
                        }}
                      >
                        <Save size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center gap-3">
                      <h2 className="text-white text-2xl font-semibold" style={{ fontFamily: "system-ui, sans-serif" }}>
                        {playlistName || "My Playlist"}
                      </h2>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="p-1.5 rounded-lg transition-all duration-300 hover:bg-[#1a1a1a]"
                        style={{ color: "#1DB954" }}
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <span>Playlist</span>
                  <span>•</span>
                  <span>{tracks.length} songs</span>
                </div>

                {/* Botones de acción */}
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <button
                    onClick={handleRegenerate}
                    className="px-5 py-2.5 rounded-full transition-all duration-300 font-sans text-sm font-medium flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: "#2a2a2a",
                      color: "#fff",
                      border: "1px solid #444",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#333"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#2a2a2a"
                    }}
                  >
                    <RefreshCw size={16} />
                    Regenerate
                  </button>
                  <button
                    onClick={handleCreatePlaylist}
                    className="px-6 py-2.5 rounded-full transition-all duration-300 font-sans text-sm font-medium flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: "#1DB954",
                      color: "#000",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#1ed760"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#1DB954"
                    }}
                  >
                    <ExternalLink size={16} />
                    Export to Spotify
                  </button>
                </div>
              </div>
            </div>

            {/* Input de edición con IA. */}
            <div className="mt-4">
              <form onSubmit={handleEditWithAI} className="w-full flex flex-col gap-4">
                <div
                  className="flex items-center gap-0 rounded-full transition-all duration-300 w-full"
                  style={{ backgroundColor: "#1a1a1a" }}
                >
                  <button
                    type="submit"
                    className="mr-3 p-2 rounded-full transition-all duration-300 hover:scale-110 flex items-center justify-center"
                    style={{
                      backgroundColor: "#1DB954",
                      color: "#000",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 0 16px rgba(29, 185, 84, 0.4)"
                      e.currentTarget.style.backgroundColor = "#1ed760"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none"
                      e.currentTarget.style.backgroundColor = "#1DB954"
                    }}
                    aria-label="Edit with AI"
                  >
                    <Send size={20} strokeWidth={2.5} />
                  </button>
                </div>
              </form>
            </div>

            {/* Lista de canciones */}
            <div className="mt-4">
              <h3 className="text-white text-lg font-medium mb-4" style={{ fontFamily: "system-ui, sans-serif" }}>
                Songs
              </h3>
              <div className="space-y-2">
                {tracks.map((track, index) => (
                  <div
                    key={track.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className="flex items-center gap-4 p-3 rounded-lg transition-all duration-300 hover:bg-[#1a1a1a] cursor-move group"
                    style={{ backgroundColor: "#0a0a0a" }}
                  >
                    <GripVertical 
                      className="w-5 h-5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                    />
                    <span className="text-gray-500 text-sm w-6 text-right">{index + 1}</span>
                    <img
                      src={track.image}
                      alt={track.album}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{track.name}</p>
                      <p className="text-gray-400 text-xs truncate">{track.artist}</p>
                    </div>
                    {track.preview_url && (
                      <audio
                        controls
                        className="h-8 max-w-[200px]"
                        preload="none"
                        onPlay={(e) => {
                          // Pausar otros audios cuando se reproduce uno
                          document.querySelectorAll('audio').forEach((audio) => {
                            if (audio !== e.currentTarget) {
                              audio.pause()
                            }
                          })
                        }}
                      >
                        <source src={track.preview_url} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    )}
                    <div className="text-gray-500 text-xs">
                      {Math.floor(track.duration_ms / 60000)}:{(Math.floor((track.duration_ms % 60000) / 1000)).toString().padStart(2, '0')}
                    </div>
                    <button
                      onClick={() => handleDeleteTrack(track.id)}
                      className="p-2 rounded-lg transition-all duration-300 opacity-0 group-hover:opacity-100 hover:bg-red-500/20"
                      style={{ color: "#ef4444" }}
                      aria-label="Delete track"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {flowState === 'creating' && (
          <div className="w-full max-w-2xl mx-auto px-4 flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-[#1DB954] animate-spin" />
              <div className="text-center">
                <h2 className="text-white text-2xl font-medium mb-2" style={{ fontFamily: "system-ui, sans-serif" }}>
                  {massiveProgress.total > 0 
                    ? `Creating playlist ${massiveProgress.current} of ${massiveProgress.total}...`
                    : "Creating your playlist..."
                  }
                </h2>
                <p className="text-gray-400 text-sm">
                  {massiveProgress.total > 0 
                    ? loadingMessage
                    : `Adding ${tracks.length} songs to Spotify`
                  }
                </p>
                {massiveProgress.total > 0 && (
                  <div className="mt-4 w-64 mx-auto">
                    <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#1DB954] transition-all duration-500"
                        style={{ width: `${(massiveProgress.current / massiveProgress.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-gray-500 text-xs mt-2">
                      {massiveProgress.current} / {massiveProgress.total} playlists
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {flowState === 'success' && (
          <div className="w-full max-w-2xl mx-auto px-4 flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="w-16 h-16 text-[#1DB954]" />
              <div className="text-center">
                <h2 className="text-white text-2xl font-medium mb-2" style={{ fontFamily: "system-ui, sans-serif" }}>
                  {createdPlaylists.length > 1 
                    ? `${createdPlaylists.length} Playlists Created!`
                    : "Playlist Created!"
                  }
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                  {createdPlaylists.length > 1 
                    ? "Your playlists have been successfully created on Spotify"
                    : "Your playlist has been successfully created on Spotify"
                  }
                </p>
              </div>

              {/* Multiple playlists list */}
              {createdPlaylists.length > 1 ? (
                <div className="w-full max-w-md space-y-3 mb-4">
                  {createdPlaylists.map((playlist, index) => (
                    <a
                      key={index}
                      href={playlist.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg transition-all duration-300 hover:bg-[#252525] group"
                      style={{ backgroundColor: "#1a1a1a" }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center text-black font-bold text-sm">
                          {index + 1}
                        </div>
                        <span className="text-white text-sm font-medium">{playlist.name}</span>
                      </div>
                      <ExternalLink size={16} className="text-gray-500 group-hover:text-[#1DB954] transition-colors" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={playlistUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-full transition-all duration-300 font-sans text-sm font-medium flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: "#1DB954",
                      color: "#000",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#1ed760"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#1DB954"
                    }}
                  >
                    Open in Spotify
                    <ExternalLink size={16} />
                  </a>
                </div>
              )}

              {/* Create Another button - works for both single and massive */}
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-full transition-all duration-300 font-sans text-sm font-medium mt-4"
                style={{
                  backgroundColor: "#2a2a2a",
                  color: "#fff",
                  border: "1px solid #444",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#333"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#2a2a2a"
                }}
              >
                Create Another
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal para conectar Spotify */}
      <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
        <DialogContent
          className="sm:max-w-md rounded-2xl"
          showCloseButton={false}
          style={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "1.5rem",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-semibold">
              Connect your Spotify
            </DialogTitle>
            <DialogDescription className="text-gray-400 pt-2">
              You need to connect your Spotify account to create playlists.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={() => setShowConnectModal(false)}
              className="px-4 py-2 rounded-full transition-all duration-300 font-sans text-sm font-medium"
              style={{
                backgroundColor: "#2a2a2a",
                color: "#fff",
                border: "1px solid #444",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#333"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#2a2a2a"
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              className="px-4 py-2 rounded-full transition-all duration-300 font-sans text-sm font-medium"
              style={{
                backgroundColor: "#1DB954",
                color: "#000",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#1ed760"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#1DB954"
              }}
            >
              Connect Spotify
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación al salir */}
      <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
        <DialogContent
          className="sm:max-w-md rounded-2xl"
          showCloseButton={false}
          style={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "1.5rem",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-semibold">
              Save your playlist?
            </DialogTitle>
            <DialogDescription className="text-gray-400 pt-2">
              You have unsaved changes. Do you want to export your playlist to Spotify or discard it?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-3" style={{ gap: "1rem" }}>
            <button
              onClick={() => setShowExitModal(false)}
              className="px-6 py-2 rounded-full transition-all duration-300 font-sans text-sm font-medium"
              style={{
                backgroundColor: "transparent",
                color: "#fff",
                border: "1px solid #333",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#2a2a2a"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent"
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleExitConfirm('discard')}
              className="px-6 py-2 rounded-full transition-all duration-300 font-sans text-sm font-medium"
              style={{
                backgroundColor: "transparent",
                color: "#ef4444",
                border: "1px solid #ef4444",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent"
              }}
            >
              <Trash2 size={16} className="inline mr-2" />
              Discard
            </button>
            <button
              onClick={() => handleExitConfirm('save')}
              className="px-6 py-2 rounded-full transition-all duration-300 font-sans text-sm font-medium"
              style={{
                backgroundColor: "#1DB954",
                color: "#000",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#1ed760"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#1DB954"
              }}
            >
              <ExternalLink size={16} className="inline mr-2" />
              Export to Spotify
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="w-full py-4 relative z-10 flex justify-center">
        <p className="text-gray-500 text-sm">
          Powered by{" "}
          <a
            href="https://dotasolutions.agency"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1DB954] hover:text-[#1ed760] transition-colors"
          >
            Dota Solutions
          </a>
        </p>
      </footer>
    </main>
  )
}
