# Per-user locations (JSON by user)

Cada usuario tiene su propio archivo JSON con su lista de países. El identificador del usuario se obtiene del token (Auth0); por ahora no hay base de datos.

## Convención de nombres de archivo

- **Email:** se convierte a nombre de archivo reemplazando `@` y `.` por `_`.  
  Ejemplo: `agustinafassina@gmail.com` → `agustinafassina_gmail_com.json`
- **Nickname / user id:** si se usa algo que no es email (ej. `agusfas_5`), el archivo es `agusfas_5.json`.

## Estructura de cada JSON

Array de objetos con la misma forma que `web_locations.json` (nombre, código, lat/lng, status, etc.). Ver el README de `../` o el ejemplo en `agustinafassina_gmail_com.json`.

## Archivos en esta carpeta

| Archivo | Usuario | Contenido |
|---------|---------|-----------|
| `agusfas_5.json` | agusfas_5 | Lista vacía `[]` |
| `agustinafassina_gmail_com.json` | agustinafassina@gmail.com | Copia de `web_locations.json` |
| `florencia_maltinti_gmail_com.json` | florencia.maltinti@gmail.com | Peru, Colombia, México, Chile, Italia, Malta, España, Francia, Andorra, Luxemburgo, Países Bajos, Inglaterra, Austria, Polonia, Tailandia, Suiza, Singapur, Escocia |
