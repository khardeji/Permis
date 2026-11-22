import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { endOfMonth, startOfMonth } from "date-fns";
import { ArrowRight, CalendarDays, ClipboardList, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StatCard, StatusBadge, EmptyState } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { formatDT, fmtDate, fmtTime } from "@/lib/format";
import { useMyInstructor } from "../pro";

export const Route = createFileRoute("/_authenticated/pro/")({
  head: () => workspaceHead("Tableau de bord — Espace Moniteur"),
  component: ProDashboard,
});

function ProDashboard() {
  const { data: instructor, isLoading } = useMyInstructor();

  const monthStart = startOfMonth(new Date()).toISOString();
  const monthEnd = endOfMonth(new Date()).toISOString();

  const { data: stats } = useQuery({
    queryKey: ["pro-stats", instructor?.id],
    enabled: !!instructor,
    queryFn: async () => {
      const iid = instructor!.id;
      const [students, lessonsMonth, paymentsMonth, requests] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("instructor_id", iid).eq("status", "active"),
        supabase.from("lessons").select("starts_at, ends_at, status").eq("instructor_id", iid).gte("starts_at", monthStart).lte("starts_at", monthEnd).neq("status", "cancelled"),
        supabase.from("payments").select("amount").eq("instructor_id", iid).gte("paid_at", monthStart).lte("paid_at", monthEnd),
        supabase.from("enrollment_requests").select("id", { count: "exact", head: true }).eq("instructor_id", iid).eq("status", "pending"),
      ]);
      const hours = (lessonsMonth.data ?? []).reduce((s, l) => s + Math.max(0, (new Date(l.ends_at).getTime() - new Date(l.starts_at).getTime()) / 3_600_000), 0);
      const cash = (paymentsMonth.data ?? []).reduce((s, p) => s + Number(p.amount), 0);
      return { students: students.count ?? 0, hours, cash, requests: requests.count ?? 0 };
    },
  });

  const { data: upcoming = [] } = useQuery({
    queryKey: ["pro-upcoming", instructor?.id],
    enabled: !!instructor,
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id, starts_at, ends_at, status, location, students(full_name)")
        .eq("instructor_id", instructor!.id)
        .gte("starts_at", new Date().toISOString())
        .neq("status", "cancelled")
        .order("starts_at")
        .limit(5);
      return data ?? [];
    },
  });

  if (isLoading) return <p className="py-20 text-center text-muted-foreground">Chargement…</p>;

  if (!instructor) {
    return (
      <EmptyState
        icon={Users}
        title="Profil moniteur introuvable"
        text="Votre compte n'est pas encore rattaché à un profil moniteur. Contactez l'équipe PermiConduit."
      />
    );
  }

  return (
    <>
      <PageHeader
        title={`Bonjour ${instructor.first_name} 👋`}
        subtitle="Voici l'activité de votre auto-école ce mois-ci."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Élèves actifs" value={stats?.students ?? "…"} icon={Users} />
        <StatCard label="Heures ce mois" value={stats ? `${Math.round(stats.hours * 10) / 10} h` : "…"} icon={CalendarDays} tone="brand" />
        <StatCard label="Encaissé ce mois" value={stats ? formatDT(stats.cash) : "…"} icon={Wallet} tone="success" />
        <StatCard label="Demandes en attente" value={stats?.requests ?? "…"} icon={ClipboardList} tone="warning" />
      </div>

      <div className="mt-6">
        <Panel
          title="Prochaines séances"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/pro/planning">Tout le planning <ArrowRight /></Link>
            </Button>
          }
        >
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Aucune séance à venir"
              text="Planifiez votre prochaine leçon depuis le planning."
              action={
                <Button asChild size="sm">
                  <Link to="/pro/planning">Ouvrir le planning</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-28">
                    <p className="font-semibold text-primary">{fmtDate(l.starts_at, "EEE d MMM")}</p>
                    <p className="text-sm text-muted-foreground">{fmtTime(l.starts_at)} – {fmtTime(l.ends_at)}</p>
                  </div>
                  <p className="flex-1 font-medium text-primary">{(l.students as { full_name: string } | null)?.full_name ?? "Élève"}</p>
                  {l.location && <p className="text-sm text-muted-foreground">{l.location}</p>}
                  <StatusBadge status={l.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
