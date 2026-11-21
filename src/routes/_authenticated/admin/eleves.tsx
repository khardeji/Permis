import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { PageHeader, StatusBadge } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { formatDT, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/eleves")({
  head: () => workspaceHead("Élèves — Administration"),
  component: AdminStudents,
});

function AdminStudents() {
  const [q, setQ] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, city, phone, license_type, agreed_price, status, created_at, instructors(first_name, last_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = rows.filter((s) =>
    `${s.full_name} ${s.city ?? ""} ${(s.instructors as { first_name: string; last_name: string } | null)?.last_name ?? ""}`
      .toLowerCase()
      .includes(q.toLowerCase().trim()),
  );

  return (
    <>
      <PageHeader title="Élèves" subtitle="Tous les élèves inscrits sur la plateforme." />
      <div className="mb-4 max-w-sm">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un élève…" className="h-11" />
      </div>
      {isLoading ? (
        <p className="py-20 text-center text-muted-foreground">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Élève</th>
                <th className="px-5 py-3 font-medium">Moniteur</th>
                <th className="px-5 py-3 font-medium">Permis</th>
                <th className="px-5 py-3 font-medium">Prix convenu</th>
                <th className="px-5 py-3 font-medium">Inscrit le</th>
                <th className="px-5 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const inst = s.instructors as { first_name: string; last_name: string } | null;
                return (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-primary">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground">{[s.phone, s.city].filter(Boolean).join(" · ")}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{inst ? `${inst.first_name} ${inst.last_name}` : "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{s.license_type}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDT(s.agreed_price)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{fmtDate(s.created_at)}</td>
                    <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">Aucun élève trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
