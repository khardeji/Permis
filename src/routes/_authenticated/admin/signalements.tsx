import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Flag, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, StatusBadge } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { fmtRelative } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/signalements")({
  head: () => workspaceHead("Signalements — Administration"),
  component: AdminReports,
});

function AdminReports() {
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, reason, details, status, created_at, instructors(first_name, last_name, slug)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: "resolved" | "dismissed") {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) {
      toast.error("Action impossible", { description: error.message });
      return;
    }
    toast.success(status === "resolved" ? "Signalement résolu" : "Signalement classé");
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
    qc.invalidateQueries({ queryKey: ["admin-badges"] });
  }

  return (
    <>
      <PageHeader title="Signalements" subtitle="Examinez les profils signalés par les utilisateurs." />
      {isLoading ? (
        <p className="py-20 text-center text-muted-foreground">Chargement…</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Flag} title="Aucun signalement" text="Les signalements des utilisateurs apparaîtront ici." />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const inst = r.instructors as { first_name: string; last_name: string; slug: string } | null;
            return (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-primary">{r.reason}</p>
                    <p className="text-sm text-muted-foreground">
                      Moniteur : {inst ? `${inst.first_name} ${inst.last_name}` : "—"} · {fmtRelative(r.created_at)}
                    </p>
                    {r.details && <p className="mt-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">« {r.details} »</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.status === "open" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "resolved")}><Check /> Résolu</Button>
                        <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "dismissed")}><X /> Classer</Button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
