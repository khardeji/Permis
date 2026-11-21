import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardList, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { fmtDate, fmtRelative, telLink, waLink } from "@/lib/format";
import { useMyInstructor } from "../pro";

export const Route = createFileRoute("/_authenticated/pro/demandes")({
  head: () => workspaceHead("Demandes d'inscription — Espace Moniteur"),
  component: RequestsPage,
});

type Request = Tables<"enrollment_requests">;

function RequestsPage() {
  const { data: instructor } = useMyInstructor();
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["pro-requests", instructor?.id],
    enabled: !!instructor,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollment_requests")
        .select("*")
        .eq("instructor_id", instructor!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");

  async function decide(req: Request, accept: boolean) {
    setBusyId(req.id);
    const { error } = await supabase.rpc("decide_enrollment", {
      _request_id: req.id,
      _accept: accept,
      ...(accept ? { _agreed_price: 0, _hours: 0 } : {}),
    });
    setBusyId(null);
    if (error) {
      toast.error("Action impossible", { description: error.message });
      return;
    }
    toast.success(accept ? "Élève accepté 🎉" : "Demande refusée", {
      description: accept ? `${req.full_name} apparaît maintenant dans vos élèves.` : undefined,
    });
    qc.invalidateQueries({ queryKey: ["pro-requests"] });
    qc.invalidateQueries({ queryKey: ["pending-requests"] });
    qc.invalidateQueries({ queryKey: ["pro-students"] });
  }

  return (
    <>
      <PageHeader title="Demandes d'inscription" subtitle="Acceptez ou refusez les élèves qui souhaitent apprendre avec vous." />
      {isLoading ? (
        <p className="py-20 text-center text-muted-foreground">Chargement…</p>
      ) : (
        <div className="space-y-6">
          <Panel title={`En attente (${pending.length})`}>
            {pending.length === 0 ? (
              <EmptyState icon={ClipboardList} title="Aucune demande en attente" text="Les nouvelles demandes d'inscription apparaîtront ici." />
            ) : (
              <ul className="space-y-3">
                {pending.map((r) => (
                  <li key={r.id} className="rounded-xl border border-border bg-secondary/30 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-primary">{r.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {r.city ?? "Ville inconnue"} · {fmtRelative(r.created_at)}
                        </p>
                        {r.message && <p className="mt-2 rounded-lg bg-card px-3 py-2 text-sm text-muted-foreground">« {r.message} »</p>}
                        <div className="mt-2 flex flex-wrap gap-3 text-sm">
                          {r.phone && <a href={telLink(r.phone)} className="font-medium text-primary hover:text-brand">{r.phone}</a>}
                          {r.phone && <a href={waLink(r.phone, `Bonjour ${r.full_name}, suite à votre demande sur PermiConduit…`)} target="_blank" rel="noreferrer" className="font-medium text-success hover:underline">WhatsApp</a>}
                          {r.email && <a href={`mailto:${r.email}`} className="text-muted-foreground hover:text-primary">{r.email}</a>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={busyId === r.id} onClick={() => decide(r, true)}><Check /> Accepter</Button>
                        <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => decide(r, false)}><X /> Refuser</Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {decided.length > 0 && (
            <Panel title="Historique">
              <ul className="divide-y divide-border">
                {decided.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <p className="flex-1 font-medium text-primary">{r.full_name}</p>
                    <p className="text-sm text-muted-foreground">{r.decided_at ? fmtDate(r.decided_at) : ""}</p>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
    </>
  );
}
