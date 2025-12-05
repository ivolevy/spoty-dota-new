# Variables de Entorno Completas para Vercel

## ⚠️ IMPORTANTE: Configurar TODAS estas variables

Para que la aplicación funcione correctamente, necesitas configurar **TODAS** estas variables en Vercel:

## 📋 Lista Completa de Variables

### 1. Base de Datos de CANCIONES (artist_tracks)
**URL:** `https://lsfqvzqmmbjhmbcnbqds.supabase.co`

```
SUPABASE_URL=https://lsfqvzqmmbjhmbcnbqds.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZnF2enFtbWJqaG1iY25icWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzUzOTgsImV4cCI6MjA4MDExMTM5OH0.zlOjNsS09MeIBiFIOiGvZZYGAN5wOoJeY4cIhFPLXZk
```

**Uso:** Consultar canciones desde la tabla `artist_tracks`

---

### 2. Base de Datos de USUARIOS (users, playlists)
**URL:** `https://klafufgasozdtawtytsh.supabase.co`

```
NEXT_PUBLIC_SUPABASE_URL=https://klafufgasozdtawtytsh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsYWZ1Zmdhc296ZHRhd3R5dHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MzMzNDYsImV4cCI6MjA4MDAwOTM0Nn0.dci9z8zLzAMemcKfwDJtBXidIrvkvNSs3LXPfMP4gNM
```

**Uso:** Gestionar usuarios y sus playlists

---

### 3. Spotify API

```
SPOTIFY_CLIENT_ID=f1e5141136604aa8a94f5f1e6982877a
SPOTIFY_CLIENT_SECRET=75f2c31ded54459bba5ae910dba74f57
SPOTIFY_REDIRECT_URI=https://spoty-bydota.vercel.app/api/auth/callback
```

---

### 4. OpenAI API

```
OPENAI_API_KEY=tu_openai_api_key_aqui
```

---

## ✅ Checklist de Configuración

- [ ] `SUPABASE_URL` configurada (Base de datos de canciones)
- [ ] `SUPABASE_ANON_KEY` configurada (Base de datos de canciones)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada (Base de datos de usuarios)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada (Base de datos de usuarios)
- [ ] `SPOTIFY_CLIENT_ID` configurada
- [ ] `SPOTIFY_CLIENT_SECRET` configurada
- [ ] `SPOTIFY_REDIRECT_URI` configurada
- [ ] `OPENAI_API_KEY` configurada
- [ ] Todas las variables tienen seleccionado "Production" (y Preview si quieres)
- [ ] Se hizo redeploy después de agregar las variables

## 🔍 Verificación

Después del redeploy, revisa los logs en Vercel. Deberías ver:

```
🔍 [Supabase Data Config] Verificando variables de entorno:
   - SUPABASE_URL: SET
   - SUPABASE_ANON_KEY: SET
✅ [Supabase Data Config] Usando configuración real de Supabase para datos/canciones
```

Si ves "NOT SET" o "placeholder.supabase.co", significa que las variables no están configuradas correctamente.



