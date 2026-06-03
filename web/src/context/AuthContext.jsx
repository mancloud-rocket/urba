import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { api, setAuthToken } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncProfile = useCallback(async (user, accessToken, fetchMe = true) => {
    if (!user) {
      setProfile(null);
      return;
    }
    setAuthToken(accessToken);
    let rol = user.user_metadata?.rol || "operador";
    let nombre = user.user_metadata?.nombre || user.email?.split("@")[0] || "Usuario";
    if (fetchMe && accessToken) {
      try {
        const me = await api.me();
        if (me?.rol) rol = me.rol;
        if (me?.nombre) nombre = me.nombre;
      } catch {
        // Render sin auth configurado aun
      }
    }
    setProfile({
      id: user.id,
      email: user.email,
      nombre,
      rol,
    });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthToken(null);
      setProfile({ id: "dev", nombre: "Desarrollo", rol: "admin", email: "dev@local" });
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session;
      setSession(s);
      await syncProfile(s?.user ?? null, s?.access_token);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      const refetchMe = event === "SIGNED_IN" || event === "INITIAL_SESSION";
      await syncProfile(s?.user ?? null, s?.access_token, refetchMe);
    });

    return () => sub.subscription.unsubscribe();
  }, [syncProfile]);

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setSession(data.session);
    await syncProfile(data.user, data.session?.access_token);
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setAuthToken(null);
    setSession(null);
    setProfile(null);
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
