import { describe, expect, it } from "vitest";
import { assertPublicUrl, isBlockedIp } from "@/lib/net-guard";

describe("isBlockedIp (anti-SSRF)", () => {
  it("bloquea direcciones internas IPv4", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1"]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("bloquea direcciones internas IPv6 e IPv4 incrustada", () => {
    for (const ip of ["::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:a00:1", "ff02::1"]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("deja pasar direcciones públicas", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111"]) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });

  it("trata lo que no es IP como bloqueado", () => {
    expect(isBlockedIp("no-es-ip")).toBe(true);
  });
});

describe("assertPublicUrl", () => {
  it("rechaza hosts internos, puertos raros, credenciales y otros protocolos sin consultar DNS", async () => {
    for (const bad of [
      "http://localhost/",
      "http://algo.localhost/",
      "http://servidor.internal/",
      "http://127.0.0.1/",
      "http://[::1]/",
      "http://169.254.169.254/latest/meta-data",
      "https://8.8.8.8:8443/",
      "https://usuario:clave@8.8.8.8/",
      "ftp://8.8.8.8/",
    ]) {
      await expect(assertPublicUrl(bad), bad).rejects.toThrow();
    }
  });

  it("acepta una IP pública en el puerto estándar", async () => {
    await expect(assertPublicUrl("https://8.8.8.8/")).resolves.toBeInstanceOf(URL);
  });
});
