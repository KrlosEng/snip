import type { Metadata } from "next";
import { linkedProviders, requireUser } from "@/lib/auth";
import { DEMO_EMAIL } from "@/lib/seed";
import { verificationEnabled } from "@/lib/verify";
import { SettingsView } from "./view";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const user = await requireUser();
  const providers = await linkedProviders(user.id);
  const deleteMethod = user.hasPassword ? "password" : verificationEnabled() ? "code" : "email";
  return <SettingsView user={user} isDemo={user.email === DEMO_EMAIL} providers={providers} deleteMethod={deleteMethod} />;
}
