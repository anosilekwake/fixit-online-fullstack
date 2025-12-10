// frontend/src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

/**
 * AuthProvider
 * - keeps adminToken in state and localStorage
 * - provides login(token) and logout()
 */
export function AuthProvider({ children }) {
  const [adminToken, setAdminToken] = useState(() => {
    try {
      return localStorage.getItem("adminToken");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (adminToken) localStorage.setItem("adminToken", adminToken);
      else localStorage.removeItem("adminToken");
    } catch (e) {
      console.warn("AuthContext localStorage error", e);
    }
  }, [adminToken]);

  const login = (token) => setAdminToken(token);
  const logout = () => setAdminToken(null);

  return (
    <AuthContext.Provider value={{ adminToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to use auth in components */
export function useAuth() {
  return useContext(AuthContext);
}
