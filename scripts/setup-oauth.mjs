// Guarda en Vercel las claves para "Continuar con Google / GitHub" y publica.
// El ID de cliente se escribe; el secreto se lee del portapapeles para que nunca se vea.
//
// Uso (dentro de la carpeta snip):  node scripts/setup-oauth.mjs google
//                                   node scripts/setup-oauth.mjs github

import readline from "node:readline";
import { spawnSync } from "node:child_process";

const provider = (process.argv[2] ?? "").toLowerCase();
const NAMES = { google: "GOOGLE", github: "GITHUB" };
if (!NAMES[provider]) {
  console.error("Indica el proveedor:  node scripts/setup-oauth.mjs google   (o github)");
  process.exit(1);
}
const P = NAMES[provider];
const label = provider === "google" ? "Google" : "GitHub";

function ask(q) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (a) => {
      rl.close();
      resolve(a.trim());
    });
  });
}

function addEnv(name, value) {
  spawnSync(`npx vercel env rm ${name} --environment production --yes`, { stdio: "ignore", shell: true });
  const r = spawnSync(`npx vercel env add ${name} --environment production`, { input: value, stdio: ["pipe", "ignore", "pipe"], shell: true });
  if (r.status !== 0) console.error(String(r.stderr).split("\n").filter((l) => !l.includes(value)).join("\n"));
  return r.status === 0;
}

console.log(`\n✂  Snip · Configurar "Continuar con ${label}"\n`);
if (spawnSync("npx vercel whoami", { stdio: "ignore", shell: true }).status !== 0) {
  console.error("No tienes sesión en Vercel en esta terminal. Ejecuta primero:  npx vercel login");
  process.exit(1);
}

const clientId = await ask(`ID de cliente de ${label}: `);
const idOk = provider === "google" ? /\.apps\.googleusercontent\.com$/.test(clientId) : /^[A-Za-z0-9.]{10,}$/.test(clientId);
if (!idOk) {
  console.error(provider === "google" ? "\nEl ID de Google termina en .apps.googleusercontent.com. Revísalo." : "\nEse ID de cliente no parece válido.");
  process.exit(1);
}

await ask(`Ahora COPIA el secreto de cliente (Ctrl+C) y pulsa Enter aquí, sin pegar nada… `);
const clip = spawnSync("powershell", ["-NoProfile", "-Command", "Get-Clipboard"], { encoding: "utf8" });
const secret = String(clip.stdout ?? "").trim();
spawnSync("powershell", ["-NoProfile", "-Command", "Set-Clipboard -Value ' '"], { stdio: "ignore" });
if (secret.length < 20 || /\s/.test(secret) || secret === clientId) {
  console.error("\nLo que había en el portapapeles no parece un secreto de cliente. Cópialo de nuevo y vuelve a ejecutar.");
  process.exit(1);
}
console.log("✓ Secreto leído del portapapeles.");

console.log("\nGuardando en Vercel (producción)…");
if (!addEnv(`${P}_CLIENT_ID`, clientId) || !addEnv(`${P}_CLIENT_SECRET`, secret)) {
  console.error("\nNo se pudieron guardar las variables en Vercel.");
  process.exit(1);
}
console.log("✓ Guardado. Publicando la app (tarda ~1 minuto)…\n");
const dep = spawnSync("npx vercel deploy --prod --yes", { stdio: ["ignore", "ignore", "inherit"], shell: true });
console.log(dep.status === 0 ? `\n✓ Listo. Abre https://snip-acortador.vercel.app/login y verás "Continuar con ${label}".\n` : "\nNo se pudo publicar. Revisa el error de arriba.");
