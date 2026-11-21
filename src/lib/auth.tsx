import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthChangeEvent, User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "instructor" | "student";

export const REMEMBER_EMAIL_KEY = "permiconduit_remember_email";
export const SESSION_ONLY_KEY = "permiconduit_session_only";
export const ACTIVE_SESSION_KEY = "permiconduit_active_session";

type AuthState = { user: User | null; ready: boolean };
const AuthCtx = createContext<AuthState>({ user: null, ready: false });

export function AuthProvider({
  children,
  onChange,
}: {
  children: ReactNode;
  onChange?: (event: AuthChangeEvent) => void;
}) {
  const [state, setState] = useState<AuthState>({ user: null, ready: false });
  useEffect(() => {
    try {
      if (
        localStorage.getItem(SESSION_ONLY_KEY) === "1" &&
        !sessionStorage.getItem(ACTIVE_SESSION_KEY)
      ) {
        localStorage.removeItem(SESSION_ONLY_KEY);
        supabase.auth.signOut().catch(() => {});
      }
    } catch {
      // ignore storage errors
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ user: session?.user ?? null, ready: true });
      onChange?.(event);
    });
    supabase.auth.getSession().then(({ data }) => {
      setState({ user: data.session?.user ?? null, ready: true });
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

export async function fetchRoles(userId: string): Promise<Role[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as Role);
}

export function useRoles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["roles", user?.id],
    enabled: !!user,
    queryFn: () => fetchRoles(user!.id),
  });
}

export function homeForRoles(roles: Role[]): "/admin" | "/pro" | "/eleve" {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("instructor")) return "/pro";
  return "/eleve";
}

/** Client-side gate used in role layouts' beforeLoad (data itself is protected by RLS). */
export async function requireRole(role: Role) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw redirect({ to: "/auth" });
  const roles = await fetchRoles(data.user.id);
  if (!roles.includes(role)) throw redirect({ to: homeForRoles(roles) });
  return { user: data.user, roles };
}

export function safeRedirect(path: string | undefined) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return undefined;
  return path;
}
