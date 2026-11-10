"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function AcceptInvite({ token, team }: { token: string; team: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/invites/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      return setError(data?.error ?? "Sin conexión. Intenta de nuevo.");
    }
    router.push("/links");
    router.refresh();
  }

  return (
    <div className="mt-8 grid gap-3">
      <Button size="lg" onClick={accept} loading={busy} className="w-full sm:w-auto">
        Unirme a {team}
      </Button>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
