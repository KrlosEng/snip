# Snip — acortador de URLs con analíticas

Convierte enlaces largos en enlaces cortos (`snip.to/launch-v2`), genera su código QR y registra cada clic: cuándo, desde qué país y ciudad, en qué dispositivo y navegador, y de qué sitio vino la visita.

**Demo en vivo:** https://snip-acortador.vercel.app — pulsa **Entrar como demo** para ver un panel con miles de clics de ejemplo.

## Probarlo en un minuto

```bash
npm install
npm run dev
```

Abre http://localhost:3000 y pulsa **Entrar como demo**: una cuenta con 7 enlaces y miles de clics de ejemplo (se rellenan solos hasta el momento actual cada vez que entras).

Requiere **Node 22.5+**. Sin `DATABASE_URL` usa SQLite embebido (`node:sqlite`), así que corre sin configurar nada; con `DATABASE_URL` usa PostgreSQL (Neon), como en producción.

## Qué incluye

| Pantalla | Ruta |
|---|---|
| Landing con acortador sin cuenta (vence en 7 días), resultado con copiar y QR | `/` |
| Login / registro (correo, Google, GitHub o Apple, y demo) | `/login`, `/register` |
| Código de 6 dígitos por correo al entrar desde un dispositivo nuevo | `/login/verify` |
| Panel: 4 KPIs, gráfico de 30 días, últimos enlaces, estado vacío | `/dashboard` |
| Mis enlaces: búsqueda, filtro por estado, orden, paginación, copiar, editar, pausar, borrar con deshacer | `/links` |
| Crear / editar enlace (modal, atajo `C`) con alias y vencimiento | — |
| Detalle: rango 7/30/90 días, gráfico por día, países, dispositivos, navegadores, referidos, últimos clics, QR PNG/SVG, exportar CSV | `/links/[id]` |
| Configuración: perfil, tema, zona horaria, borrar cuenta (pide contraseña o código) | `/settings` |
| Enlace no disponible (404 / 410 reales) | `/[slug]` |

## API

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/[slug]` | Redirige (302) y registra el clic; 404 o 410 si no se puede |
| POST | `/api/links` | Crea un enlace (`url`, `alias?`, `expiresAt?`) |
| GET | `/api/links?q=&sort=&status=&page=` | Lista los enlaces del usuario |
| GET / PATCH / DELETE | `/api/links/:id` | Leer, editar (destino, alias, vencimiento, estado) o borrar |
| GET | `/api/links/:id/stats?range=7d` | Clics por día, países, dispositivos, navegadores, referidos |
| GET | `/api/links/:id/clicks?page=` | Últimos clics paginados |
| GET | `/api/links/:id/qr?format=svg\|png` | Código QR |
| GET | `/api/links/:id/export` | CSV de clics |
| GET | `/api/dashboard` | KPIs y serie de 30 días |

## Estructura del proyecto

Es una sola app de **Next.js (App Router)**: el frontend, la API y la redirección de los enlaces cortos viven en el mismo proyecto. Todo el código está en `src/`, dividido en tres carpetas con responsabilidades claras:

| Carpeta | Qué contiene | Dónde corre |
|---|---|---|
| `src/app/` | Las **rutas**: páginas, endpoints de la API y la redirección `/[slug]` | Servidor (y cliente en las vistas) |
| `src/components/` | **Piezas de interfaz** reutilizables (botones, gráficos, QR, animaciones) | Navegador |
| `src/lib/` | La **lógica**: base de datos, sesiones, enlaces, analíticas, correo, OAuth | Solo servidor |

```text
snip/
├── src/
│   ├── app/                          ← Rutas (cada carpeta es una URL)
│   │   ├── layout.tsx                ← Plantilla raíz: fuentes, tema claro/oscuro, avisos
│   │   ├── globals.css               ← Colores (OKLCH), tipografía y motivos de marca
│   │   ├── page.tsx                  ← Landing "/" con el acortador sin cuenta
│   │   ├── login/ · register/        ← Inicio de sesión y registro
│   │   │   └── verify/               ← Pantalla del código de 6 dígitos
│   │   ├── privacy/                  ← Página de privacidad
│   │   ├── not-found.tsx             ← 404 de la app
│   │   │
│   │   ├── (app)/                    ← Zona privada (exige sesión); el paréntesis no aparece en la URL
│   │   │   ├── layout.tsx            ← Comprueba la sesión y dibuja el menú lateral
│   │   │   ├── dashboard/            ← "/dashboard": KPIs, gráfico de 30 días, últimos enlaces
│   │   │   ├── links/                ← "/links": lista con búsqueda, filtros y paginación
│   │   │   │   └── [id]/             ← "/links/123": detalle y analíticas de un enlace
│   │   │   └── settings/             ← "/settings": perfil, tema, borrar cuenta
│   │   │
│   │   ├── [slug]/                   ← "/launch-v2": la redirección (el corazón del producto)
│   │   │   ├── route.ts              ← Caché → base de datos → 302 → registra el clic
│   │   │   └── unavailable.ts        ← Página HTML de enlace vencido (410) o inexistente (404)
│   │   │
│   │   └── api/                      ← API REST (responde JSON)
│   │       ├── auth/                 ← login, register, logout, demo, verify, [provider] (OAuth)
│   │       ├── links/                ← CRUD de enlaces + [id]/stats, clicks, qr, export
│   │       ├── dashboard/            ← KPIs del panel
│   │       └── me/                   ← Perfil del usuario y borrado de cuenta
│   │
│   ├── components/                   ← Interfaz reutilizable ("use client")
│   │   ├── ui.tsx                    ← Botón, campo, switch, insignia de estado, logo
│   │   ├── motion.tsx                ← Animaciones: entrada escalonada, contador, botón copiar
│   │   ├── app-shell.tsx             ← Menú lateral, barra superior y navegación móvil
│   │   ├── shortener.tsx             ← Barra para acortar de la landing
│   │   ├── snip-strip.tsx            ← Animación del enlace que se corta (hero)
│   │   ├── snip-ticket.tsx           ← Resultado tipo boleto con el QR
│   │   ├── link-modal.tsx            ← Ventana para crear y editar enlaces (atajo C)
│   │   ├── charts.tsx                ← Gráfico de clics, dona y barras (Recharts)
│   │   ├── qr.tsx                    ← Vista previa y descarga del QR
│   │   ├── auth-form.tsx · otp-form.tsx ← Formularios de acceso y del código
│   │   └── …                         ← Avisos (providers), feed de ejemplo, tema, etc.
│   │
│   └── lib/                          ← Lógica de servidor ("server-only")
│       ├── db.ts                     ← Conexión y esquema: Postgres (Neon) o SQLite local
│       ├── auth.ts                   ← Sesiones con cookie y usuario actual
│       ├── verify.ts                 ← Dispositivos de confianza y códigos por correo
│       ├── oauth.ts                  ← Google, GitHub y Apple
│       ├── mailer.ts                 ← Envío de correos (Resend o SMTP/Gmail)
│       ├── links.ts                  ← Crear, listar, editar y borrar enlaces
│       ├── clicks.ts                 ← Registro de clics, detección de bots y estadísticas
│       ├── cache.ts                  ← Caché de slugs y límite de uso (Redis o memoria)
│       ├── validation.ts             ← Reglas de URLs y alias (Zod)
│       ├── ids.ts                    ← Slugs base62, hashes y contraseñas (scrypt)
│       ├── seed.ts                   ← Datos de la cuenta demo
│       ├── http.ts · format.ts       ← Utilidades de respuestas, números y fechas
│
├── scripts/                          ← Asistentes para configurar Gmail y OAuth en Vercel
├── .env.example                      ← Variables de entorno disponibles (todas opcionales)
└── next.config.ts · tsconfig.json · eslint.config.mjs · package.json
```

### Convenciones de Next.js que conviene conocer

- **Una carpeta = una URL.** `src/app/links/page.tsx` es la página `/links`.
- **`page.tsx`** es una página; **`route.ts`** es un endpoint de la API (exporta `GET`, `POST`, `PATCH`, `DELETE`); **`layout.tsx`** envuelve a todas las páginas de su carpeta.
- **`[id]` y `[slug]`** son partes variables de la URL: `/links/abc123` llega con `id = "abc123"`.
- **`(app)`** es un grupo: agrupa rutas que comparten el mismo layout sin cambiar la URL.

### Patrón `page.tsx` + `view.tsx`

Cada pantalla privada está partida en dos archivos:

- **`page.tsx`** (servidor): comprueba la sesión, consulta la base de datos y pasa los datos ya listos.
- **`view.tsx`** (cliente, `"use client"`): dibuja la interfaz, maneja clics, animaciones y llamadas a la API.

Así las consultas nunca llegan al navegador y la página carga con los datos ya puestos.

### Cómo viaja un clic

```text
Visitante abre snip-acortador.vercel.app/launch-v2
        │
        ▼
src/app/[slug]/route.ts
        │  1. Busca el slug en la caché (lib/cache.ts)
        │  2. Si no está, lo busca en Postgres (lib/db.ts) y lo guarda en caché
        │  3. ¿Vencido o pausado? → página 410 (unavailable.ts)
        │  4. Responde 302 al destino de inmediato
        ▼
after(): ya con el visitante en camino
        │  lib/clicks.ts → país y ciudad (cabeceras de Vercel), dispositivo y navegador
        │  (ua-parser-js), dominio de origen, hash de la IP y marca de bot
        ▼
Tabla clicks  →  la leen /api/links/[id]/stats y el panel
```

### ¿Dónde cambio…?

| Si quieres cambiar… | Ve a |
|---|---|
| Colores, tipografía o el tema oscuro | `src/app/globals.css` |
| Textos de la landing | `src/app/page.tsx` |
| Una pantalla del panel | `src/app/(app)/<pantalla>/view.tsx` |
| Qué alias están prohibidos o cómo se valida una URL | `src/lib/validation.ts` |
| Cómo se cuentan los clics o qué es un bot | `src/lib/clicks.ts` |
| Las tablas de la base de datos | `src/lib/db.ts` |
| El correo con el código | `src/lib/mailer.ts` |
| La recuperación de contraseña | `src/lib/password-reset.ts` |
| Carpetas, etiquetas y filtros | `src/lib/links.ts` (`listLinks`, `listFacets`, `setTags`) |
| El generador UTM | `src/lib/utm.ts` y el formulario en `src/components/link-modal.tsx` |
| Importar y exportar enlaces en CSV | `src/lib/links-import.ts`, `src/lib/csv.ts`, `src/app/api/links/{import,export}` |
| Contraseña, inicio programado y límite de clics | `src/lib/access.ts` y `src/app/[slug]/route.ts` |
| La API pública y sus claves | `src/app/api/v1/**`, `src/lib/api-v1.ts`, `src/lib/api-keys.ts` (documentación en `/docs/api`) |
| Las reglas de uso aceptable | `src/app/uso-aceptable/page.tsx` |
| Los datos de la cuenta demo | `src/lib/seed.ts` |

## Pruebas y CI

```bash
npm test          # Vitest: validación, anti-SSRF, contraseñas, límites de uso, permisos, recuperación de contraseña
npm run typecheck # tipos de TypeScript
npm run lint      # ESLint
```

Las pruebas usan una base SQLite temporal y vacía por archivo: nunca tocan la base de producción, aunque `.env.local` tenga `DATABASE_URL`. GitHub Actions (`.github/workflows/ci.yml`) corre las tres en cada push a `main` y en cada pull request.

## Migraciones de la base de datos

El esquema vive en `MIGRATIONS` dentro de `src/lib/db.ts`. Al arrancar, la app aplica las que falten y las anota en la tabla `schema_migrations`.

- Para cambiar el esquema, agrega una migración nueva al final con el siguiente número de versión.
- Nunca edites una migración que ya corrió en producción.
- Escríbelas idempotentes (`IF NOT EXISTS`): en Vercel pueden arrancar varias instancias a la vez.
- Escribe SQL de Postgres; para SQLite se traduce solo (`toSqlite`).

## Respaldos

La base de producción está en Neon, que guarda el historial de cambios y permite volver a un momento anterior (point-in-time restore) dentro de la ventana de retención del plan.

- **Restaurar**: Neon → proyecto → Branches → Restore, eligiendo fecha y hora. Conviene restaurar primero en una rama nueva, revisar los datos y después cambiar `DATABASE_URL`.
- **Copia manual** antes de un cambio grande: `pg_dump "$DATABASE_URL" -Fc -f snip-AAAA-MM-DD.dump`. Guárdala fuera del repositorio: contiene correos de usuarios.
- **Volver a cargar una copia**: `pg_restore -d "$DATABASE_URL_NUEVA" --no-owner snip-AAAA-MM-DD.dump`.

## Decisiones técnicas

- **302 y no 301**: con 301 el navegador guarda la redirección y las siguientes visitas ya no pasan por Snip, así que no se contarían.
- **Redirección sin esperar a la analítica**: se responde el 302 de inmediato y el clic se guarda después con `after()` de Next.js.
- **Caché del slug**: Upstash Redis si hay credenciales, mapa en memoria si no. Se invalida al editar, pausar o borrar.
- **Privacidad**: la IP nunca se guarda; solo un hash con sal para contar visitantes únicos.
- **Bots**: WhatsApp, Slack, X, rastreadores y `curl` se marcan con `is_bot` y no cuentan en las métricas.
- **Seguridad**: solo `http`/`https`, no se acortan enlaces del propio dominio (bucles), lista de alias reservados, Safe Browsing opcional, límite de 10 enlaces/hora sin cuenta y 100 con cuenta, cada consulta filtra por `user_id`, CSV protegido contra inyección de fórmulas.
- **Base de datos con dos motores**: el mismo SQL corre en PostgreSQL (Neon, producción) y en SQLite (local, sin configurar nada). Ver `src/lib/db.ts`.
- **Recuperar contraseña**: enlace de un solo uso que vence en 30 minutos; solo se guarda el hash del token, la respuesta es igual exista o no la cuenta, y al cambiarla se cierran todas las sesiones.
- **Dispositivos de confianza**: al entrar desde un navegador nuevo se envía un código de 6 dígitos al correo (10 minutos, 5 intentos, guardado como hash). En producción solo se exige si hay un servicio de correo configurado, para no dejar a nadie fuera.
- **OAuth sin librerías de auth**: Google y GitHub con OAuth 2.0; Apple con `form_post`, secreto firmado ES256 y verificación del `id_token` contra sus llaves públicas (`jose`). Si el correo ya existe y está verificado, se vincula a la cuenta.

## Stack

Next.js 16 (App Router) + TypeScript · Tailwind CSS 4 · Motion (animaciones) · Recharts · Zod · ua-parser-js · qrcode · Neon Postgres · node:sqlite · jose · nodemailer · Vercel.

Variables de entorno opcionales en `.env.example`. Para configurar el correo y los proveedores sin pegar secretos en pantalla: `node scripts/setup-gmail.mjs` y `node scripts/setup-oauth.mjs google|github`.
