import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { fmtRelative } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  head: () => workspaceHead("Messages — Administration"),
  component: AdminMessages,
});

function AdminMessages() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <>
      <PageHeader title="Messages de contact" subtitle="Les messages envoyés depuis la page Contact du site." />
      {isLoading ? (
        <p className="py-20 text-center text-muted-foreground">Chargement…</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Mail} title="Aucun message" text="Les messages du formulaire de contact apparaîtront ici." />
      ) : (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li key={m.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-primary">{m.name}{m.subject ? ` — ${m.subject}` : ""}</p>
                <p className="text-sm text-muted-foreground">{fmtRelative(m.created_at)}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                <a href={`mailto:${m.email}`} className="hover:text-brand">{m.email}</a>
                {m.phone ? ` · ${m.phone}` : ""}
              </p>
              <p className="mt-2 whitespace-pre-line rounded-lg bg-secondary/50 px-3 py-2 text-sm text-foreground">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
