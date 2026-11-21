import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, MapPin } from "lucide-react";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/components/dashboard/DashboardShell";
import { fmtDate, fmtTime } from "@/lib/format";
import { useMyStudent } from "../eleve";
import { useMyTraining } from "./index";

export const Route = createFileRoute("/_authenticated/eleve/planning")({
  head: () => workspaceHead("Mon planning — Espace Élève"),
  component: ElevePlanning,
});

function ElevePlanning() {
  const { data: student } = useMyStudent();
  const { data: training, isLoading } = useMyTraining(student?.id);

  const now = new Date();
  const lessons = training?.lessons ?? [];
  const upcoming = lessons.filter((l) => l.status === "scheduled" && new Date(l.ends_at) > now);
  const past = lessons.filter((l) => !(l.status === "scheduled" && new Date(l.ends_at) > now)).reverse();

  return (
    <>
      <PageHeader title="Mon planning" subtitle="Vos leçons de conduite, passées et à venir." />
      {isLoading ? (
        <p className="py-20 text-center text-muted-foreground">Chargement…</p>
      ) : lessons.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Aucune séance pour le moment" text="Votre moniteur planifiera vos leçons ici." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title={`À venir (${upcoming.length})`}>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Rien de prévu pour le moment.</p>
            ) : (
              <LessonList items={upcoming} />
            )}
          </Panel>
          <Panel title={`Historique (${past.length})`}>
            {past.length === 0 ? <p className="text-sm text-muted-foreground">Pas encore de séance passée.</p> : <LessonList items={past} />}
          </Panel>
        </div>
      )}
    </>
  );
}

function LessonList({ items }: { items: { id: string; starts_at: string; ends_at: string; status: string; location: string | null; notes: string | null }[] }) {
  return (
    <ul className="space-y-2">
      {items.map((l) => (
        <li key={l.id} className="rounded-xl border border-border bg-secondary/30 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold capitalize text-primary">{fmtDate(l.starts_at, "EEEE d MMMM")}</p>
              <p className="text-sm text-muted-foreground">{fmtTime(l.starts_at)} – {fmtTime(l.ends_at)}</p>
            </div>
            <StatusBadge status={l.status} />
          </div>
          {l.location && <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" />{l.location}</p>}
          {l.notes && <p className="mt-1 text-sm text-muted-foreground">{l.notes}</p>}
        </li>
      ))}
    </ul>
  );
}
