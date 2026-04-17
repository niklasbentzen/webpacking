import { createContext, useEffect, useMemo, useState } from "react";
import { pb } from "@/lib/pb";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // initialize from PocketBase store (persists via localStorage)
  const [user, setUser] = useState(pb.authStore.record ?? null);

  useEffect(() => {
    // keep React state synced with PocketBase authStore changes
    const unsub = pb.authStore.onChange(() => {
      setUser(pb.authStore.record ?? null);
    }, true);

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!pb.authStore.isValid) {
      // Token already expired locally — clear it so isLoggedIn goes false
      pb.authStore.clear();
      return;
    }
    // Token looks valid locally — verify with the server
    pb.collection("users").authRefresh().catch(() => {
      pb.authStore.clear();
    });
  }, []);

  const login = async (usernameOrEmail, password) => {
    const authData = await pb
      .collection("users")
      .authWithPassword(usernameOrEmail, password);

    // pb.authStore now has record; state will update via onChange
    return authData.record;
  };

  const logout = () => {
    pb.authStore.clear();
    // state will update via onChange, but this is fine too:
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: !!user,
      login,
      logout,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
