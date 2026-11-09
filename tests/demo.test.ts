import { describe, expect, it } from "vitest";
import { demoReadOnly } from "@/lib/http";
import { DEMO_EMAIL } from "@/lib/seed";
import type { PublicUser } from "@/lib/auth";

const as = (email: string) => ({ id: "x", email, name: "x" }) as unknown as PublicUser;

describe("cuenta demo de solo lectura", () => {
  it("bloquea a la demo con 403", async () => {
    const res = demoReadOnly(as(DEMO_EMAIL));
    expect(res?.status).toBe(403);
    expect(await res!.json()).toMatchObject({ demo: true });
  });

  it("deja pasar a cualquier otra cuenta o a nadie", () => {
    expect(demoReadOnly(as("ana@prueba.mx"))).toBeNull();
    expect(demoReadOnly(null)).toBeNull();
  });
});
