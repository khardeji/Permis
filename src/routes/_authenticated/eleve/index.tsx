import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Car, Clock, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { remaining, splitHours, totalPaid } from "@/lib/finance";
import { formatDT, fmtDate, fmtHours, fmtTime } from "@/lib/format";
import { useMyStudent } from "../eleve";

export const Route = createFileRoute("/_authenticated/eleve/")({
  head: () => workspaceHead("Accueil — Espace Élève"),
  component: EleveHome,
});

export function useMyTraining(studentId: string | undefined) {
  return useQuery({
    queryKey: ["eleve-training", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const [lessons, payments, link] = await Promise.all([
        supabase.from("lessons").select("id, starts_at, ends_at, status, location, notes").eq("student_id", studentId!).order("starts_at"),
        supabase.from("payments").select("id, amount, method, paid_at, note").eq("student_id", studentId!).order("paid_at", { ascending: false }),
        supabase.from("instructor_students").select("instructor_id").eq("student_id", studentId!).maybeSingle(),
      ]);
      let instructor = null;
      if (link.data?.instructor_id) {
        const { data } = await supabase
          .from("instructors")
          .select("id, slug, first_name, last_name, city, phone, whatsapp, avatar_url, price_per_hour")
          .eq("id", link.data.instructor_id)
          .maybeSingle();
        instructor = data;
      }
      return { lessons: lessons.data ?? [], payments: payments.data ?? [], instructor };
    },
  });
}

function EleveHome() {
  const { data: student, isLoading } = useMyStudent();
  const { data: training } = useMyTraining(student?.id);

  if (isLoading) return <p className="py-20 text-center text-muted-foreground">Chargement…</p>;

  if (!student) {
    return (
      <EmptyState
        icon={Car}
        title="Vous n'êtes pas encore rattaché à un moniteur"
        text="Parcourez l'annuaire et envoyez une demande d'inscription au moniteur de votre choix."
        action={
          <Button asChild>
            <Link to="/moniteurs">Trouver un moniteur</Link>
          </Button>
        }
      />
    );
  }

  const lessons = training?.lessons ?? [];
  const payments = training?.payments ?? [];
  const hours = splitHours(lessons);
  const paid = totalPaid(payments);
  const left = remaining(student.agreed_price, payments);
  const next = lessons.find((l) => l.status === "scheduled" && new Date(l.ends_at) > new Date());
  const progress = student.hours_package > 0 ? Math.min(100, (hours.done / student.hours_package) * 100) : 0;

  return (
    <>
      <PageHeader title={`Bonjour ${student.full_name.split(" ")[0]} 👋`} subtitle="Voici votre progression vers le permis." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Heures effectuées" value={fmtHours(hours.done)} icon={Clock} hint={`Forfait : ${student.hours_package} h`} />
        <StatCard label="Heures planifiées" value={fmtHours(hours.planned)} icon={CalendarDays} tone="brand" />
        <StatCard label="Total payé" value={formatDT(paid)} icon={Wallet} tone="success" />
        <StatCard label="Reste à payer" value={formatDT(left)} icon={Wallet} tone={left > 0 ? "warning" : "success"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Ma progression">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{fmtHours(hours.done)} sur {student.hours_package} h</span>
              <span className="font-semibold text-primary">{Math.round(progress)} %</span>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-muted-foreground">
              Permis visé : <span className="font-medium text-primary">{student.license_type}</span>
            </p>
          </div>
        </Panel>

        <Panel
          title="Prochaine séance"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/eleve/planning">Mon planning <ArrowRight /></Link>
            </Button>
          }
        >
          {next ? (
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="font-display text-lg font-bold capitalize text-primary">{fmtDate(next.starts_at, "EEEE d MMMM")}</p>
                <p className="text-muted-foreground">{fmtTime(next.starts_at)} – {fmtTime(next.ends_at)}{next.location ? ` · ${next.location}` : ""}</p>
              </div>
              <StatusBadge status={next.status} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune séance planifiée pour le moment. Votre moniteur vous contactera.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
