import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { dashboardStats } from "@/lib/clicks";
import { recentLinks } from "@/lib/links";
import { getOrigin } from "@/lib/http";
import { DashboardView } from "./view";

export const metadata: Metadata = { title: "Panel" };

export default async function DashboardPage() {
  const user = await requireUser();
  const stats = await dashboardStats(user.id, user.timezone);
  const links = await recentLinks(user.id, 6);
  return <DashboardView name={user.name} stats={stats} links={links} origin={await getOrigin()} />;
}
