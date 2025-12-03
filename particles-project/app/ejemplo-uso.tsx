/**
 * EJEMPLOS DE USO DEL COMPONENTE ParticlesBackground
 * 
 * Este archivo muestra diferentes formas de usar el componente de partículas
 */

import { ParticlesBackground } from "@/components/ParticlesBackground"

// Ejemplo 1: Uso básico
export function EjemploBasico() {
  return (
    <div className="min-h-screen relative bg-black">
      <ParticlesBackground />
      <div className="relative z-10 p-8">
        <h1 className="text-white text-4xl">Mi Contenido</h1>
      </div>
    </div>
  )
}

// Ejemplo 2: Con contenido centrado
export function EjemploCentrado() {
  return (
    <main className="min-h-screen flex items-center justify-center relative bg-black">
      <ParticlesBackground />
      <div className="relative z-10 text-center">
        <h1 className="text-white text-6xl font-bold mb-4">
          Título Principal
        </h1>
        <p className="text-gray-300 text-xl">
          Descripción del contenido
        </p>
      </div>
    </main>
  )
}

// Ejemplo 3: Con múltiples secciones
export function EjemploMultiSeccion() {
  return (
    <div className="min-h-screen relative bg-black">
      <ParticlesBackground />
      
      {/* Sección 1 */}
      <section className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-white text-6xl font-bold">Sección 1</h1>
        </div>
      </section>
      
      {/* Sección 2 */}
      <section className="relative z-10 min-h-screen flex items-center justify-center bg-black/50">
        <div className="text-center">
          <h2 className="text-white text-4xl font-bold">Sección 2</h2>
        </div>
      </section>
    </div>
  )
}

// Ejemplo 4: Con overlay oscuro para mejor legibilidad
export function EjemploConOverlay() {
  return (
    <div className="min-h-screen relative bg-black">
      <ParticlesBackground />
      {/* Overlay oscuro para mejor legibilidad del texto */}
      <div className="fixed inset-0 bg-black/40 z-[1]" />
      <div className="relative z-10 p-8">
        <h1 className="text-white text-4xl">Contenido con Overlay</h1>
      </div>
    </div>
  )
}


