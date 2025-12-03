import { ParticlesBackground } from "@/components/ParticlesBackground"

export default function Home() {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center relative" style={{ backgroundColor: "#000" }}>
      {/* Fondo de partículas */}
      <ParticlesBackground />
      
      {/* Contenido principal */}
      <div className="relative z-10 text-center px-4">
        <h1 className="text-6xl font-bold text-white mb-4">
          Fondo de Partículas
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Mueve el cursor para ver cómo las partículas reaccionan
        </p>
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-8 max-w-2xl mx-auto border border-gray-800">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Características
          </h2>
          <ul className="text-left text-gray-300 space-y-2">
            <li>✨ Partículas animadas con movimiento suave</li>
            <li>🔗 Conexiones visuales entre partículas cercanas</li>
            <li>🖱️ Interacción con el cursor (las partículas se alejan)</li>
            <li>🎨 Colores verdes tipo Spotify</li>
            <li>📱 Responsive y optimizado</li>
          </ul>
        </div>
      </div>
    </main>
  )
}


