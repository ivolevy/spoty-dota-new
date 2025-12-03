# 🎨 Proyecto de Fondo de Partículas Animadas

Un componente React/Next.js completo que crea un fondo animado de partículas con efectos interactivos.

## ✨ Características

- **Partículas animadas**: Movimiento suave y natural de partículas por toda la pantalla
- **Conexiones visuales**: Líneas que conectan partículas cercanas (dentro de 120px)
- **Interacción con cursor**: Las partículas se alejan cuando el cursor está cerca (radio de 250px)
- **Colores personalizables**: Por defecto usa verdes tipo Spotify
- **Responsive**: Se adapta automáticamente al tamaño de la ventana
- **Optimizado**: Usa `requestAnimationFrame` para animaciones fluidas

## 🚀 Instalación

1. **Instalar dependencias:**
```bash
npm install
```

2. **Ejecutar en desarrollo:**
```bash
npm run dev
```

3. **Abrir en el navegador:**
```
http://localhost:3000
```

## 📁 Estructura del Proyecto

```
particles-project/
├── components/
│   └── ParticlesBackground.tsx  # Componente principal de partículas
├── app/
│   ├── page.tsx                 # Página de ejemplo
│   ├── layout.tsx               # Layout principal
│   └── globals.css              # Estilos globales
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## 🎯 Uso del Componente

### Importar el componente:

```tsx
import { ParticlesBackground } from "@/components/ParticlesBackground"
```

### Usar en tu página:

```tsx
export default function MiPagina() {
  return (
    <main className="min-h-screen relative" style={{ backgroundColor: "#000" }}>
      {/* Fondo de partículas */}
      <ParticlesBackground />
      
      {/* Tu contenido aquí */}
      <div className="relative z-10">
        <h1>Mi Contenido</h1>
      </div>
    </main>
  )
}
```

## ⚙️ Personalización

### Cambiar colores de las partículas:

Edita el array `colorSets` en `ParticlesBackground.tsx`:

```tsx
const colorSets = [
  { r: 29, g: 185, b: 84 },   // Verde Spotify
  { r: 30, g: 215, b: 96 },   // Verde claro
  { r: 25, g: 230, b: 108 },  // Verde brillante
]
```

### Ajustar densidad de partículas:

Modifica el cálculo de `particleCount`:

```tsx
// Más partículas (número menor = más denso)
const particleCount = Math.floor((canvas.width * canvas.height) / 8000)

// Menos partículas (número mayor = menos denso)
const particleCount = Math.floor((canvas.width * canvas.height) / 12000)
```

### Cambiar radio de influencia del cursor:

```tsx
const influenceRadius = 250  // Aumenta para mayor área de efecto
```

### Cambiar distancia de conexión entre partículas:

```tsx
if (distance < 120) {  // Cambia 120 por el valor deseado
  // ... código de conexión
}
```

## 🎨 Ejemplo Completo

Ver `app/page.tsx` para un ejemplo completo de implementación.

## 📝 Notas Técnicas

- El componente usa Canvas API para renderizado de alto rendimiento
- Las animaciones usan `requestAnimationFrame` para optimización
- Se limpian correctamente los event listeners y animation frames al desmontar
- El canvas está configurado como `fixed` y `pointer-events-none` para no interferir con el contenido

## 🔧 Requisitos

- Node.js 18+ 
- Next.js 16+
- React 19+
- TypeScript

## 📄 Licencia

Este proyecto es de código abierto y está disponible para uso personal y comercial.


