import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { scopeOf } from "@/lib/http";
import { DEMO_EMAIL } from "@/lib/seed";
import { listMyWorkspaces, teamDetail } from "@/lib/workspaces";
import { TeamView } from "./view";

export const metadata: Metadata = { title: "Equipo" };

export default async function TeamPage() {
  const user = await requireUser();
  const [scope, teams] = await Promise.all([scopeOf(user.id), listMyWorkspaces(user.id)]);
  const detail = scope.workspaceId ? await teamDetail(scope.workspaceId) : null;
  return (
    <TeamView
      me={user.id}
      isDemo={user.email === DEMO_EMAIL}
      space={{ id: scope.workspaceId, name: scope.name, role: scope.role }}
      teams={teams}
      members={detail?.members ?? []}
      invites={detail?.invites ?? []}
    />
  );
}
