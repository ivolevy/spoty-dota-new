# Configuración de Variables de Entorno

## Crear archivo `.env.local`

Crea un archivo `.env.local` en la raíz del proyecto (`spoty-main12222-main/.env.local`) con el siguiente contenido:

```env
# Supabase Configuration
SUPABASE_URL=https://lsfqvzqmmbjhmbcnbqds.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZnF2enFtbWJqaG1iY25icWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzUzOTgsImV4cCI6MjA4MDExMTM5OH0.zlOjNsS09MeIBiFIOiGvZZYGAN5wOoJeY4cIhFPLXZk

# Para compatibilidad con código existente, también usar NEXT_PUBLIC_ prefijos
NEXT_PUBLIC_SUPABASE_URL=https://lsfqvzqmmbjhmbcnbqds.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZnF2enFtbWJqaG1iY25icWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzUzOTgsImV4cCI6MjA4MDExMTM5OH0.zlOjNsS09MeIBiFIOiGvZZYGAN5wOoJeY4cIhFPLXZk

# Spotify API (si las necesitas)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# OpenAI API
OPENAI_API_KEY=your_openai_api_key
```

## Importante

- El archivo `.env.local` NO debe subirse a Git (ya está en `.gitignore`)
- Después de crear el archivo, reinicia el servidor de desarrollo (`npm run dev`)

