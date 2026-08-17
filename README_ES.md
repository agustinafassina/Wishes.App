# ✈️ Wishes App — Tu lista personal de viajes
Aplicación web para registrar países que querés visitar, los que estás planificando y los que ya exploraste, con mapa mundial interactivo, estadísticas y datos por usuario.

**English:** [README.md](./README.md)

<p align="center">
  <img src="first-part.png" alt="Panel — estadísticas, mapa y listado" width="480">
  <img src="second-part.png" alt="Tarjetas de países y progreso" width="480">
</p>

## ✨ Qué hace la app
- **Mapa interactivo** — Leaflet + tiles CARTO, marcadores por estado (**Complete**, **Review**, **To Do**)
- **Filtros unificados** — pills arriba del mapa (**All · Complete · Review · To Do**) filtran mapa y listado
- **Listado** — grilla de tarjetas (hasta 3 columnas), orden A–Z / Z–A y búsqueda
- **Progreso** — barra e hitos al filtrar **Complete** (compartir enlace o imagen)
- **Por país** — cambiar estado con **Move to**, ver/editar notas (visitados), eliminar con confirmación
- **Agregar país** — desde la barra del mapa (o el CTA del empty state al empezar); opcional **Pick from map** para coordenadas
- **Temas** — claro y oscuro
- **Auth0** — cada usuario tiene su lista privada

Guía de uso paso a paso: [MANUAL_DE_USO.md](./MANUAL_DE_USO.md).

## 💾 Cómo se guardan los datos
No hay base SQL ni MongoDB. Tras iniciar sesión, la app lee y escribe un **archivo JSON por usuario** en `data/locations/users/` (el nombre sale de la identidad Auth0). Esa carpeta está **fuera** de `public/`, así que los archivos no se sirven como URLs estáticas: solo las APIs autenticadas pueden leerlos/escribirlos.

- Convención de archivos: [data/locations/users/README.md](./data/locations/users/README.md)

Las rutas en `app/api/*` crean, actualizan, eliminan y cargan países del usuario logueado.

## 🏳️ Objeto país
Cada elemento del array JSON del usuario puede tener:

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | string | Sí | Nombre del país (ej. `"Italia"`). |
| `code` | string | Sí | Código ISO de 2 letras (ej. `"IT"`). Único por usuario. |
| `latitude` | number | Sí | Latitud del marcador. |
| `longitude` | number | Sí | Longitud del marcador. |
| `status` | string | Sí | `"done"`, `"in review"` o `"pending"`. |
| `flag` | string | No | URL de bandera (por defecto [flagcdn.com](https://flagcdn.com) según `code`). |
| `photos` | string[] | No | URLs de fotos. |
| `notes` | string | No | Notas (suele usarse con `status` `"done"`). |
| `visitedAt` | string | No | Fecha o período (ej. `"2024"`, `"Abril 2024"`). |
| `tags` | string[] | No | Etiquetas (ej. `["comida", "historia"]`). |
| `tag` | string | No | Legacy: un solo tag; se ignora si existe `tags`. |

Ejemplo:

```json
{
  "name": "Italia",
  "code": "IT",
  "latitude": 41.8719,
  "longitude": 12.5674,
  "flag": "https://flagcdn.com/w40/it.png",
  "status": "done",
  "notes": "Viaje increíble.",
  "visitedAt": "Abril 2024",
  "tags": ["comida", "historia"]
}
```

## ✅ Funcionalidades
| Área | Estado |
|------|--------|
| Leaflet + CARTO + zoom personalizado | Hecho |
| Pills del mapa filtran mapa + listado | Hecho |
| Elegir coordenadas en el mapa | Hecho |
| Alta / edición / baja de países | Hecho |
| Notas y tags (visitados) | Hecho |
| Tema claro / oscuro | Hecho |
| Compartir enlace / imagen de progreso | Hecho |
| Login Auth0 | Hecho |
| Búsqueda + orden A–Z | Hecho |
| Hitos de progreso (10 / 25 / 50…) | Hecho |
| Exportar / importar respaldo (JSON/CSV) | Planificado |

## 📋 Requisitos
- Node.js 18+
- Aplicación Auth0 (Regular Web Application)

## ⚙️ Configuración del entorno
1. Copiá el archivo de ejemplo:

```bash
cp .env.example .env
```

2. Completá las variables:

| Variable | Descripción |
|----------|-------------|
| `AUTH0_DOMAIN` | Dominio del tenant Auth0. |
| `AUTH0_CLIENT_ID` | Client ID de la aplicación. |
| `AUTH0_CLIENT_SECRET` | Client Secret. |
| `AUTH0_SECRET` | Cadena aleatoria ≥ 32 caracteres (`openssl rand -hex 32`). |
| `APP_BASE_URL` | URL de la app (dev: `http://localhost:3000`; prod: `https://…`). |

**URIs en Auth0 (desarrollo):**

- Allowed Callback URLs: `http://localhost:3000/auth/callback`
- Allowed Logout URLs: `http://localhost:3000`

En producción agregá las mismas URLs con tu host público (más abajo).

Ejemplo `.env`:

```env
AUTH0_DOMAIN=tu-tenant.us.auth0.com
AUTH0_CLIENT_ID=tu_client_id
AUTH0_CLIENT_SECRET=tu_client_secret
AUTH0_SECRET=cadena_aleatoria_larga_minimo_32_caracteres
APP_BASE_URL=http://localhost:3000
```

### 🗺️ Mapa (Leaflet + CARTO)
No hace falta API key. El mapa usa tiles CARTO (`light_all` / `dark_all`) y reverse-geocode opcional vía Nominatim al usar **Pick from map**.

### 🔐 Auth0
1. Cuenta en [auth0.com](https://auth0.com)
2. Application tipo **Regular Web Application**
3. Copiá Domain, Client ID y Client Secret al `.env`
4. Configurá Callback y Logout URLs como arriba

## 🚀 Instalar y ejecutar
```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

También: `yarn dev`, `pnpm dev`, `bun dev`.

```bash
npm run build
npm start
```

## 🐳 Docker
Puerto por defecto **3000** (cambiable con build arg o variable `PORT`).

**Construir:**

```bash
docker build -t wishes-app .
```

**Ejecutar:**

```bash
docker run -p 3000:3000 --env-file .env wishes-app
```

**En segundo plano:**

```bash
docker run -d -p 3000:3000 --env-file .env --name wishes-app wishes-app
```

Si ves `Error: Cannot find module '/app/wishes-app'`, pasaste el nombre de la imagen como comando. Usá solo `docker run -p 3000:3000 wishes-app`.

**Otro puerto (ej. 8080):**

```bash
docker build --build-arg PORT=8080 -t wishes-app .
docker run -p 8080:8080 -e PORT=8080 wishes-app
```

### 📁 Persistir los JSON de usuarios (volumen)
Dentro del contenedor los datos son efímeros. Montá un volumen para no perder listas al reconstruir:

```bash
mkdir -p ./data/locations/users
docker run -d -p 3000:3000 --env-file .env \
  -v "$(pwd)/data/locations/users:/app/data/locations/users" \
  --name wishes-app wishes-app
```

Windows (PowerShell):

```powershell
docker run -d -p 3000:3000 --env-file .env -v "${PWD}\data\locations\users:/app/data\locations\users" --name wishes-app wishes-app
```

**Primera vez / migración:** copiá tus JSON de respaldo a `./data/locations/users/` en el host antes de levantar el contenedor.

**Respaldo:** copiá `./data/locations/users/` en el servidor. Exportar/importar desde la app está planificado.

### 🚢 Publicar en Docker Hub
```bash
docker build -t TU_USUARIO/wishes-app:latest .
docker login
docker push TU_USUARIO/wishes-app:latest
```

En otra máquina:

```bash
docker run -p 3000:3000 --env-file .env TU_USUARIO/wishes-app:latest
```

## 🌐 Deploy en producción
`APP_BASE_URL` debe ser la URL pública **sin barra final** (ej. `https://tudominio.com` o `http://IP:3000`).

| Variable | Producción |
|----------|------------|
| `APP_BASE_URL` | URL que el usuario abre en el navegador |
| `AUTH0_*` | Mismo tenant; agregar callback/logout de producción en Auth0 |

**Auth0 (producción):**

- Allowed Callback URLs: `https://tudominio.com/auth/callback`
- Allowed Logout URLs: `https://tudominio.com`

Corré con `--env-file .env` y el volumen en `data/locations/users` si necesitás persistencia.

## 🛠️ Stack tecnológico
- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **leaflet** / **react-leaflet** · **@auth0/nextjs-auth0**
- **html2canvas** (imagen para compartir)
- **CSS** con tokens en `app/styles/` + import de Tailwind en `globals.css`
- **next/font** (Poppins)

## 📂 Estructura del proyecto
```
app/
  api/              # add-country, delete-country, locations, update-country, …
  styles/           # variables, components, responsive
  layout.tsx, page.tsx, globals.css
components/
  Map.tsx, HomeClient.tsx, …
  map/              # CountryListCard, modales, EmptyState, utils
hooks/              # useLocations, useCountryActions, …
lib/                # env, auth0, haptic, fonts, user-locations
data/locations/users/   # JSON privado por usuario (*.json en gitignore)
```

## 📚 Documentación relacionada
| Archivo | Idioma | Uso |
|---------|--------|-----|
| [README.md](./README.md) | Inglés | Este readme en inglés |
| [MANUAL_DE_USO.md](./MANUAL_DE_USO.md) | Español | Manual para usuarios |
| [MEDIUM.md](./MEDIUM.md) | Inglés | Notas del proyecto con Cursor |

## 🔧 Solución de problemas
| Problema | Revisar |
|----------|---------|
| Mapa en blanco | Red / CSP permitiendo tiles CARTO (`*.basemaps.cartocdn.com`) |
| Error de login | Dominio Auth0, client id/secret, URLs de callback/logout, largo de `AUTH0_SECRET` |
| No guarda cambios | Permisos de escritura en `data/locations/users/` (o volumen Docker) |
| 401 / sin sesión | Iniciar sesión con Auth0 |

## 👣 Próximos pasos (usuarios)
1. Configurá el entorno y Auth0
2. Iniciá sesión
3. Agregá países con **Add country** (o **Pick from map** para coordenadas)
4. Mové estados con **Move to** y completá notas en países visitados
5. Hacé backup copiando `data/locations/users/` (export desde la UI está planificado)

## 📄 Licencia
Proyecto personal — Agustina Fassina. Podés usar el código como referencia para tus propios proyectos.
