import { createContext, useContext, useState, ReactNode } from "react";

type User = {
  name: string;
  email: string;
  role: "buyer" | "seller";
};

type AuthContextType = {
  user: User | null;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: "buyer" | "seller") => Promise<void>;
  continueAsGuest: () => void;
  logout: () => void;
  isAuthenticated: boolean; // true if logged in OR guest
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const login = async (email: string, _password: string) => {
    await new Promise((res) => setTimeout(res, 800));
    setIsGuest(false);
    setUser({ name: "Kwame Asante", email, role: "buyer" });
  };

  const signup = async (name: string, email: string, _password: string, role: "buyer" | "seller") => {
    await new Promise((res) => setTimeout(res, 800));
    setIsGuest(false);
    setUser({ name, email, role });
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    setUser(null);
  };

  const logout = () => {
    setUser(null);
    setIsGuest(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isGuest,
      login,
      signup,
      continueAsGuest,
      logout,
      isAuthenticated: !!user || isGuest,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};