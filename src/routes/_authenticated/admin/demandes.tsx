import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, StatusBadge } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, fmtRelative } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/demandes")({
  head: () => workspaceHead("Demandes — Administration"),
  component: AdminRequests,
});

function AdminRequests() {
  const [filter, setFilter] = useState("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollment_requests")
        .select("id, full_name, city, phone, email, message, status, created_at, decided_at, instructors(first_name, last_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = rows.filter((r) => filter === "all" || r.status === filter);

  return (
    <>
      <PageHeader
        title="Demandes d'inscription"
        subtitle="Toutes les demandes envoyées aux moniteurs."
        actions={
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-10 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="accepted">Acceptées</SelectItem>
              <SelectItem value="rejected">Refusées</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      {isLoading ? (
        <p className="py-20 text-center text-muted-foreground">Chargement…</p>
      ) : list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">Aucune demande.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Élève</th>
                <th className="px-5 py-3 font-medium">Moniteur</th>
                <th className="px-5 py-3 font-medium">Message</th>
                <th className="px-5 py-3 font-medium">Envoyée</th>
                <th className="px-5 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const inst = r.instructors as { first_name: string; last_name: string } | null;
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-primary">{r.full_name}</p>
                      <p className="text-xs text-muted-foreground">{[r.phone, r.city].filter(Boolean).join(" · ")}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{inst ? `${inst.first_name} ${inst.last_name}` : "—"}</td>
                    <td className="max-w-56 truncate px-5 py-3 text-muted-foreground" title={r.message ?? ""}>{r.message ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground" title={fmtDate(r.created_at, "dd/MM/yyyy HH:mm")}>{fmtRelative(r.created_at)}</td>
                    <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
