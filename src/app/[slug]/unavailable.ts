/**
 * Página de "enlace no disponible" (404 / 410). Se sirve como HTML
 * autocontenido desde el route handler para poder responder con el código
 * HTTP correcto en la misma URL del enlace corto. Sin JavaScript.
 */

type Reason = "missing" | "invalid" | "expired" | "paused";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const COPY: Record<Reason, { badge: string; title: string; body: string; reason: string }> = {
  missing: {
    badge: "Enlace no encontrado",
    title: "Este enlace corto no existe.",
    body: "Puede que tenga un error de dedo o que quien lo creó lo haya borrado. Revisa las letras: en Snip, mayúsculas y minúsculas cuentan.",
    reason: "No hay ningún enlace con este alias.",
  },
  invalid: {
    badge: "Enlace no válido",
    title: "Este enlace corto no existe.",
    body: "La dirección tiene caracteres que Snip no usa en sus enlaces. Probablemente se copió incompleta.",
    reason: "El alias tiene un formato no válido.",
  },
  expired: {
    badge: "Enlace vencido",
    title: "Este enlace ya venció.",
    body: "Quien lo creó le puso fecha de caducidad y esa fecha ya pasó. Si lo necesitas, pídele un enlace nuevo.",
    reason: "",
  },
  paused: {
    badge: "Enlace pausado",
    title: "Este enlace está pausado.",
    body: "Quien lo creó lo desactivó por ahora. Puede volver a funcionar más adelante.",
    reason: "El creador desactivó este enlace.",
  },
};

export function unavailablePage(p: { origin: string; slug: string; status: 404 | 410; reason: Reason; expiresAt?: number }): string {
  const c = COPY[p.reason];
  const host = p.origin.replace(/^https?:\/\//, "");
  const reason =
    p.reason === "expired" && p.expiresAt
      ? `Venció el ${new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "UTC" }).format(p.expiresAt)}.`
      : c.reason;
  const statusText = p.status === 410 ? "410 GONE" : "404 NOT FOUND";

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(c.badge)} · Snip</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@500;700&family=Host+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{
  --bg:oklch(0.968 0.011 80);--surface:oklch(0.992 0.005 80);--line:oklch(0.885 0.015 75);
  --ink:oklch(0.21 0.022 258);--ink-2:oklch(0.42 0.02 258);--ink-3:oklch(0.54 0.018 258);
  --brand:oklch(0.575 0.205 33);--brand-strong:oklch(0.5 0.19 31);--brand-ink:oklch(0.99 0.006 80);
  --danger:oklch(0.55 0.2 25);--danger-soft:oklch(0.95 0.03 25);--stamp:oklch(0.21 0.022 258);
}
@media (prefers-color-scheme:dark){:root{
  --bg:oklch(0.165 0.013 258);--surface:oklch(0.205 0.015 258);--line:oklch(0.295 0.016 258);
  --ink:oklch(0.95 0.01 80);--ink-2:oklch(0.79 0.014 80);--ink-3:oklch(0.65 0.014 80);
  --brand:oklch(0.69 0.18 36);--brand-strong:oklch(0.76 0.15 40);--brand-ink:oklch(0.16 0.02 258);
  --danger:oklch(0.7 0.17 25);--danger-soft:oklch(0.3 0.06 25);--stamp:oklch(0.05 0.01 258);
}}
*{box-sizing:border-box;margin:0}
body{min-height:100dvh;display:flex;flex-direction:column;background:var(--bg);color:var(--ink);font:400 15px/1.55 "Host Grotesk",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}
header{padding:28px 24px;display:flex;justify-content:center}
.logo{display:inline-flex;align-items:center;gap:8px;font:700 20px/1 "Funnel Display",system-ui;letter-spacing:-.03em;text-decoration:none}
.logo svg{width:26px;height:26px}
main{flex:1;display:grid;place-items:center;padding:24px 20px 48px}
.wrap{width:100%;max-width:520px}
.art{height:96px;display:flex;justify-content:center;margin-bottom:28px}
.art svg{overflow:visible}
.half,.spark{transform-box:fill-box;transform-origin:center}
.half{animation:drift 1.1s cubic-bezier(.16,1,.3,1) .2s both}
.half.r{animation-name:drift-r}
.spark{opacity:0;animation:spark .6s cubic-bezier(.16,1,.3,1) .45s both}
@keyframes drift{from{transform:translate(10px,0) rotate(0)}to{transform:translate(-4px,4px) rotate(-8deg)}}
@keyframes drift-r{from{transform:translate(-10px,0) rotate(0)}to{transform:translate(4px,-4px) rotate(-8deg)}}
@keyframes spark{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:scale(1)}}
.rise{animation:rise .7s cubic-bezier(.16,1,.3,1) both}
.d1{animation-delay:.08s}.d2{animation-delay:.16s}.d3{animation-delay:.24s}.d4{animation-delay:.32s}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.badge{display:inline-flex;align-items:center;gap:8px;padding:4px 10px;border-radius:999px;background:var(--danger-soft);color:var(--danger);font:500 12px/1.4 "JetBrains Mono",monospace}
.badge i{width:6px;height:6px;border-radius:50%;background:currentColor}
h1{margin:16px 0 10px;font:700 clamp(28px,6vw,40px)/1.08 "Funnel Display",system-ui;letter-spacing:-.035em;text-wrap:balance}
p.lead{color:var(--ink-2);max-width:46ch;text-wrap:pretty}
.ticket{margin:28px 0;background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.ticket-top{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px dashed var(--line);font-size:13px;color:var(--ink-2)}
.code{font:500 12px/1 "JetBrains Mono",monospace;color:var(--danger)}
.ticket-body{padding:16px;display:grid;gap:14px}
.k{font-size:12px;color:var(--ink-3);margin-bottom:4px}
.slug{font:500 15px/1.4 "JetBrains Mono",monospace;word-break:break-all}
.slug b{font-weight:500;color:var(--ink-3)}
.actions{display:flex;flex-wrap:wrap;gap:10px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 18px;border-radius:10px;font:600 14px/1 "Host Grotesk",system-ui;text-decoration:none;transition:transform .15s cubic-bezier(.16,1,.3,1),background-color .15s}
.btn:active{transform:scale(.97)}
.primary{background:var(--brand);color:var(--brand-ink);box-shadow:3px 3px 0 var(--stamp)}
.primary:hover{background:var(--brand-strong)}
.ghost{border:1px solid var(--line);background:var(--surface)}
.ghost:hover{border-color:var(--ink-3)}
.btn:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
footer{padding:24px;text-align:center;font-size:13px;color:var(--ink-3)}
footer a{text-underline-offset:3px}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>
<header><a class="logo" href="/">${LOGO}Snip</a></header>
<main><div class="wrap">
  <div class="art" aria-hidden="true">
    <svg width="132" height="96" viewBox="0 0 132 96" fill="none" stroke="var(--brand)" stroke-width="7" stroke-linecap="round">
      <g class="half"><path d="M58 30 L44 30 A18 18 0 0 0 44 66 L58 66"/></g>
      <g class="half r"><path d="M74 30 L88 30 A18 18 0 0 1 88 66 L74 66"/></g>
      <g class="spark" stroke="var(--danger)" stroke-width="4"><path d="M66 14v8M66 74v8M54 18l4 6M78 78l-4-6"/></g>
    </svg>
  </div>
  <span class="badge rise"><i></i>${p.status} · ${esc(c.badge)}</span>
  <h1 class="rise d1">${esc(c.title)}</h1>
  <p class="lead rise d2">${esc(c.body)}</p>
  <section class="ticket rise d3" aria-label="Detalle">
    <div class="ticket-top"><span>Lo que intentaste abrir</span><span class="code">HTTP ${statusText}</span></div>
    <div class="ticket-body">
      <div><div class="k">Enlace</div><div class="slug"><b>${esc(host)}/</b>${esc(p.slug)}</div></div>
      <div><div class="k">Motivo</div><div>${esc(reason)}</div></div>
    </div>
  </section>
  <div class="actions rise d4">
    <a class="btn primary" href="/">Crear un enlace gratis</a>
    <a class="btn ghost" href="/login">Entrar a mi cuenta</a>
  </div>
</div></main>
<footer><a href="/privacy">Privacidad</a></footer>
</body>
</html>`;
}

const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--brand)"/><g fill="none" stroke="var(--brand-ink)" stroke-width="2.6" stroke-linecap="round"><circle cx="11" cy="21.5" r="3.2"/><circle cx="21" cy="21.5" r="3.2"/><path d="M13 19 L22 8M19 19 L10 8"/></g></svg>`;
