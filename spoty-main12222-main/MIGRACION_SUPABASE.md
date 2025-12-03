# Migración de JSON a Supabase

Este proyecto ha sido migrado para consumir datos de canciones desde Supabase en lugar del archivo `tracks.json`.

## Cambios Realizados

### Archivos Nuevos
- `lib/search-tracks-from-db.ts` - Nueva función para buscar tracks desde Supabase

### Archivos Modificados
- `lib/supabase.ts` - Actualizado para soportar variables de entorno con y sin prefijo `NEXT_PUBLIC_`
- `lib/openai-track-selection.ts` - Actualizado para obtener tracks desde Supabase
- `app/api/generate-playlist/route.ts` - Actualizado para usar `searchTracksFromDB` en lugar de `searchTracksFromJSON`

### Archivos Obsoletos (pueden eliminarse)
- `lib/search-tracks-from-json.ts` - Ya no se usa, reemplazado por `search-tracks-from-db.ts`
- `tracks.json` - Ya no se usa, los datos están en Supabase

## Configuración de Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Supabase Configuration
SUPABASE_URL=https://lsfqvzqmmbjhmbcnbqds.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZnF2enFtbWJqaG1iY25icWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzUzOTgsImV4cCI6MjA4MDExMTM5OH0.zlOjNsS09MeIBiFIOiGvZZYGAN5wOoJeY4cIhFPLXZk

# Para compatibilidad con código existente, también usar NEXT_PUBLIC_ prefijos
NEXT_PUBLIC_SUPABASE_URL=https://lsfqvzqmmbjhmbcnbqds.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZnF2enFtbWJqaG1iY25icWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzUzOTgsImV4cCI6MjA4MDExMTM5OH0.zlOjNsS09MeIBiFIOiGvZZYGAN5wOoJeY4cIhFPLXZk
```

## Estructura de la Tabla en Supabase

La tabla `artist_tracks` tiene la siguiente estructura:

```sql
create table public.artist_tracks (
  id bigserial not null,
  spotify_id text not null,
  name text null,
  artists text[] null,
  artist_main text null,
  album text null,
  release_date date null,
  duration_ms integer null,
  bpm numeric null,
  genres text[] null,
  preview_url text null,
  cover_url text null,
  fetched_at timestamp with time zone null default now(),
  constraint artist_tracks_pkey primary key (id),
  constraint artist_tracks_spotify_id_key unique (spotify_id)
);
```

## Mapeo de Campos

| JSON (anterior) | Supabase (actual) |
|----------------|------------------|
| `id` | `spotify_id` |
| `name` | `name` |
| `artists[]` | `artists[]` |
| `artists[0]` | `artist_main` |
| `album` | `album` |
| `release_date` | `release_date` |
| `duration_ms` | `duration_ms` |
| `genres[]` | `genres[]` |
| `preview_url` | `preview_url` |
| N/A | `cover_url` |
| N/A | `bpm` |

## Funciones Disponibles

### `searchTracksFromDB(trackQueries, genreFilter?)`
Busca tracks específicos en la base de datos.

**Parámetros:**
- `trackQueries`: Array de objetos `{ trackName: string, artistName: string }`
- `genreFilter`: (opcional) Género para filtrar resultados

**Retorna:** `Promise<Track[]>`

### `getAllTracksFromDB()`
Obtiene todos los tracks disponibles en la base de datos.

**Retorna:** `Promise<Track[]>`

## Notas Importantes

1. **Búsqueda Flexible**: La función busca primero por coincidencia exacta, y si no encuentra, busca por coincidencia parcial.

2. **Filtrado por Género**: Si se especifica un género, solo se retornan tracks que coincidan con ese género.

3. **Normalización**: Los nombres de tracks y artistas se normalizan (sin acentos, lowercase) para mejorar las coincidencias.

4. **Performance**: Las consultas están optimizadas con índices en `spotify_id` y `artist_main`.

## Próximos Pasos

1. Configurar las variables de entorno en `.env.local`
2. Verificar que la conexión a Supabase funcione correctamente
3. (Opcional) Eliminar `lib/search-tracks-from-json.ts` y `tracks.json` si ya no se necesitan

