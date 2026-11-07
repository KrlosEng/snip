import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { enabledProviders } from "@/lib/oauth";
import { AuthLayout } from "@/components/auth-layout";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage() {
  if (await getUser()) redirect("/dashboard");
  return (
    <AuthLayout>
      <AuthForm mode="register" providers={enabledProviders()} />
    </AuthLayout>
  );
}
