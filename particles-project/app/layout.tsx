import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Particles Background',
  description: 'Fondo animado de partículas con efectos interactivos',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}


