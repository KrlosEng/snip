import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { ResetForm } from "@/components/reset-forms";

export const metadata: Metadata = { title: "Contraseña nueva", referrer: "no-referrer" };

export default async function ResetPage({ searchParams }: PageProps<"/reset">) {
  const { token } = await searchParams;
  return (
    <AuthLayout>
      {typeof token === "string" && token.length >= 20 ? (
        <ResetForm token={token} />
      ) : (
        <div>
          <h1 className="text-[2.5rem] leading-[1.05] font-normal tracking-[-0.04em]">Este enlace no sirve</h1>
          <p className="mt-3 text-[18px] leading-[1.5] font-extralight">Le falta una parte o ya no es válido.</p>
          <Link href="/forgot" className="mt-8 inline-block text-sm font-semibold text-brand">
            Pedir un enlace nuevo
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
