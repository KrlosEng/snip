import "server-only";

/**
 * Envío de correos. Dos opciones, la primera que esté configurada:
 * 1. RESEND_API_KEY (+ MAIL_FROM con un dominio verificado en Resend).
 * 2. SMTP_URL, por ejemplo Gmail con contraseña de aplicación:
 *    smtps://tucorreo%40gmail.com:CONTRASEÑA_DE_APP@smtp.gmail.com:465
 * Sin ninguna, el correo no se envía (en desarrollo se imprime en la consola).
 */

const RESEND = process.env.RESEND_API_KEY;
const SMTP = process.env.SMTP_URL;
const FROM = process.env.MAIL_FROM ?? "Snip <onboarding@resend.dev>";

export function mailerConfigured(): boolean {
  return Boolean(RESEND || SMTP);
}

type Mail = { to: string; subject: string; text: string; html: string };

export async function sendMail(mail: Mail): Promise<boolean> {
  try {
    if (RESEND) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
      });
      if (!res.ok) console.error("Resend:", res.status, await res.text());
      return res.ok;
    }
    if (SMTP) {
      const nodemailer = (await import("nodemailer")).default;
      const transport = nodemailer.createTransport(SMTP);
      const from = process.env.MAIL_FROM ?? decodeURIComponent(new URL(SMTP).username);
      await transport.sendMail({ from, ...mail });
      return true;
    }
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[correo de desarrollo] Para: ${mail.to}\n${mail.subject}\n${mail.text}\n`);
      return true;
    }
    return false;
  } catch (e) {
    console.error("No se pudo enviar el correo", e);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function codeEmail(opts: { code: string; purpose: "login" | "delete"; device: string; when: string }) {
  const title = opts.purpose === "login" ? "Tu código para entrar a Snip" : "Código para borrar tu cuenta de Snip";
  const intro =
    opts.purpose === "login"
      ? "Alguien intenta entrar a tu cuenta desde un dispositivo nuevo. Si fuiste tú, usa este código:"
      : "Pediste borrar tu cuenta de Snip. Para confirmarlo, usa este código:";
  const warn =
    opts.purpose === "login"
      ? "Si no fuiste tú, no compartas el código y cambia tu contraseña."
      : "Si no pediste borrar tu cuenta, ignora este correo: no se borrará nada.";
  const text = `${title}\n\n${intro}\n\n${opts.code}\n\nVence en 10 minutos.\nDispositivo: ${opts.device}\nFecha: ${opts.when}\n\n${warn}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f1e8;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#1b2130">
<table role="presentation" width="100%" style="max-width:460px;margin:0 auto;background:#fdfbf7;border:1px solid #e3dccf;border-radius:12px">
<tr><td style="padding:28px 28px 8px"><span style="display:inline-block;background:#d8452c;color:#fdfbf7;font-weight:700;padding:4px 10px;border-radius:6px">✂ Snip</span></td></tr>
<tr><td style="padding:8px 28px"><h1 style="font-size:20px;margin:12px 0 8px">${esc(title)}</h1><p style="margin:0;color:#4b5263;line-height:1.5">${esc(intro)}</p></td></tr>
<tr><td style="padding:20px 28px"><div style="font-family:'Courier New',monospace;font-size:34px;letter-spacing:10px;font-weight:700;text-align:center;background:#f6f1e8;border:2px dashed #d8452c;border-radius:10px;padding:16px">${esc(opts.code)}</div>
<p style="margin:10px 0 0;text-align:center;color:#6b7283;font-size:13px">Vence en 10 minutos</p></td></tr>
<tr><td style="padding:4px 28px 28px;color:#6b7283;font-size:13px;line-height:1.5">Dispositivo: ${esc(opts.device)}<br>Fecha: ${esc(opts.when)}<br><br>${esc(warn)}</td></tr>
</table></body></html>`;
  return { subject: `${opts.code} es tu código de Snip`, text, html };
}

/** Correo con el enlace para crear una contraseña nueva. */
export function resetEmail(opts: { link: string; when: string }) {
  const text = `Recupera tu cuenta de Snip\n\nPediste crear una contraseña nueva. Abre este enlace (vence en 30 minutos y sirve una sola vez):\n\n${opts.link}\n\nFecha: ${opts.when}\n\nSi no fuiste tú, ignora este correo: tu contraseña no cambia.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f1e8;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#1b2130">
<table role="presentation" width="100%" style="max-width:460px;margin:0 auto;background:#fdfbf7;border:1px solid #e3dccf;border-radius:12px">
<tr><td style="padding:28px 28px 8px"><span style="display:inline-block;background:#d8452c;color:#fdfbf7;font-weight:700;padding:4px 10px;border-radius:6px">✂ Snip</span></td></tr>
<tr><td style="padding:8px 28px"><h1 style="font-size:20px;margin:12px 0 8px">Crea una contraseña nueva</h1>
<p style="margin:0;color:#4b5263;line-height:1.5">Pediste recuperar tu cuenta. El enlace vence en 30 minutos y sirve una sola vez.</p></td></tr>
<tr><td style="padding:24px 28px"><a href="${esc(opts.link)}" style="display:inline-block;background:#d8452c;color:#fdfbf7;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:10px">Crear contraseña nueva</a></td></tr>
<tr><td style="padding:4px 28px 28px;color:#6b7283;font-size:13px;line-height:1.5">Fecha: ${esc(opts.when)}<br><br>Si no fuiste tú, ignora este correo: tu contraseña no cambia.</td></tr>
</table></body></html>`;
  return { subject: "Recupera tu cuenta de Snip", text, html };
}

/** Invitación a un equipo. */
export function inviteEmail(o: { team: string; inviter: string; role: string; link: string }) {
  const text = `${o.inviter} te invitó a su equipo "${o.team}" en Snip como ${o.role}.\n\nAcepta aquí (vence en 7 días):\n${o.link}\n\nSi no conoces a esta persona, ignora este correo.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f1e8;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#1b2130">
<table role="presentation" width="100%" style="max-width:460px;margin:0 auto;background:#fdfbf7;border:1px solid #e3dccf;border-radius:12px">
<tr><td style="padding:28px 28px 8px"><span style="display:inline-block;background:#d8452c;color:#fdfbf7;font-weight:700;padding:4px 10px;border-radius:6px">✂ Snip</span></td></tr>
<tr><td style="padding:8px 28px"><h1 style="font-size:20px;margin:12px 0 8px">Te invitaron a ${esc(o.team)}</h1>
<p style="margin:0;color:#4b5263;line-height:1.5">${esc(o.inviter)} quiere que trabajes con su equipo en Snip como <b>${esc(o.role)}</b>.</p></td></tr>
<tr><td style="padding:20px 28px 8px"><a href="${esc(o.link)}" style="display:inline-block;background:#d8452c;color:#fdfbf7;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:10px">Ver la invitación</a></td></tr>
<tr><td style="padding:12px 28px 28px;color:#6b7283;font-size:13px;line-height:1.5">Vence en 7 días. Si no conoces a esta persona, ignora este correo.</td></tr>
</table></body></html>`;
  return { subject: `${o.inviter} te invitó a "${o.team}" en Snip`, text, html };
}

/** Aviso cuando un enlace llega a la meta de clics que eligió su dueño. */
export function milestoneEmail(o: { name: string; slug: string; title: string | null; count: number; url: string | null }) {
  const n = new Intl.NumberFormat("es-MX").format(o.count);
  const what = o.title ? `${o.title} (/${o.slug})` : `/${o.slug}`;
  const text = `Hola, ${o.name}:\n\nTu enlace ${what} llegó a ${n} clics.${o.url ? `\n\nVer sus estadísticas: ${o.url}` : ""}\n\nTe avisamos porque pediste este aviso al crear o editar el enlace.`;
  const button = o.url
    ? `<tr><td style="padding:16px 28px 8px"><a href="${esc(o.url)}" style="display:inline-block;background:#d8452c;color:#fdfbf7;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:10px">Ver estadísticas</a></td></tr>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f6f1e8;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#1b2130">
<table role="presentation" width="100%" style="max-width:460px;margin:0 auto;background:#fdfbf7;border:1px solid #e3dccf;border-radius:12px">
<tr><td style="padding:28px 28px 8px"><span style="display:inline-block;background:#d8452c;color:#fdfbf7;font-weight:700;padding:4px 10px;border-radius:6px">✂ Snip</span></td></tr>
<tr><td style="padding:8px 28px"><h1 style="font-size:20px;margin:12px 0 8px">¡${esc(n)} clics!</h1>
<p style="margin:0;color:#4b5263;line-height:1.5">Hola, ${esc(o.name)}. Tu enlace <b>${esc(what)}</b> llegó a la meta que elegiste.</p></td></tr>
${button}
<tr><td style="padding:12px 28px 28px;color:#6b7283;font-size:13px;line-height:1.5">Te avisamos porque pediste este aviso al crear o editar el enlace.</td></tr>
</table></body></html>`;
  return { subject: `Tu enlace /${o.slug} llegó a ${n} clics`, text, html };
}
