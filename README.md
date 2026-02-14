# Wishes App 🗺️
Este repositorio es personal, tiene los paises y los sueños por cumplir!

### Como funciona?
En `public/locations` hay un JSON que es la base de datos de este proyecto; al ser personal y de prueba no usa una base de datos real (MongoDB, MySQL, etc.).

#### Estructura del JSON (`public/locations/web_locations.json`)

El archivo es un **array de objetos**, uno por país. Cada objeto puede tener:

| Campo      | Tipo           | Requerido | Descripción |
|-----------|----------------|-----------|-------------|
| `name`    | string         | Sí        | Nombre del país (ej. `"Brasil"`, `"Escocia"`). |
| `code`    | string         | Sí        | Código ISO de 2 letras (ej. `"BR"`, `"GB"`). Puede repetirse si hay varias entradas para el mismo código (ej. Inglaterra y Escocia ambos `"GB"`). |
| `latitude`  | number       | Sí        | Latitud para el marcador en el mapa. |
| `longitude` | number       | Sí        | Longitud para el marcador en el mapa. |
| `status`  | string         | Sí        | Estado en la lista: `"done"`, `"in review"` o `"pending"`. |
| `flag`    | string         | No        | URL de la bandera (si no se pone, se puede generar por código con flagcdn.com). |
| `photos`  | string[]       | No        | Array de URLs de fotos. |
| `notes`   | string         | No        | Notas del viaje (suele usarse cuando `status` es `"done"`). |
| `visitedAt` | string       | No        | Fecha o período de visita (ej. `"2024"`, `"Abril 2024"`, `"2024-06"`). |
| `tags`    | string[]       | No        | Varias etiquetas (ej. `["color", "food", "mountains"]`). |
| `tag`     | string         | No        | **Legacy:** un solo tag; si existe `tags`, se ignora. |

Ejemplo de objeto completo:

```json
{
    "name": "Italia",
    "code": "IT",
    "latitude": 41.8719,
    "longitude": 12.5674,
    "flag": "https://flagcdn.com/w40/it.png",
    "photos": ["https://example.com/italy-photo1.jpg"],
    "status": "done",
    "notes": "Viaje increíble.",
    "visitedAt": "Abril 2024",
    "tags": ["comida", "historia"]
}
```

### Implementations
- [x] Databases: json file (no recomendado si se va a usar para trabajar con datos realaes, ya que se puede perder).
- [x] GoogleMaps: use key credential (.env file in the root)
- [x] Country from checklist
- [x] Change status with the scroll
- [x] Export pdf button
- [x] Filter by country status
- [x] Order by a-z or z-a
- [x] Light / dark theme
- [x] Create, update and delete of countries
- [x] Multitag by country
- [x] Hide / show map (collapse map to save space)
- [x] **Backup / export data** — Export full list as JSON or CSV (Import to restore: planned).
- [x] **Auth0** — Login / logout; app requires an authenticated user to use the bucket list.

### Web review💻
<img src="first-part.png" alt="First part of the web" width="500" height="450">
<img src="second-part.png" alt="Second part of the web" width="500" height="450">

### Environment Setup⚙️

1. Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

2. Fill in the variables in `.env`:

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | API key de Google Maps (para el mapa). |
| `AUTH0_DOMAIN` | Tu tenant de Auth0 (ej. `mi-app.us.auth0.com`). |
| `AUTH0_CLIENT_ID` | Client ID de la aplicación en Auth0. |
| `AUTH0_CLIENT_SECRET` | Client Secret de la aplicación en Auth0. |
| `AUTH0_SECRET` | Una cadena aleatoria larga (≥ 32 caracteres) para firmar cookies de sesión. |
| `APP_BASE_URL` | URL base de la app (desarrollo: `http://localhost:3000`). |

**Google Maps:** reemplazá `google_key_replace` por tu API key real.

**Auth0:** para obtener las variables de Auth0:

1. Creá una cuenta en [auth0.com](https://auth0.com) y creá un **Application** tipo **Regular Web Application**.
2. En **Settings** de la aplicación copiá **Domain**, **Client ID** y **Client Secret** a `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID` y `AUTH0_CLIENT_SECRET`.
3. En **Application URIs** configurá:
   - **Allowed Callback URLs:** `http://localhost:3000/auth/callback` (y la URL de producción cuando la tengas).
   - **Allowed Logout URLs:** `http://localhost:3000` (y la de producción).
4. Para `AUTH0_SECRET` generá una cadena aleatoria segura (por ejemplo con `openssl rand -hex 32`).
5. Dejá `APP_BASE_URL` en `http://localhost:3000` para desarrollo.

Ejemplo de `.env` (con valores de ejemplo):
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="tu_google_maps_key"
AUTH0_DOMAIN="tu-tenant.us.auth0.com"
AUTH0_CLIENT_ID="tu_client_id"
AUTH0_CLIENT_SECRET="tu_client_secret"
AUTH0_SECRET="una_cadena_aleatoria_larga_de_al_menos_32_caracteres"
APP_BASE_URL="http://localhost:3000"
```

### Install dependencies📝
```bash
npm install
```

### Run project🚀
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

### Docker 🐳
El puerto es configurable (default **3000**). Podés definirlo al construir la imagen o al ejecutar el contenedor.

**Construir la imagen** (puerto por defecto 3000):
```bash
docker build -t wishes-app .
```

**Construir para otro puerto** (ej. 8080):
```bash
docker build --build-arg PORT=8080 -t wishes-app .
```

**Ejecutar** (puerto 3000). Solo el nombre de la imagen al final; no agregues otro argumento:
```bash
docker run -p 3000:3000 wishes-app
```

**Ejecutar en otro puerto** (ej. 8080), sin rebuild:
```bash
docker run -p 8080:8080 -e PORT=8080 wishes-app
```

Si ves `Error: Cannot find module '/app/wishes-app'`, es porque se pasó el nombre de la imagen como comando. Usá solo `docker run -p 3000:3000 wishes-app`.

Ejecutar con variables de entorno desde un archivo `.env`:
```bash
docker run -p 3000:3000 --env-file .env wishes-app
```

Ejecutar en segundo plano (detached):
```bash
docker run -d -p 3000:3000 --name wishes-app wishes-app
```

#### Publicar en Docker Hub

Reemplazá `TU_USUARIO` por tu usuario de Docker Hub.

1. **Build** de la imagen con el nombre que tendrá en Docker Hub:
```bash
docker build -t TU_USUARIO/wishes-app:latest .
```

2. **Login** en Docker Hub (te pide usuario y contraseña):
```bash
docker login
```

3. **Push** de la imagen:
```bash
docker push TU_USUARIO/wishes-app:latest
```

Opcional: etiquetar también una versión (ej. `v1.0.0`) y pushearla:
```bash
docker tag TU_USUARIO/wishes-app:latest TU_USUARIO/wishes-app:v1.0.0
docker push TU_USUARIO/wishes-app:v1.0.0
```

Para correr la imagen desde Docker Hub en otra máquina (reemplazá el puerto si usás otro):
```bash
docker run -p 3000:3000 --env-file .env TU_USUARIO/wishes-app:latest
```

### Deploy en otro environment (producción) 🌐

En el servidor donde vas a correr el Docker, creá un archivo `.env` con las mismas variables pero apuntando al **host público** de ese environment.

**Ejemplo de `.env` para producción** (reemplazá con tu host real, ej. `https://tudominio.com` o `http://179.43.1.99:3000`):

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="tu_google_maps_key"
AUTH0_DOMAIN="dev-fzmzwj3owyilh2cw.us.auth0.com"
AUTH0_CLIENT_ID="tu_client_id"
AUTH0_CLIENT_SECRET="tu_client_secret"
AUTH0_SECRET="una_cadena_aleatoria_larga_de_al_menos_32_caracteres"
APP_BASE_URL="https://tudominio.com"
```

**Importante:**

| Variable | En producción |
|----------|----------------|
| `APP_BASE_URL` | **URL pública** por la que se accede a la app: `https://tudominio.com` o `http://IP:3000`. Debe ser la URL que el usuario ve en el navegador (sin barra final). Si usás IP: `http://192.43.1.00:3000`. |
| `AUTH0_*` | Mismos valores que en desarrollo (mismo tenant de Auth0). |

**En el dashboard de Auth0** tenés que agregar las URLs de producción en la aplicación:

- **Allowed Callback URLs:**  
  `https://tudominio.com/auth/callback` (o `http://IP:3000/auth/callback` si usás IP).
- **Allowed Logout URLs:**  
  `https://tudominio.com` (o `http://IP:3000`).

Si usás **HTTPS** con dominio, `APP_BASE_URL` debe ser `https://...`. Si accedés por IP y puerto, `http://192.43.1.00:3000` (revisá que la IP sea correcta, sin `001` en el tercer octeto: suele ser `192.43.1.00`).

### Pull and docker build
```

```

### Test app ⌛
Open [http://localhost:3000](http://localhost:3000) with the browser to see the result.

### License
By Agustina Fassina
