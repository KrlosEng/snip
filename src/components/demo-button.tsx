"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "./ui";
import { useToast } from "./providers";

export function DemoButton({ variant = "secondary", size = "lg", className, label = "Entrar como demo" }: { variant?: "primary" | "secondary" | "ghost"; size?: "md" | "lg"; className?: string; label?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      loading={busy}
      icon={<Sparkles className="size-4" aria-hidden />}
      onClick={async () => {
        setBusy(true);
        const res = await fetch("/api/auth/demo", { method: "POST" }).catch(() => null);
        if (!res?.ok) {
          setBusy(false);
          toast({ tone: "error", title: "No pudimos abrir la demo", body: "Intenta de nuevo en un momento." });
          return;
        }
        router.push("/dashboard");
        router.refresh();
      }}
    >
      {label}
    </Button>
  );
}
