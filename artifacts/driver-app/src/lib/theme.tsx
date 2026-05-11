import React, { useState, useEffect, useContext, createContext } from "react";

interface ThemeColors {
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

interface ThemeContextValue {
  theme: "light" | "dark";
  toggleTheme: () => void;
  isDark: boolean;
  colors: ThemeColors;
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
  navActive: "#FDEEE9"
};

const DARK: ThemeColors = {
  bg: "#0F1117",
  bgCard: "#1C1F2E",
  bgCardHover: "#252838",
  bgActive: "#2A1F1A",
  border: "#2E2E3E",
  text: "#F0E8E0",
  textMid: "#C0A898",
  textLight: "#7A6A62",
  sidebar: "#141620",
  sidebarBorder: "#252838",
  topBar: "#141620",
  navActive: "#2A1F1A"
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("bridge-theme");
    return stored === "dark" || stored === "light" ? stored : "light";
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

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
