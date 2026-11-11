// Asigna el plan de una cuenta a mano (todavía no hay cobro en línea).
//
// Uso (dentro de la carpeta snip):
//   node --env-file=.env.local scripts/set-plan.mjs correo@ejemplo.mx pro        Pro sin vencimiento
//   node --env-file=.env.local scripts/set-plan.mjs correo@ejemplo.mx pro 30     Pro por 30 días
//   node --env-file=.env.local scripts/set-plan.mjs correo@ejemplo.mx free       De vuelta a Gratis
//   node --env-file=.env.local scripts/set-plan.mjs correo@ejemplo.mx            Solo muestra el plan actual
//
// Usa la base de producción (DATABASE_URL). No imprime credenciales.

import { neon } from "@neondatabase/serverless";

const [emailRaw, planRaw, daysRaw] = process.argv.slice(2);
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

function stop(msg) {
  console.error(msg);
  process.exit(1);
}

if (!url) stop("Falta DATABASE_URL. Corre el script con: node --env-file=.env.local scripts/set-plan.mjs …");
const email = (emailRaw ?? "").trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) stop("Escribe el correo de la cuenta, por ejemplo: node --env-file=.env.local scripts/set-plan.mjs ana@ejemplo.mx pro");

const sql = neon(url);
const fmt = (ms) => (ms ? new Date(Number(ms)).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" }) : "sin vencimiento");

const [user] = await sql.query("SELECT id, name, plan, plan_until FROM users WHERE email = $1", [email]);
if (!user) stop(`No hay ninguna cuenta con ${email}.`);

if (!planRaw) {
  console.log(`${user.name} <${email}>: plan ${user.plan === "pro" ? "Pro" : "Gratis"}${user.plan === "pro" ? ` (${fmt(user.plan_until)})` : ""}`);
  process.exit(0);
}

const plan = planRaw.toLowerCase();
if (plan !== "pro" && plan !== "free") stop('El plan debe ser "pro" o "free".');
let until = null;
if (plan === "pro" && daysRaw !== undefined) {
  const days = Number(daysRaw);
  if (!Number.isInteger(days) || days < 1 || days > 3650) stop("Los días deben ser un número entero entre 1 y 3650.");
  until = Date.now() + days * 86_400_000;
}

await sql.query("UPDATE users SET plan = $1, plan_until = $2 WHERE id = $3", [plan, until, user.id]);
console.log(`Listo: ${user.name} <${email}> ahora tiene el plan ${plan === "pro" ? "Pro" : "Gratis"}${plan === "pro" ? ` (${fmt(until)})` : ""}.`);
