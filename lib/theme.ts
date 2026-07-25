export type UiTheme = "light" | "dark";

export const UI_THEME_KEY = "smm-agents-ui-theme";

export function getStoredTheme(): UiTheme | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(UI_THEME_KEY);
  if (raw === "light" || raw === "dark") return raw;
  return null;
}

export function resolveTheme(stored: UiTheme | null): UiTheme {
  if (stored) return stored;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function applyTheme(theme: UiTheme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

export function setTheme(theme: UiTheme) {
  localStorage.setItem(UI_THEME_KEY, theme);
  applyTheme(theme);
}

export function toggleTheme(current: UiTheme): UiTheme {
  const next = current === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

/** Inline script: apply theme before paint to avoid flash */
export const THEME_BOOT_SCRIPT = `(()=>{try{var k=${JSON.stringify(UI_THEME_KEY)};var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t}catch(e){}})();`;
