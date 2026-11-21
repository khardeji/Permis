import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, PauseCircle, PlayCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeader, StatusBadge } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { formatDT, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/moniteurs")({
  head: () => workspaceHead("Moniteurs — Administration"),
  component: AdminInstructors,
});

function AdminInstructors() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-instructors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instructors")
        .select("id, slug, first_name, last_name, city, status, accepting_students, rating, price_per_hour, created_at, students(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = rows.filter((i) =>
    `${i.first_name} ${i.last_name} ${i.city}`.toLowerCase().includes(q.toLowerCase().trim()),
  );

  async function setStatus(id: string, status: "active" | "suspended") {
    const { error } = await supabase.from("instructors").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      toast.error("Action impossible", { description: error.message });
      return;
    }
    toast.success(status === "active" ? "Moniteur activé" : "Moniteur suspendu");
    qc.invalidateQueries({ queryKey: ["admin-instructors"] });
  }

  async function toggleAccepting(id: string, value: boolean) {
    const { error } = await supabase.from("instructors").update({ accepting_students: value, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      toast.error("Action impossible", { description: error.message });
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-instructors"] });
  }

  return (
    <>
      <PageHeader title="Moniteurs" subtitle="Validez, suspendez et gérez les moniteurs partenaires." />
      <div className="mb-4 max-w-sm">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un moniteur…" className="h-11" />
      </div>
      {isLoading ? (
        <p className="py-20 text-center text-muted-foreground">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Moniteur</th>
                <th className="px-5 py-3 font-medium">Ville</th>
                <th className="px-5 py-3 font-medium">Élèves</th>
                <th className="px-5 py-3 font-medium">Tarif</th>
                <th className="px-5 py-3 font-medium">Inscrit le</th>
                <th className="px-5 py-3 font-medium">Nouveaux élèves</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-primary">{i.first_name} {i.last_name}</p>
                    <p className="text-xs text-muted-foreground">Note : {Number(i.rating).toFixed(1)} / 5</p>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{i.city}</td>
                  <td className="px-5 py-3 text-muted-foreground">{(i.students as { count: number }[] | null)?.[0]?.count ?? 0}</td>
                  <td className="px-5 py-3 text-muted-foreground">{i.price_per_hour ? `${formatDT(i.price_per_hour)}/h` : "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{fmtDate(i.created_at)}</td>
                  <td className="px-5 py-3">
                    <Switch checked={i.accepting_students} onCheckedChange={(v) => toggleAccepting(i.id, v)} aria-label="Accepte de nouveaux élèves" />
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={i.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon" title="Page publique">
                        <Link to="/moniteur/$slug" params={{ slug: i.slug }} target="_blank"><ExternalLink className="size-4" /></Link>
                      </Button>
                      {i.status === "active" ? (
                        <Button variant="ghost" size="icon" title="Suspendre" onClick={() => setStatus(i.id, "suspended")}>
                          <PauseCircle className="size-4 text-destructive" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" title="Activer" onClick={() => setStatus(i.id, "active")}>
                          <PlayCircle className="size-4 text-success" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">Aucun moniteur trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
