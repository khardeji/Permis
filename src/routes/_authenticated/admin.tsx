import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Flag, GraduationCap, LayoutDashboard, Mail, MessageSquareQuote, Users } from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/dashboard/DashboardShell";
import { requireRole, useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: () => requireRole("admin"),
  head: () => workspaceHead("Administration"),
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = useAuth();

  const { data: counts } = useQuery({
    queryKey: ["admin-badges"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [req, rep] = await Promise.all([
        supabase.from("enrollment_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      return { requests: req.count ?? 0, reports: rep.count ?? 0 };
    },
  });

  const nav: NavItem[] = [
    { to: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
    { to: "/admin/moniteurs", label: "Moniteurs", icon: Users },
    { to: "/admin/eleves", label: "Élèves", icon: GraduationCap },
    { to: "/admin/demandes", label: "Demandes", icon: ClipboardList, ...(counts && counts.requests > 0 ? { badge: counts.requests } : {}) },
    { to: "/admin/signalements", label: "Signalements", icon: Flag, ...(counts && counts.reports > 0 ? { badge: counts.reports } : {}) },
    { to: "/admin/avis", label: "Avis", icon: MessageSquareQuote },
    { to: "/admin/messages", label: "Messages", icon: Mail },
  ];

  return (
    <DashboardShell nav={nav} spaceLabel="Administration" userName="Super Admin" userSub={user?.email ?? undefined}>
      <Outlet />
    </DashboardShell>
  );
}
