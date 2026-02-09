# Wishes App 🗺️
Este repositorio es personal, tiene los paises y los sueños por cumplir!

### Como funciona?
En public/locations hay un json que es la base de datos de este project, como es un project personal y de prueba no necesito usar una base de datos real (como una mongodb o una mysql por ejemplo).

### Implementations
- [x] Databases: json file (no recomendado si se va a usar para trabajar con datos realaes, ya que se puede perder).
- [x] GoogleMaps: use key credential (.env file in the root)
- [x] Country from checklist
- [x] Change status with the scroll
- [x] Export pdf button
- [x] Filter by country status
- [x] Order by a-z or z-a
- [x] Light / dark theme
- [x] Create, update and delete of countries.

### Web review💻
<img src="first-part.png" alt="First part of the web" width="500" height="450">
<img src="second-part.png" alt="Second part of the web" width="500" height="450">

### Environment Setup⚙️
1. Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

2. Open the `.env` file and replace `google_key_replace` with your actual Google Maps API key:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your_actual_google_maps_api_key_here"
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
### Test app ⌛
Open [http://localhost:3000](http://localhost:3000) with the browser to see the result.

### License
By Agustina Fassina
