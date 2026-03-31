import React, { createContext, useContext, useState, ReactNode } from "react";
import { mockUser } from "@/data/mock";

interface AuthUser {
  id: string;
  nome: string;
  email: string;
  avatar_url: string;
  tipo: "particular" | "garagem" | "comprador";
  cidade: string;
  estado: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(mockUser);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login: () => setUser(mockUser),
        logout: () => setUser(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
