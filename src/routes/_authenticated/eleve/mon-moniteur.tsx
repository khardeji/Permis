import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Car, ExternalLink, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/DashboardShell";
import { formatDT, initials, telLink, waLink } from "@/lib/format";
import { useMyStudent } from "../eleve";
import { useMyTraining } from "./index";

export const Route = createFileRoute("/_authenticated/eleve/mon-moniteur")({
  head: () => workspaceHead("Mon moniteur — Espace Élève"),
  component: MyInstructor,
});

function MyInstructor() {
  const { data: student } = useMyStudent();
  const { data: training, isLoading } = useMyTraining(student?.id);
  const instructor = training?.instructor;

  if (isLoading) return <p className="py-20 text-center text-muted-foreground">Chargement…</p>;

  if (!instructor) {
    return (
      <EmptyState
        icon={Car}
        title="Pas encore de moniteur"
        text="Envoyez une demande d'inscription depuis l'annuaire des moniteurs."
        action={
          <Button asChild>
            <Link to="/moniteurs">Parcourir l'annuaire</Link>
          </Button>
        }
      />
    );
  }

  const name = `${instructor.first_name} ${instructor.last_name}`;

  return (
    <>
      <PageHeader title="Mon moniteur" subtitle="Votre interlocuteur pour toute votre formation." />
      <Panel>
        <div className="flex flex-col items-start gap-6 sm:flex-row">
          {instructor.avatar_url ? (
            <img src={instructor.avatar_url} alt={name} className="size-24 rounded-2xl border border-border object-cover" />
          ) : (
            <span className="grid size-24 place-items-center rounded-2xl bg-primary-soft font-display text-2xl font-bold text-primary">{initials(name)}</span>
          )}
          <div className="flex-1">
            <p className="font-display text-2xl font-bold text-primary">{name}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-muted-foreground"><MapPin className="size-4" />{instructor.city}</p>
            {instructor.price_per_hour && <p className="mt-1 text-sm text-muted-foreground">Tarif indicatif : {formatDT(instructor.price_per_hour)} / heure</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {instructor.phone && (
                <Button asChild variant="outline">
                  <a href={telLink(instructor.phone)}><Phone /> Appeler</a>
                </Button>
              )}
              {instructor.whatsapp && (
                <Button asChild variant="outline">
                  <a href={waLink(instructor.whatsapp, "Bonjour, ")} target="_blank" rel="noreferrer">💬 WhatsApp</a>
                </Button>
              )}
              <Button asChild variant="ghost">
                <Link to="/moniteur/$slug" params={{ slug: instructor.slug }}>
                  <ExternalLink /> Page publique
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Panel>
    </>
  );
}
