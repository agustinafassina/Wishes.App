# Wishes App - Tu Lista de Viajes Personal

Una aplicacion web moderna y elegante para registrar, organizar y visualizar los paises que deseas visitar y los que ya has explorado. Crea tu propia lista de suenos de viajes interactiva con mapa visual.

## Que es Wishes App?

Wishes App es una aplicacion personal de bucket list que te permite:

- Registrar todos los paises que deseas visitar en tu vida
- Organizar tus destinos en tres categorias: Completados, En Revision y Pendientes
- Visualizar tu progreso en un mapa interactivo global
- Anadir fotos, notas y etiquetas a cada pais
- Exportar tu lista como PDF o JSON
- Acceder de forma segura con autenticacion Auth0

La aplicacion nacio como un proyecto personal para combinar la pasion por los viajes con la tecnologia. Es perfecta para sonanadores y aventureros que quieren seguir su progreso alrededor del mundo.

## Caracteristicas Principales

### Mapa Interactivo
- Visualiza todos tus destinos en un mapa mundial usando Google Maps
- Cada pais visitado aparece con un marcador y su bandera
- Haz clic en los marcadores para ver detalles rapidos
- Oculta el mapa para ahorrar espacio en pantalla (modo colapsable)

### Lista de Checklist con Drag & Drop
- Tres columnas: Completados, En Revision y Pendientes
- Arrastra paises entre columnas para cambiar su estado
- Los cambios se guardan automaticamente
- Ordena alfabeticamente (A-Z o Z-A) en cada columna

### Gestion Completa de Datos
- Anadir nuevos paises a tu lista (doble clic en una columna)
- Editar notas y detalles de cada pais
- Anadir multiples etiquetas (tags) por pais
- Eliminar paises que ya no te interesan
- Ver fotos y galeria de destinos

### Barra de Progreso
- Visualiza cuantos paises has visitado del total
- Ve tu avance de forma clara y motivadora
- Cuenta de destinos completados vs. pendientes

### Exportar y Hacer Backup
- Exporta tu lista completa como PDF
- Descarga todos tus datos como JSON o CSV
- Haz backup de tu informacion personal

### Tema Claro y Oscuro
- Alterna entre temas para mayor comodidad
- Perfecto para usar en cualquier hora del dia

### Autenticacion Segura
- Acceso protegido con Auth0
- Solo tu puedes ver y editar tu lista de viajes
- Inicia sesion de forma segura

## Estructura de Datos

La aplicacion usa un archivo JSON como base de datos. Cada pais en tu lista tiene los siguientes campos:

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| name | texto | Si | Nombre del pais (ej: Brasil, Italia) |
| code | texto | Si | Codigo ISO de 2 letras (ej: BR, IT) |
| latitude | numero | Si | Coordenada de latitud para el mapa |
| longitude | numero | Si | Coordenada de longitud para el mapa |
| status | texto | Si | Estado: "done" (completado), "in review" (en revision), "pending" (pendiente) |
| flag | enlace | No | URL de la bandera (se genera automaticamente si falta) |
| photos | lista | No | URLs de fotos de tu viaje |
| notes | texto | No | Tus notas personales del viaje |
| visitedAt | texto | No | Fecha o periodo de visita (ej: "Abril 2024", "2024") |
| tags | lista | No | Etiquetas personalizadas (ej: "playa", "montanas", "comida") |

Ejemplo de un pais completo:

```json
{
  "name": "Italia",
  "code": "IT",
  "latitude": 41.8719,
  "longitude": 12.5674,
  "flag": "https://flagcdn.com/w40/it.png",
  "photos": ["https://example.com/foto-roma.jpg"],
  "status": "done",
  "notes": "Increible viaje! Roma y Florencia me cautivaron.",
  "visitedAt": "Abril 2024",
  "tags": ["historia", "comida", "arte"]
}
```

## Requisitos del Sistema

- Node.js 18 o superior
- npm o yarn (gestor de paquetes)
- Una cuenta de Google para la API de Maps
- Una cuenta de Auth0 para autenticacion

## Configuracion Inicial

### 1. Clona el Repositorio

```bash
git clone https://github.com/tu-usuario/wishes-app.git
cd wishes-app
```

### 2. Instala las Dependencias

```bash
npm install
```

### 3. Configura las Variables de Entorno

Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

Edita `.env` y rellena los siguientes valores:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_clave_api_de_google_maps
AUTH0_DOMAIN=tu-dominio.us.auth0.com
AUTH0_CLIENT_ID=tu_client_id
AUTH0_CLIENT_SECRET=tu_client_secret
AUTH0_SECRET=cadena_aleatoria_larga_minimo_32_caracteres
APP_BASE_URL=http://localhost:3000
```

### Obtener las Claves de Google Maps

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google Maps
4. Crea una clave API REST
5. Copia la clave en `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### Configurar Auth0

1. Crea una cuenta en [auth0.com](https://auth0.com) (es gratis)
2. Crea una aplicacion de tipo "Regular Web Application"
3. En Settings, copia:
   - **Domain** a `AUTH0_DOMAIN`
   - **Client ID** a `AUTH0_CLIENT_ID`
   - **Client Secret** a `AUTH0_CLIENT_SECRET`
4. En Application URIs, configura:
   - **Allowed Callback URLs:** `http://localhost:3000/auth/callback`
   - **Allowed Logout URLs:** `http://localhost:3000`
5. Para `AUTH0_SECRET`, genera una cadena aleatoria:
   ```bash
   openssl rand -hex 32
   ```
6. Deja `APP_BASE_URL` en `http://localhost:3000` para desarrollo

### 4. Inicia el Servidor de Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Como Usar la Aplicacion

### Agregar un Pais

1. Haz doble clic en cualquier columna (Completados, En Revision o Pendientes)
2. Rellena el formulario con el nombre del pais y otros detalles
3. Haz clic en "Guardar"
4. El pais aparecera en la columna elegida

### Cambiar Estado de un Pais

1. Arrastra un pais de una columna a otra
2. El cambio se guarda automaticamente
3. El mapa se actualiza en tiempo real

### Editar Notas de un Viaje

1. Haz clic en un pais para ver sus detalles
2. Haz clic en "Editar notas"
3. Anadie tus impresiones, fotos y etiquetas
4. Guarda los cambios

### Exportar tu Lista

1. Haz clic en el boton "Exportar" en la esquina superior
2. Elige entre PDF, JSON o CSV
3. Tu archivo se descargara a tu computadora

### Ordenar Paises

1. Usa los botones de ordenamiento A-Z o Z-A
2. Los paises se ordenan alfabeticamente en cada columna

### Cambiar Tema

1. Haz clic en el icono del sol/luna en la esquina superior derecha
2. La interfaz cambia entre tema claro y oscuro

## Stack Tecnologico

La aplicacion esta construida con tecnologias modernas:

- **Next.js 16** - Framework React para aplicaciones web
- **React 19** - Libreria de interfaz de usuario
- **TypeScript** - Lenguaje tipado para JavaScript
- **Tailwind CSS** - Framework CSS para estilos
- **Google Maps API** - Mapa interactivo mundial
- **dnd-kit** - Libreria para drag and drop
- **Auth0** - Autenticacion y seguridad
- **jsPDF y html2canvas** - Exportacion a PDF
- **Leaflet y react-leaflet** - Mapas alternativos

## Funcionalidades Completadas

- Mapas interactivos con Google Maps
- Sistema de drag and drop para cambiar estados
- Filtrado por estado de pais
- Ordenamiento alfabetico
- Tema claro y oscuro
- Creacion, edicion y eliminacion de paises
- Multiples etiquetas por pais
- Exportacion a PDF
- Backup y exportacion de datos (JSON/CSV)
- Autenticacion con Auth0
- Mapa colapsable

## Funcionalidades Futuras

Estas caracteristicas estan planeadas para proximas versiones:

- Busqueda y filtrado por nombre de pais
- Atajos de teclado (Escape, Enter)
- Galeria de fotos por pais
- Agrupamiento por continente
- Meta anual de paises a visitar
- Rating de paises visitados (estrellas)
- Animaciones suaves en las acciones
- Soporte multiidioma (Ingles/Espanol)
- Acciones en lote (seleccionar varios paises)
- Clustering de marcadores en el mapa

## Estructura del Proyecto

```
wishes-app/
├── app/
│   ├── api/                    # Rutas API del servidor
│   │   ├── add-country/       # Agregar pais
│   │   ├── delete-country/    # Eliminar pais
│   │   ├── edit-country/      # Editar pais
│   │   ├── update-country/    # Actualizar estado
│   │   └── update-country-notes/  # Actualizar notas
│   ├── layout.tsx             # Layout principal
│   ├── page.tsx               # Pagina de inicio
│   └── globals.css            # Estilos globales
├── components/                # Componentes React
│   ├── Map.tsx               # Mapa interactivo
│   ├── ConfirmModal.tsx       # Modal de confirmacion
│   ├── ThemeToggle.tsx        # Cambio de tema
│   ├── ToastContext.tsx       # Notificaciones
│   ├── Auth0ProviderWrapper.tsx  # Proveedor Auth0
│   └── BackgroundMosaic.tsx   # Fondo visual
├── lib/
│   └── auth0.ts              # Configuracion de Auth0
├── public/
│   ├── images/               # Imagenes del proyecto
│   └── locations/
│       └── web_locations.json  # Base de datos
├── package.json              # Dependencias del proyecto
├── tsconfig.json             # Configuracion de TypeScript
├── next.config.ts            # Configuracion de Next.js
└── tailwind.config.ts        # Configuracion de Tailwind
```

## Solucionar Problemas

### El mapa no aparece
- Verifica que `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` este configurada correctamente en `.env`
- Comprueba que la API de Google Maps este habilitada en Google Cloud Console

### La autenticacion no funciona
- Verifica que `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID` y `AUTH0_CLIENT_SECRET` sean correctos
- Comprueba las URLs de callback y logout en Auth0
- Asegurat de que `AUTH0_SECRET` sea una cadena larga (minimo 32 caracteres)

### Los cambios no se guardan
- Asegurat de que tienes permiso de escritura en `public/locations/web_locations.json`
- Verifica que la API este respondiendo correctamente (abre la consola del navegador)

### Estilos rotos o tema no cambia
- Asegurat de que Tailwind CSS este compilado correctamente
- Ejecuta `npm run dev` nuevamente y recarga la pagina

## Mejoras de Rendimiento

- Los cambios se guardan automaticamente sin recargar la pagina
- El mapa se carga de forma asincrona para no bloquear la interfaz
- Los estilos se optimizan con Tailwind CSS
- La autenticacion se cachea para sesiones mas rapidas

## Privacidad y Seguridad

- Tu lista de paises es personal y privada
- Requiere autenticacion con Auth0 para acceder
- Los datos se almacenan de forma segura en el servidor
- Puedes hacer backup de tu informacion en cualquier momento

## Proximos Pasos para los Usuarios

1. Configura tu ambiente de desarrollo siguiendo las instrucciones arriba
2. Inicia sesion con tu cuenta de Auth0
3. Empieza a anadir los paises que suenas visitar
4. Arrastra paises entre columnas a medida que los visites
5. Anade fotos, notas y etiquetas a cada destino
6. Comparte tu progreso exportando tu lista
7. Disfruta de tu viaje alrededor del mundo!

## Licencia

Este proyecto es de uso personal. Siente libre de usar el codigo como referencia para tus propios proyectos.

## Contacto y Feedback

Si tienes preguntas, sugerencias o encuentras bugs:

- Abre un issue en el repositorio
- Contacta al autor a traves de email
- Comparte tus experiencias y mejoras

---

Construido con pasion por los viajes y la tecnologia. Que comience la aventura!

Happy travels! :)
