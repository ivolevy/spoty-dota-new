import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

interface MetricsData {
  totalPlaylists: number
  totalTracks: number
  uniqueTracks: number
  uniqueArtists: number
  uniqueAlbums: number
  totalDuration: number
  avgTracksPerPlaylist: number
  totalFollowers: number
  publicCount: number
  privateCount: number
  topArtists: { name: string; trackCount: number }[]
  topAlbums: { name: string; artist: string; trackCount: number }[]
  topPlaylists: { name: string; tracksCount: number; followers: number }[]
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

function generateEmailHTML(metrics: MetricsData, userName: string): string {
  const topArtistsHTML = metrics.topArtists
    .slice(0, 5)
    .map((a, i) => `<tr><td style="padding: 8px; border-bottom: 1px solid #333;">${i + 1}. ${a.name}</td><td style="padding: 8px; border-bottom: 1px solid #333; text-align: right;">${a.trackCount} tracks</td></tr>`)
    .join("")

  const topAlbumsHTML = metrics.topAlbums
    .slice(0, 5)
    .map((a, i) => `<tr><td style="padding: 8px; border-bottom: 1px solid #333;">${i + 1}. ${a.name}</td><td style="padding: 8px; border-bottom: 1px solid #333;">${a.artist}</td><td style="padding: 8px; border-bottom: 1px solid #333; text-align: right;">${a.trackCount} tracks</td></tr>`)
    .join("")

  const topPlaylistsHTML = metrics.topPlaylists
    .slice(0, 5)
    .map((p, i) => `<tr><td style="padding: 8px; border-bottom: 1px solid #333;">${i + 1}. ${p.name}</td><td style="padding: 8px; border-bottom: 1px solid #333; text-align: right;">${p.tracksCount} tracks</td><td style="padding: 8px; border-bottom: 1px solid #333; text-align: right;">${p.followers} followers</td></tr>`)
    .join("")

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Metrics Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #1DB954; font-size: 28px; margin: 0 0 8px 0;">📊 Metrics Report</h1>
      <p style="color: #666; font-size: 14px; margin: 0;">Generated for ${userName}</p>
      <p style="color: #444; font-size: 12px; margin: 8px 0 0 0;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <!-- Overview Stats -->
    <div style="background-color: #1a1a1a; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h2 style="color: #fff; font-size: 18px; margin: 0 0 20px 0; border-bottom: 1px solid #333; padding-bottom: 12px;">📈 Overview</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #888;">Total Playlists</td>
          <td style="padding: 8px 0; color: #1DB954; text-align: right; font-weight: bold;">${metrics.totalPlaylists}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888;">Total Tracks</td>
          <td style="padding: 8px 0; color: #1DB954; text-align: right; font-weight: bold;">${metrics.totalTracks}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888;">Unique Songs</td>
          <td style="padding: 8px 0; color: #1DB954; text-align: right; font-weight: bold;">${metrics.uniqueTracks}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888;">Unique Artists</td>
          <td style="padding: 8px 0; color: #1DB954; text-align: right; font-weight: bold;">${metrics.uniqueArtists}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888;">Unique Albums</td>
          <td style="padding: 8px 0; color: #1DB954; text-align: right; font-weight: bold;">${metrics.uniqueAlbums}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888;">Total Duration</td>
          <td style="padding: 8px 0; color: #1DB954; text-align: right; font-weight: bold;">${formatDuration(metrics.totalDuration)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888;">Total Followers</td>
          <td style="padding: 8px 0; color: #1DB954; text-align: right; font-weight: bold;">${metrics.totalFollowers}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888;">Avg Tracks/Playlist</td>
          <td style="padding: 8px 0; color: #1DB954; text-align: right; font-weight: bold;">${metrics.avgTracksPerPlaylist}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888;">Public / Private</td>
          <td style="padding: 8px 0; color: #1DB954; text-align: right; font-weight: bold;">${metrics.publicCount} / ${metrics.privateCount}</td>
        </tr>
      </table>
    </div>

    <!-- Top Artists -->
    <div style="background-color: #1a1a1a; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h2 style="color: #fff; font-size: 18px; margin: 0 0 20px 0; border-bottom: 1px solid #333; padding-bottom: 12px;">🎤 Top Artists</h2>
      <table style="width: 100%; border-collapse: collapse; color: #fff;">
        ${topArtistsHTML || '<tr><td style="color: #666; padding: 8px;">No data available</td></tr>'}
      </table>
    </div>

    <!-- Top Albums -->
    <div style="background-color: #1a1a1a; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h2 style="color: #fff; font-size: 18px; margin: 0 0 20px 0; border-bottom: 1px solid #333; padding-bottom: 12px;">💿 Top Albums</h2>
      <table style="width: 100%; border-collapse: collapse; color: #fff;">
        ${topAlbumsHTML || '<tr><td style="color: #666; padding: 8px;">No data available</td></tr>'}
      </table>
    </div>

    <!-- Top Playlists -->
    <div style="background-color: #1a1a1a; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h2 style="color: #fff; font-size: 18px; margin: 0 0 20px 0; border-bottom: 1px solid #333; padding-bottom: 12px;">📀 Top Playlists</h2>
      <table style="width: 100%; border-collapse: collapse; color: #fff;">
        ${topPlaylistsHTML || '<tr><td style="color: #666; padding: 8px;">No data available</td></tr>'}
      </table>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #333;">
      <p style="color: #666; font-size: 12px; margin: 0;">
        Powered by <span style="color: #1DB954;">SkyTrack</span>
      </p>
      <p style="color: #444; font-size: 11px; margin: 8px 0 0 0;">
        This report was automatically generated. Do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>
`
}

export async function POST(request: Request) {
  try {
    const { email, metrics, userName } = await request.json()

    if (!email || !metrics) {
      return NextResponse.json(
        { error: "Email and metrics are required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    // Generate email HTML
    const htmlContent = generateEmailHTML(metrics, userName || "User")

    // Send email
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || "SkyTrack"}" <${process.env.EMAIL_FROM || process.env.GMAIL_USER}>`,
      to: email,
      subject: `📊 Your Metrics Report - ${new Date().toLocaleDateString()}`,
      html: htmlContent,
    })

    return NextResponse.json({ success: true, message: "Report sent successfully" })
  } catch (error) {
    console.error("Error sending email:", error)
    return NextResponse.json(
      { error: "Failed to send email. Please try again." },
      { status: 500 }
    )
  }
}

