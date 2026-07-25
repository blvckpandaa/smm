"use client";

import { useEffect, useState } from "react";
import {
  applyTheme,
  getStoredTheme,
  resolveTheme,
  toggleTheme,
  type UiTheme,
} from "@/lib/theme";
import styles from "./ThemeToggle.module.css";

type Props = {
  labels?: { light: string; dark: string };
  className?: string;
};

export function ThemeToggle({
  labels = { light: "Светлая", dark: "Тёмная" },
  className,
}: Props) {
  const [theme, setThemeState] = useState<UiTheme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = resolveTheme(getStoredTheme());
    applyTheme(next);
    setThemeState(next);
    setReady(true);
  }, []);

  return (
    <button
      type="button"
      className={`${styles.toggle} ${className ?? ""}`.trim()}
      aria-label={theme === "dark" ? labels.light : labels.dark}
      title={theme === "dark" ? labels.light : labels.dark}
      disabled={!ready}
      onClick={() => setThemeState((prev) => toggleTheme(prev))}
    >
      <span className={styles.icon} aria-hidden>
        {theme === "dark" ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5z" />
          </svg>
        )}
      </span>
    </button>
  );
}
