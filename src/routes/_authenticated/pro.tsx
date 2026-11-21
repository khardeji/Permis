import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ClipboardList, LayoutDashboard, UserRound, Users, Wallet } from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/dashboard/DashboardShell";
import { requireRole, useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/pro")({
  beforeLoad: () => requireRole("instructor"),
  head: () => workspaceHead("Espace Moniteur"),
  component: ProLayout,
});

export function useMyInstructor() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-instructor", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instructors")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function ProLayout() {
  const { user } = useAuth();
  const { data: instructor } = useMyInstructor();

  const { data: pending = 0 } = useQuery({
    queryKey: ["pending-requests", instructor?.id],
    enabled: !!instructor,
    queryFn: async () => {
      const { count } = await supabase
        .from("enrollment_requests")
        .select("id", { count: "exact", head: true })
        .eq("instructor_id", instructor!.id)
        .eq("status", "pending");
      return count ?? 0;
    },
  });

  const nav: NavItem[] = [
    { to: "/pro", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
    { to: "/pro/eleves", label: "Mes élèves", icon: Users },
    { to: "/pro/planning", label: "Planning", icon: CalendarDays },
    { to: "/pro/finances", label: "Finances", icon: Wallet },
    { to: "/pro/demandes", label: "Demandes", icon: ClipboardList, ...(pending > 0 ? { badge: pending } : {}) },
    { to: "/pro/profil", label: "Mon profil", icon: UserRound },
  ];

  const name = instructor ? `${instructor.first_name} ${instructor.last_name}` : (user?.email ?? "Moniteur");

  return (
    <DashboardShell
      nav={nav}
      spaceLabel="Espace Moniteur"
      userName={name}
      userSub={instructor?.city ?? user?.email ?? undefined}
      publicLink={instructor ? { to: "/moniteur/$slug", params: { slug: instructor.slug }, label: "Voir ma page publique" } : undefined}
    >
      <Outlet />
    </DashboardShell>
  );
}
