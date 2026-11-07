// Configura el envío de correos de Snip con tu Gmail.
// Pide tu correo y una "contraseña de aplicación" de Google, envía un correo
// de prueba y, si llega bien, guarda SMTP_URL y MAIL_FROM en Vercel (producción).
// La contraseña no se muestra en pantalla ni se guarda en ningún archivo.
//
// Uso (dentro de la carpeta snip):  node scripts/setup-gmail.mjs

import readline from "node:readline";
import { spawnSync } from "node:child_process";
import nodemailer from "nodemailer";

function ask(question, { hidden = false } = {}) {
  if (hidden) return askHidden(question);
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.question(question, (a) => {
      rl.close();
      resolve(a.trim());
    });
  });
}

/** Lee tecla por tecla en modo crudo: nada de lo escrito o pegado llega a la pantalla. */
function askHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          return resolve(value.trim());
        }
        if (ch === "\u0003") process.exit(130); // Ctrl+C
        if (ch === "\u007f" || ch === "\b") {
          if (value) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        if (ch >= " ") {
          value += ch;
          process.stdout.write("*");
        }
      }
    };
    stdin.on("data", onData);
  });
}

function addEnv(name, value) {
  // Reemplaza el valor si ya existía. La salida se oculta para que el valor nunca aparezca en pantalla.
  spawnSync(`npx vercel env rm ${name} --environment production --yes`, { stdio: "ignore", shell: true });
  const r = spawnSync(`npx vercel env add ${name} --environment production`, { input: value, stdio: ["pipe", "ignore", "pipe"], shell: true });
  if (r.status !== 0) console.error(String(r.stderr).split("\n").filter((l) => !l.includes(value)).join("\n"));
  return r.status === 0;
}

console.log("\n✂  Snip · Configurar correo con Gmail\n");

// Primero confirmamos la sesión de Vercel, para que nada se escriba en un aviso de login.
if (spawnSync("npx vercel whoami", { stdio: "ignore", shell: true }).status !== 0) {
  console.error("No tienes sesión en Vercel en esta terminal. Ejecuta primero:  npx vercel login");
  process.exit(1);
}
console.log("Necesitas una contraseña de aplicación de Google (16 letras):");
console.log("  https://myaccount.google.com/apppasswords  (requiere verificación en 2 pasos)\n");

const email = (await ask("Tu correo de Gmail: ")).toLowerCase();
if (!/^[^@\s]+@(gmail|googlemail)\.com$/.test(email)) {
  console.error("\nEse no parece un correo de Gmail. Vuelve a intentarlo.");
  process.exit(1);
}
// La clave se lee del portapapeles: así no hay que pegarla en la terminal y nunca se ve.
await ask("Copia la contraseña de aplicación de Google (Ctrl+C) y luego pulsa Enter aquí… ");
const clip = spawnSync("powershell", ["-NoProfile", "-Command", "Get-Clipboard"], { encoding: "utf8" });
const appPassword = String(clip.stdout ?? "").replace(/[^a-zA-Z]/g, "");
// Vaciamos el portapapeles para que la clave no se quede ahí.
spawnSync("powershell", ["-NoProfile", "-Command", "Set-Clipboard -Value ' '"], { stdio: "ignore" });
if (!/^[a-zA-Z]{16}$/.test(appPassword)) {
  console.error(`\nLo que había en el portapapeles no es una contraseña de aplicación (tiene ${appPassword.length} letras y deben ser 16).`);
  console.error("Copia de nuevo la clave de Google y vuelve a ejecutar el asistente.");
  process.exit(1);
}
console.log("✓ Clave leída del portapapeles (16 letras).");

const smtpUrl = `smtps://${encodeURIComponent(email)}:${encodeURIComponent(appPassword)}@smtp.gmail.com:465`;
const from = `Snip <${email}>`;

console.log("\nProbando la conexión y enviándote un correo de prueba…");
try {
  const t = nodemailer.createTransport(smtpUrl);
  await t.verify();
  await t.sendMail({
    from,
    to: email,
    subject: "Snip ya puede enviar correos ✂",
    text: "Listo: Snip enviará desde esta cuenta los códigos de verificación.",
  });
} catch (e) {
  console.error("\nNo funcionó:", e.message);
  console.error("Revisa que la contraseña de aplicación sea correcta. No se guardó nada.");
  process.exit(1);
}
console.log(`✓ Correo de prueba enviado a ${email}\n`);

console.log("Guardando en Vercel (producción)…");
if (!addEnv("SMTP_URL", smtpUrl) || !addEnv("MAIL_FROM", from)) {
  console.error("\nNo se pudieron guardar las variables en Vercel. ¿Estás en la carpeta snip y con sesión en Vercel?");
  process.exit(1);
}
console.log("\n✓ Listo. Ahora publica de nuevo para activarlo:  npx vercel deploy --prod\n");
