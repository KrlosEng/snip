import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth-layout";
import { ForgotForm } from "@/components/reset-forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPage() {
  return (
    <AuthLayout>
      <ForgotForm />
    </AuthLayout>
  );
}
