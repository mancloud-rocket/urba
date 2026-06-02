import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { setAuthToken } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (user) => {
    if (!user) {
      setProfile(null);
      return;
    }
    setProfile({
      id: user.id,
      email: user.email,
      nombre: user.user_metadata?.nombre || user.email?.split("@")[0] || "Usuario",
      rol: user.user_metadata?.rol || "operador",
    });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthToken(null);
      setProfile({ id: "dev", nombre: "Desarrollo", rol: "admin", email: "dev@local" });
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      setSession(s);
      setAuthToken(s?.access_token || null);
      loadProfile(s?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthToken(s?.access_token || null);
      loadProfile(s?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setAuthToken(null);
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut, isConfigured: isSupabaseConfigured() }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
