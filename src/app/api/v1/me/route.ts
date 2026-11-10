import { v1Auth, v1json } from "@/lib/api-v1";

/** GET /api/v1/me — para comprobar que la clave funciona. */
export async function GET(req: Request) {
  const ctx = await v1Auth(req);
  if (ctx instanceof Response) return ctx;
  return v1json({ id: ctx.user.id, name: ctx.user.name, email: ctx.user.email, timezone: ctx.user.timezone }, 200, ctx.headers);
}
