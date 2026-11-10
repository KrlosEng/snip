import { apiUser, json, scopeOf } from "@/lib/http";
import { dashboardStats } from "@/lib/clicks";

export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return json(await dashboardStats(await scopeOf(user.id), user.timezone));
}
