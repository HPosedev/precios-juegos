# 🎮 KeyRadar ES - Rastreador de Precios de Claves de Videojuegos

Aplicación web full-stack de alto rendimiento para rastrear y comparar precios de **claves digitales de videojuegos en Euros (€)** para la región de **España** (incluyendo claves compatibles de **Europa** y **Global / Worldwide**).

Desarrollada con la arquitectura más eficiente y rápida disponible: **Bun + TypeScript + SQLite nativo (`bun:sqlite`) + React 19 + Vite + Tailwind CSS v4**.

---

## 🚀 Características Principales

1. **Buscador Inteligente de Juegos:**
   - Búsqueda en tiempo real con autocompletado y carátulas oficiales en alta resolución.
   - Detección automática de IDs oficiales de Steam y precios de referencia.

2. **Rastreo de Precios en Euros (€):**
   - Agregación paralela y en tiempo real a través de los principales portales y marketplaces de claves:
     - **Instant Gaming**
     - **Kinguin** (con filtrado multi-vendedor)
     - **Tienda Oficial Steam** (precios oficiales de referencia en España)
     - **Red Oficial Autorizada** (Fanatical, GreenManGaming, GOG.com, Humble Store, Gamesplanet, GameBillet, WinGameStore, etc.)
     - **Accesos directos con 1 clic** a búsquedas específicas en **Eneba**, **G2A**, **CDKeys** y **Gamivo**.

3. **Lista Principal con el Mejor Precio:**
   - Muestra cada juego seguido con su carátula, el **precio más bajo actual** en Euros (€), la **tienda a la que pertenece** con insignia coloreada, y el tipo de clave.

4. **Sidebar Izquierdo con Comparativa Completa Ordenada:**
   - Al seleccionar cualquier juego de la lista, se abre automáticamente un **panel/sidebar lateral izquierdo**.
   - Muestra **todos los precios de todas las páginas ordenados estrictamente de menor a mayor**.
   - Destaca el **#1 Mejor Precio** con cálculo de ahorro respecto al precio oficial de Steam.
   - Enlaces directos para comprar la clave en la tienda correspondiente.

5. **Filtro Estricto de Región (España / Europa / Global):**
   - Válidas exclusivamente claves con activación permitida en España:
     - 🇪🇸 **España**
     - 🇪🇺 **Europa (EU / EMEA)**
     - 🌐 **Global (Worldwide / RoW)**
   - Se descartan de forma estricta claves bloqueadas geográficamente (US/América del Norte, LATAM, Asia, Rusia/CIS).

6. **🛡️ Filtro de Seguridad Anti-Cuentas de Steam (Solo Claves):**
   - *Protección especial solicitada:* La aplicación detecta y elimina automáticamente ofertas de venta de **cuentas compartidas de Steam**, perfiles, acceso offline o cuentas familiares.
   - **Solo se admiten y muestran claves de activación digital legítimas** (Steam Key, GOG Key, Epic Key, etc.).

7. **Persistencia Total (SQLite):**
   - La lista de juegos seguidos se almacena localmente en SQLite (`games.db`).
   - Sobrevive a reinicios del servidor y recargas del navegador.
   - Opción para eliminar cualquier juego de la lista con confirmación.
   - Botón para refrescar precios individualmente o actualizar toda la lista.

---

## 🛠️ Tecnologías Utilizadas

- **Runtime & Backend:** [Bun](https://bun.sh/) (ultra rápido, inicio instantáneo en milisegundos).
- **Base de Datos:** SQLite nativo a través de `bun:sqlite` (sin dependencias pesadas ni servidores externos).
- **Frontend:** React 19 + TypeScript + Vite 8.
- **Estilos:** Tailwind CSS v4 con paleta moderna oscura para gamers.
- **Iconos:** Lucide React.

---

## 📦 Instalación y Uso

### 1. Iniciar la aplicación (Modo Producción / Autónomo)

Para iniciar la aplicación completa (servidor API + frontend estático compilado) en un solo comando:

```bash
bun start
```

Se abrirá automáticamente en **Firefox** en:
👉 **[http://localhost:3001](http://localhost:3001)**

---

### 2. Modo Desarrollo (Hot Reloading Frontend + Backend)

Si deseas modificar código con recarga en caliente en vivo:

```bash
bun run dev
```

Esto iniciará concurrentemente:
- Servidor API en `http://localhost:3001` con `--watch`
- Servidor Vite en `http://localhost:3000` con proxy automático a la API
- Apertura automática de **Firefox** en `http://localhost:3000` (con protección anti-duplicados al recargar con `--watch`)

---

### 3. Compilar el cliente nuevamente

```bash
bun run build
```

---

## 🗄️ Estructura del Proyecto

```
precios-juegos/
├── server/
│   ├── index.ts               # Servidor HTTP Bun con rutas API y fallback SPA
│   ├── db.ts                  # Capa de persistencia SQLite (bun:sqlite)
│   ├── types.ts               # Tipos TypeScript compartidos
│   └── services/
│       ├── instantGaming.ts   # Integración y scraping con Instant Gaming
│       ├── kinguin.ts         # Integración con API Kinguin y filtros anti-cuentas
│       ├── steam.ts           # API oficial de Steam Store España
│       ├── cheapshark.ts      # Red autorizada (Fanatical, GMG, GOG, Humble...)
│       └── aggregator.ts      # Orquestador, filtrado de regiones y ordenación
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx    # Sidebar izquierdo con comparativa de menor a mayor
│   │   │   ├── GameCard.tsx   # Ficha de juego en la lista con precio más bajo y tienda
│   │   │   ├── SearchBar.tsx  # Buscador con sugerencias en tiempo real
│   │   │   └── Header.tsx     # Cabecera con estadísticas y refresco global
│   │   ├── App.tsx            # Componente principal y lógica de estado
│   │   ├── index.css          # Estilos y configuración Tailwind CSS v4
│   │   └── types.ts           # Tipos TypeScript del cliente
│   ├── vite.config.ts         # Configuración de Vite y proxy API
│   └── package.json           # Dependencias del cliente
├── games.db                   # Base de datos SQLite local persistente
├── package.json               # Scripts de ejecución raíz
└── README.md                  # Documentación
```
