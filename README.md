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

## Decisiones técnicas

- **302 y no 301**: con 301 el navegador guarda la redirección y las siguientes visitas ya no pasan por Snip, así que no se contarían.
- **Redirección sin esperar a la analítica**: se responde el 302 de inmediato y el clic se guarda después con `after()` de Next.js.
- **Caché del slug**: Upstash Redis si hay credenciales, mapa en memoria si no. Se invalida al editar, pausar o borrar.
- **Privacidad**: la IP nunca se guarda; solo un hash con sal para contar visitantes únicos.
- **Bots**: WhatsApp, Slack, X, rastreadores y `curl` se marcan con `is_bot` y no cuentan en las métricas.
- **Seguridad**: solo `http`/`https`, no se acortan enlaces del propio dominio (bucles), lista de alias reservados, Safe Browsing opcional, límite de 10 enlaces/hora sin cuenta y 100 con cuenta, cada consulta filtra por `user_id`, CSV protegido contra inyección de fórmulas.
- **Base de datos con dos motores**: el mismo SQL corre en PostgreSQL (Neon, producción) y en SQLite (local, sin configurar nada). Ver `src/lib/db.ts`.
- **Dispositivos de confianza**: al entrar desde un navegador nuevo se envía un código de 6 dígitos al correo (10 minutos, 5 intentos, guardado como hash). En producción solo se exige si hay un servicio de correo configurado, para no dejar a nadie fuera.
- **OAuth sin librerías de auth**: Google y GitHub con OAuth 2.0; Apple con `form_post`, secreto firmado ES256 y verificación del `id_token` contra sus llaves públicas (`jose`). Si el correo ya existe y está verificado, se vincula a la cuenta.

## Stack

Next.js 16 (App Router) + TypeScript · Tailwind CSS 4 · Motion (animaciones) · Recharts · Zod · ua-parser-js · qrcode · Neon Postgres · node:sqlite · jose · nodemailer · Vercel.

Variables de entorno opcionales en `.env.example`. Para configurar el correo y los proveedores sin pegar secretos en pantalla: `node scripts/setup-gmail.mjs` y `node scripts/setup-oauth.mjs google|github`.
