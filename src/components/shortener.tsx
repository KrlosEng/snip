"use client";

import { useState } from "react";

export type ShortResult = { id: string; slug: string; url: string; anonymous: boolean };

/** Lógica de "acortar" compartida por los formularios de la landing. */
export function useShorten() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShortResult | null>(null);

  async function shorten(url: string): Promise<boolean> {
    if (!url.trim()) {
      setError("Pega el enlace que quieres acortar.");
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No pudimos acortar el enlace. Intenta de nuevo.");
        return false;
      }
      setResult({ id: data.link.id, slug: data.link.slug, url: data.link.url, anonymous: data.anonymous });
      return true;
    } catch {
      setError("Sin conexión. Revisa tu internet e intenta de nuevo.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, setError, result, shorten };
}
