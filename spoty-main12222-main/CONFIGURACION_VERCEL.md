# Configuración de Variables de Entorno en Vercel

## ⚠️ IMPORTANTE: Configurar Variables en Vercel

Para que la aplicación funcione correctamente en producción, debes configurar las siguientes variables de entorno en Vercel:

## Pasos para Configurar:

1. **Ve a tu proyecto en Vercel Dashboard**
   - https://vercel.com/dashboard
   - Selecciona tu proyecto `spoty-bydota`

2. **Ve a Settings → Environment Variables**

3. **Agrega las siguientes variables:**

### Variables de Supabase (OBLIGATORIAS):

```
NEXT_PUBLIC_SUPABASE_URL=https://lsfqvzqmmbjhmbcnbqds.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZnF2enFtbWJqaG1iY25icWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzUzOTgsImV4cCI6MjA4MDExMTM5OH0.zlOjNsS09MeIBiFIOiGvZZYGAN5wOoJeY4cIhFPLXZk
```

**O alternativamente (sin prefijo NEXT_PUBLIC_):**

```
SUPABASE_URL=https://lsfqvzqmmbjhmbcnbqds.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZnF2enFtbWJqaG1iY25icWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzUzOTgsImV4cCI6MjA4MDExMTM5OH0.zlOjNsS09MeIBiFIOiGvZZYGAN5wOoJeY4cIhFPLXZk
```

### Variables de Spotify (OBLIGATORIAS):

```
SPOTIFY_CLIENT_ID=f1e5141136604aa8a94f5f1e6982877a
SPOTIFY_CLIENT_SECRET=75f2c31ded54459bba5ae910dba74f57
SPOTIFY_REDIRECT_URI=https://spoty-bydota.vercel.app/api/auth/callback
```

### Variables de OpenAI (OBLIGATORIAS):

```
OPENAI_API_KEY=tu_openai_api_key_aqui
```

### Variables Opcionales:

```
GEMINI_API_KEY=tu_gemini_api_key_aqui (opcional)
```

## 4. Seleccionar Ambientes

Para cada variable, asegúrate de seleccionar los ambientes donde debe estar disponible:
- ✅ **Production**
- ✅ **Preview** (opcional, pero recomendado)
- ✅ **Development** (opcional)

## 5. Redesplegar

Después de agregar las variables:
1. Ve a la pestaña **Deployments**
2. Haz clic en los tres puntos (...) del último deployment
3. Selecciona **Redeploy**

O simplemente haz un nuevo push a la rama `main` para que se redesplegue automáticamente.

## Verificación

Después del redespliegue, verifica que:
- ✅ No aparezcan errores de `placeholder.supabase.co` en los logs
- ✅ La autenticación de Spotify funcione correctamente
- ✅ Las consultas a Supabase funcionen

## Troubleshooting

### Error: "getaddrinfo ENOTFOUND placeholder.supabase.co"

**Causa:** Las variables de entorno de Supabase no están configuradas en Vercel.

**Solución:** 
1. Ve a Vercel Dashboard → Settings → Environment Variables
2. Agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Redesplega la aplicación

### Error: "invalid client invalid redirect uri"

**Causa:** El redirect URI en Spotify Dashboard no coincide con el de Vercel.

**Solución:**
1. Verifica que `SPOTIFY_REDIRECT_URI` en Vercel sea: `https://spoty-bydota.vercel.app/api/auth/callback`
2. Verifica que en Spotify Developer Dashboard tengas exactamente el mismo URI
3. Redesplega la aplicación

## Notas Importantes

- ⚠️ Las variables con prefijo `NEXT_PUBLIC_` son accesibles en el cliente (navegador)
- 🔒 Las variables sin prefijo solo están disponibles en el servidor
- 🔄 Después de agregar variables, siempre redesplega la aplicación
- 📝 Puedes usar el mismo valor para ambas variantes (con y sin prefijo) si quieres

