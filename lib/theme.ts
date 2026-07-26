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
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

export function faviconHref(theme: UiTheme, size: 32 | 48 = 32): string {
  return `/favicon/${theme}/${size}.png`;
}

/** Swap tab icons to match UI theme (light mark on dark bg when dark, and vice versa). */
export function applyFavicon(theme: UiTheme) {
  if (typeof document === "undefined") return;
  const href32 = faviconHref(theme, 32);
  const href48 = faviconHref(theme, 48);

  const ensure = (key: string, rel: string, href: string, sizes?: string) => {
    let link = document.querySelector<HTMLLinkElement>(
      `link[data-ui-favicon="${key}"]`
    );
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("data-ui-favicon", key);
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.type = "image/png";
    if (sizes) link.setAttribute("sizes", sizes);
    // cache-bust so the tab updates immediately
    link.href = `${href}?v=${theme}`;
  };

  ensure("icon-32", "icon", href32, "32x32");
  ensure("icon-48", "icon", href48, "48x48");
  ensure("shortcut", "shortcut icon", href32);
}

export function applyTheme(theme: UiTheme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
  applyFavicon(theme);
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

/** Inline script: theme + favicon before paint */
export const THEME_BOOT_SCRIPT = `(()=>{try{var k=${JSON.stringify(UI_THEME_KEY)};var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t;var href="/favicon/"+t+"/32.png?v="+t;function set(rel,key){var l=document.querySelector('link[data-ui-favicon="'+key+'"]');if(!l){l=document.createElement("link");l.setAttribute("data-ui-favicon",key);l.rel=rel;l.type="image/png";document.head.appendChild(l)}l.href=href}set("icon","icon-32");set("shortcut icon","shortcut")}catch(e){}})();`;
