"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { CircleAlert, CircleCheck, X } from "lucide-react";

type Toast = { id: number; tone: "success" | "error" | "info"; title: string; body?: ReactNode };
type ToastFn = (t: Omit<Toast, "id">) => void;

const ToastCtx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastCtx);

export function Providers({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback<ToastFn>(
    (t) => {
      const id = nextId.current++;
      setToasts((cur) => [...cur.slice(-2), { ...t, id }]);
      setTimeout(() => dismiss(id), t.tone === "error" ? 6000 : 3800);
    },
    [dismiss],
  );

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
      <ToastCtx.Provider value={push}>
        {children}
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6"
        >
          <AnimatePresence initial={false}>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.18 } }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface p-3.5 pr-2.5 shadow-3"
                role={t.tone === "error" ? "alert" : "status"}
              >
                {t.tone === "error" ? (
                  <CircleAlert className="mt-0.5 size-[18px] shrink-0 text-danger" aria-hidden />
                ) : (
                  <CircleCheck className="mt-0.5 size-[18px] shrink-0 text-success" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{t.title}</p>
                  {t.body && <div className="mt-0.5 text-[13px] text-ink-2">{t.body}</div>}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                  aria-label="Cerrar aviso"
                >
                  <X className="size-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ToastCtx.Provider>
    </MotionConfig>
  );
}
