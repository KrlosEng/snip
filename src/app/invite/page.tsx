import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { getUser } from "@/lib/auth";
import { inviteInfo, ROLE_LABEL } from "@/lib/workspaces";
import { AcceptInvite } from "./accept-button";

export const metadata: Metadata = { title: "Invitación a un equipo", referrer: "no-referrer", robots: { index: false } };

const h1 = "text-[2.5rem] leading-[1.05] font-normal tracking-[-0.04em]";
const lead = "mt-3 text-[18px] leading-[1.5] font-extralight";
const link = "font-semibold text-brand underline-offset-4 hover:underline";

export default async function InvitePage({ searchParams }: PageProps<"/invite">) {
  const { token } = await searchParams;
  const t = typeof token === "string" && token.length >= 20 && token.length <= 200 ? token : null;
  const [info, user] = await Promise.all([t ? inviteInfo(t) : null, getUser()]);

  if (!t || !info || !info.valid) {
    return (
      <AuthLayout>
        <div>
          <h1 className={h1}>Esta invitación ya no sirve</h1>
          <p className={lead}>Venció, ya se usó o el enlace está incompleto. Pide a quien te invitó que te mande una nueva.</p>
          <Link href={user ? "/team" : "/login"} className={`mt-8 inline-block text-sm ${link}`}>
            {user ? "Ir a mis equipos" : "Iniciar sesión"}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const role = ROLE_LABEL[info.role].toLowerCase();
  return (
    <AuthLayout>
      <div>
        <h1 className={h1}>Te invitaron a {info.team}</h1>
        <p className={lead}>
          {info.inviter} quiere que trabajes con su equipo en Snip como <span className="font-normal">{role}</span>.
        </p>
        {!user ? (
          <div className="mt-8 grid gap-3">
            <p className="text-sm text-ink-2">
              Entra o crea tu cuenta con <span className="font-semibold text-ink">{info.email}</span> y vuelve a abrir este enlace desde tu correo.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex h-11 items-center rounded-full bg-brand px-6 text-sm font-semibold text-brand-ink">
                Iniciar sesión
              </Link>
              <Link href="/register" className="inline-flex h-11 items-center rounded-full border border-line px-6 text-sm font-semibold">
                Crear cuenta
              </Link>
            </div>
          </div>
        ) : user.email.toLowerCase() !== info.email ? (
          <p className="mt-8 rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn" role="alert">
            Esta invitación es para {info.email}, pero entraste como {user.email}. Cierra sesión y entra con la cuenta correcta.
          </p>
        ) : (
          <AcceptInvite token={t} team={info.team} />
        )}
      </div>
    </AuthLayout>
  );
}
