import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { CHALLENGE_COOKIE } from "@/lib/verify";
import { AuthLayout } from "@/components/auth-layout";
import { OtpForm } from "@/components/otp-form";

export const metadata: Metadata = { title: "Confirma que eres tú" };

export default async function VerifyPage({ searchParams }: PageProps<"/login/verify">) {
  if (await getUser()) redirect("/dashboard");
  if (!(await cookies()).get(CHALLENGE_COOKIE)) redirect("/login");
  const { e } = await searchParams;
  return (
    <AuthLayout>
      <OtpForm email={typeof e === "string" ? e : ""} />
    </AuthLayout>
  );
}
