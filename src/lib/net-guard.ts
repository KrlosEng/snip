import dns from "node:dns/promises";
import net from "node:net";

/**
 * Protección contra SSRF: el servidor solo puede visitar direcciones públicas.
 * Se usa al leer el <title> de los enlaces que pega la gente, para que nadie
 * pueda usar a Snip para asomarse a direcciones internas (localhost, la red
 * privada o el servicio de metadatos de la nube).
 *
 * Sin dependencias de Next, para poder probarlo con Node directamente.
 */

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

const V4_BLOCKED: [string, number][] = [
  ["0.0.0.0", 8], // "esta" red
  ["10.0.0.0", 8], // privada
  ["100.64.0.0", 10], // NAT de operador
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // enlace local, incluye metadatos de la nube
  ["172.16.0.0", 12], // privada
  ["192.0.0.0", 24], // asignaciones IETF
  ["192.0.2.0", 24], // documentación
  ["192.168.0.0", 16], // privada
  ["198.18.0.0", 15], // pruebas de red
  ["198.51.100.0", 24], // documentación
  ["203.0.113.0", 24], // documentación
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reservada y broadcast
];

export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const n = ipv4ToInt(ip);
    return V4_BLOCKED.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (ipv4ToInt(base) & mask);
    });
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase().split("%")[0];
    if (v === "::" || v === "::1") return true;
    // IPv4 incrustada (::ffff:10.0.0.1 o ::ffff:a00:1)
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedIp(mapped[1]);
    if (v.startsWith("::ffff:")) {
      const hex = v.slice(7).split(":");
      if (hex.length === 2) {
        const a = parseInt(hex[0], 16);
        const b = parseInt(hex[1], 16);
        return isBlockedIp(`${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`);
      }
    }
    const first = parseInt(v.split(":")[0] || "0", 16);
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 privada
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 enlace local
    if ((first & 0xff00) === 0xff00) return true; // multicast
    if (v.startsWith("64:ff9b:") || v.startsWith("2001:db8:")) return true; // NAT64 y documentación
    return false;
  }
  return true; // lo que no es una IP válida no se visita
}

/** Lanza un error si la URL no es http(s) pública en los puertos 80 o 443. */
export async function assertPublicUrl(raw: string | URL): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("protocolo no permitido");
  if (url.username || url.password) throw new Error("credenciales en la URL");
  if (url.port && url.port !== "80" && url.port !== "443") throw new Error("puerto no permitido");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new Error("host interno");
  }
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true, verbatim: true });
  if (!addrs.length || addrs.some((a) => isBlockedIp(a.address))) throw new Error("dirección interna");
  return url;
}

/**
 * fetch que revisa cada salto: valida el destino, no sigue redirecciones solo
 * y vuelve a validar cada Location (como máximo `maxRedirects` saltos).
 */
export async function safeFetch(raw: string, init: RequestInit = {}, maxRedirects = 3): Promise<Response> {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const res = await fetch(url, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      void res.body?.cancel();
      if (!loc) return res;
      url = await assertPublicUrl(new URL(loc, url));
      continue;
    }
    return res;
  }
  throw new Error("demasiadas redirecciones");
}
