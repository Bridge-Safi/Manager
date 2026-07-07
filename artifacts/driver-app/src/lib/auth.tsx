import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export interface BridgeUser {
  id: number;
  name: string;
  phone?: string;
  role: "livreur" | "chauffeur";
  vehicleType?: "car" | "moto";
}

interface AuthContextValue {
  livreur: BridgeUser | null;
  chauffeur: BridgeUser | null;
  loginLivreur: (user: BridgeUser) => void;
  loginChauffeur: (user: BridgeUser) => void;
  logoutLivreur: () => void;
  logoutChauffeur: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LS_LIVREUR = "bridge_livreur";
const LS_CHAUFFEUR = "bridge_chauffeur";

function loadUser(key: string): BridgeUser | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [livreur, setLivreur] = useState<BridgeUser | null>(() => loadUser(LS_LIVREUR));
  const [chauffeur, setChauffeur] = useState<BridgeUser | null>(() => loadUser(LS_CHAUFFEUR));

  const loginLivreur = (user: BridgeUser) => {
    localStorage.setItem(LS_LIVREUR, JSON.stringify(user));
    setLivreur(user);
  };

  const loginChauffeur = (user: BridgeUser) => {
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
