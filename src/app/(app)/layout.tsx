import { requireUser } from "@/lib/auth";
import { getOrigin, scopeOf } from "@/lib/http";
import { DEMO_EMAIL } from "@/lib/seed";
import { listMyWorkspaces } from "@/lib/workspaces";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const host = new URL(await getOrigin()).host;
  const [scope, teams] = await Promise.all([scopeOf(user.id), listMyWorkspaces(user.id)]);
  return (
    <AppShell
      user={{ name: user.name, email: user.email }}
      host={host}
      isDemo={user.email === DEMO_EMAIL}
      space={{ id: scope.workspaceId, name: scope.name, role: scope.role }}
      teams={teams.map((t) => ({ id: t.id, name: t.name, role: t.role }))}
    >
      {children}
    </AppShell>
  );
}
