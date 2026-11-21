import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Car, LayoutDashboard, Wallet } from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/dashboard/DashboardShell";
import { requireRole, useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/eleve")({
  beforeLoad: () => requireRole("student"),
  head: () => workspaceHead("Espace Élève"),
  component: EleveLayout,
});

export function useMyStudent() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-student", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

function EleveLayout() {
  const { user } = useAuth();
  const { data: student } = useMyStudent();

  const nav: NavItem[] = [
    { to: "/eleve", label: "Accueil", icon: LayoutDashboard, exact: true },
    { to: "/eleve/planning", label: "Mon planning", icon: CalendarDays },
    { to: "/eleve/paiements", label: "Mes paiements", icon: Wallet },
    { to: "/eleve/mon-moniteur", label: "Mon moniteur", icon: Car },
  ];

  return (
    <DashboardShell
      nav={nav}
      spaceLabel="Espace Élève"
      userName={student?.full_name ?? user?.email ?? "Élève"}
      userSub={student?.city ?? undefined}
    >
      <Outlet />
    </DashboardShell>
  );
}
