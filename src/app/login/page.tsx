import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { enabledProviders } from "@/lib/oauth";
import { AuthLayout } from "@/components/auth-layout";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

const ERRORS: Record<string, string> = {
  oauth: "No pudimos completar el inicio de sesión. Intenta de nuevo o usa tu correo.",
  cancelled: "Cancelaste el inicio de sesión.",
  unverified: "Ese proveedor no confirmó tu correo. Usa otro método.",
  code: "No pudimos enviarte el código de verificación. Intenta de nuevo en un momento.",
  google: "No pudimos entrar con Google. Intenta de nuevo o usa tu correo.",
};


export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getUser()) redirect("/dashboard");
  const { error } = await searchParams;
  return (
    <AuthLayout>
      <AuthForm
        mode="login"
        providers={enabledProviders()}
        initialError={typeof error === "string" ? (ERRORS[error] ?? null) : null}
      />
    </AuthLayout>
  );
}
