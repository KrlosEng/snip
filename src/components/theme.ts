export type Theme = "light" | "dark" | "system";

export function currentTheme(): Theme {
  try {
    const t = localStorage.getItem("snip-theme");
    return t === "light" || t === "system" ? t : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(t: Theme) {
  try {
    localStorage.setItem("snip-theme", t);
  } catch {
    /* modo privado */
  }
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  // Transición suave del cambio de tema, sin animar el layout.
  root.style.setProperty("transition", "background-color .25s ease, color .25s ease");
  root.dataset.theme = dark ? "dark" : "light";
  setTimeout(() => root.style.removeProperty("transition"), 300);
}
