import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, Flag, GraduationCap, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StatCard } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { formatDT, fmtRelative } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => workspaceHead("Vue d'ensemble — Administration"),
  component: AdminHome,
});

function AdminHome() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [inst, stu, req, rep, pay] = await Promise.all([
        supabase.from("instructors").select("id", { count: "exact", head: true }),
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("enrollment_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("payments").select("amount"),
      ]);
      return {
        instructors: inst.count ?? 0,
        students: stu.count ?? 0,
        requests: req.count ?? 0,
        reports: rep.count ?? 0,
        revenue: (pay.data ?? []).reduce((s, p) => s + Number(p.amount), 0),
      };
    },
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["admin-recent-instructors"],
    queryFn: async () => {
      const { data } = await supabase
        .from("instructors")
        .select("id, first_name, last_name, city, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  return (
    <>
      <PageHeader title="Vue d'ensemble" subtitle="L'activité de la plateforme PermiConduit." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Moniteurs" value={stats?.instructors ?? "…"} icon={Users} />
        <StatCard label="Élèves" value={stats?.students ?? "…"} icon={GraduationCap} tone="brand" />
        <StatCard label="Demandes en attente" value={stats?.requests ?? "…"} icon={ClipboardList} tone="warning" />
        <StatCard label="Signalements ouverts" value={stats?.reports ?? "…"} icon={Flag} tone="destructive" />
        <StatCard label="Encaissements déclarés" value={stats ? formatDT(stats.revenue) : "…"} icon={Wallet} tone="success" />
      </div>

      <div className="mt-6">
        <Panel
          title="Derniers moniteurs inscrits"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/moniteurs">Tous les moniteurs <ArrowRight /></Link>
            </Button>
          }
        >
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun moniteur pour le moment.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <p className="flex-1 font-medium text-primary">{i.first_name} {i.last_name}</p>
                  <p className="text-sm text-muted-foreground">{i.city}</p>
                  <p className="text-sm text-muted-foreground">{fmtRelative(i.created_at)}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${i.status === "active" ? "bg-success-soft text-success" : "bg-warning-soft text-warning-foreground"}`}>
                    {i.status === "active" ? "Actif" : i.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
