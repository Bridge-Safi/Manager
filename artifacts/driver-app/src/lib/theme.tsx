import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
  colors: ThemeColors;
}

export interface ThemeColors {
  bg: string;
  bgCard: string;
  bgCardHover: string;
  bgActive: string;
  border: string;
  text: string;
  textMid: string;
  textLight: string;
  sidebar: string;
  sidebarBorder: string;
  topBar: string;
  navActive: string;
}

const LIGHT: ThemeColors = {
  bg: "#FAF6EF",
  bgCard: "#FFFFFF",
  bgCardHover: "#F5F0E8",
  bgActive: "#FDEEE9",
  border: "#E8DDD0",
  text: "#2C1810",
  textMid: "#6B4033",
  textLight: "#9B7060",
  sidebar: "#FFFFFF",
  sidebarBorder: "#E8DDD0",
  topBar: "#FFFFFF",
  navActive: "#FDEEE9",
};

const DARK: ThemeColors = {
  bg: "#1A0A06",
  bgCard: "rgba(255,255,255,0.08)",
  bgCardHover: "rgba(255,255,255,0.12)",
  bgActive: "rgba(212,136,12,0.15)",
  border: "rgba(255,255,255,0.15)",
  text: "rgba(255,255,255,0.95)",
  textMid: "rgba(255,255,255,0.65)",
  textLight: "rgba(255,255,255,0.40)",
  sidebar: "rgba(26,10,6,0.85)",
  sidebarBorder: "rgba(255,255,255,0.10)",
  topBar: "rgba(26,10,6,0.85)",
  navActive: "rgba(212,136,12,0.20)",
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("bridge-theme");
    return (stored === "dark" || stored === "light") ? stored : "dark";
  });

  useEffect(() => {
    localStorage.setItem("bridge-theme", theme);
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));
  const isDark = theme === "dark";
  const colors = isDark ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
