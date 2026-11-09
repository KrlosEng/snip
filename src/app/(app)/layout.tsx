import { requireUser } from "@/lib/auth";
import { getOrigin } from "@/lib/http";
import { DEMO_EMAIL } from "@/lib/seed";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const host = new URL(await getOrigin()).host;
  return (
    <AppShell user={{ name: user.name, email: user.email }} host={host} isDemo={user.email === DEMO_EMAIL}>
      {children}
    </AppShell>
  );
}
