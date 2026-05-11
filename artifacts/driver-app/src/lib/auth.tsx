import React, { useState, useContext, createContext } from "react";

interface AuthUser {
  id: number;
  name: string;
  phone: string;
  role: string;
  vehicleType?: string;
  services?: string[];
  avatarUrl?: string;
}

interface AuthContextValue {
  livreur: AuthUser | null;
  chauffeur: AuthUser | null;
  loginLivreur: (user: AuthUser) => void;
  loginChauffeur: (user: AuthUser) => void;
  logoutLivreur: () => void;
  logoutChauffeur: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const LS_LIVREUR = "bridge_livreur";
const LS_CHAUFFEUR = "bridge_chauffeur";

function loadUser(key: string): AuthUser | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [livreur, setLivreur] = useState<AuthUser | null>(() => loadUser(LS_LIVREUR));
  const [chauffeur, setChauffeur] = useState<AuthUser | null>(() => loadUser(LS_CHAUFFEUR));

  const loginLivreur = (user: AuthUser) => {
    localStorage.setItem(LS_LIVREUR, JSON.stringify(user));
    setLivreur(user);
  };
  const loginChauffeur = (user: AuthUser) => {
    localStorage.setItem(LS_CHAUFFEUR, JSON.stringify(user));
    setChauffeur(user);
  };
  const logoutLivreur = () => {
    localStorage.removeItem(LS_LIVREUR);
    setLivreur(null);
  };
  const logoutChauffeur = () => {
    localStorage.removeItem(LS_CHAUFFEUR);
    setChauffeur(null);
  };

  return (
    <AuthContext.Provider value={{ livreur, chauffeur, loginLivreur, loginChauffeur, logoutLivreur, logoutChauffeur }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
