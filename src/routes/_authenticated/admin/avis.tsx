import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareQuote, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, StatCard } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import type { SiteReview } from "@/lib/public.functions";
import { fmtRelative } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/avis")({
  head: () => workspaceHead("Avis du site — Administration"),
  component: AdminSiteReviews,
});

function AdminSiteReviews() {
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-site-reviews"],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as { from: (t: string) => any })
        .from("site_reviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SiteReview[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as unknown as { from: (t: string) => any })
        .from("site_reviews")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avis supprimé");
      qc.invalidateQueries({ queryKey: ["admin-site-reviews"] });
      qc.invalidateQueries({ queryKey: ["site-reviews"] });
      qc.invalidateQueries({ queryKey: ["public-stats"] });
    },
    onError: (e: Error) => toast.error("Suppression impossible", { description: e.message }),
  });

  const avg =
    rows.length > 0
      ? (rows.reduce((sum, r) => sum + Number(r.rating), 0) / rows.length).toFixed(1)
      : "—";

  return (
    <>
      <PageHeader
        title="Avis sur le site"
        subtitle="Consultez et modérez les témoignages publiés sur la page d'accueil de PermiConduit."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total des avis" value={rows.length} icon={MessageSquareQuote} />
        <StatCard label="Note moyenne" value={avg === "—" ? "—" : `${avg}/5`} icon={Star} tone="warning" />
      </div>

      {isLoading ? (
        <p className="py-20 text-center text-muted-foreground">Chargement…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MessageSquareQuote}
          title="Aucun avis pour le moment"
          text="Les avis laissés par les élèves et moniteurs sur le site apparaîtront ici."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-primary">{r.author_name}</p>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {r.author_role}
                    </span>
                    {r.city && (
                      <span className="text-xs text-muted-foreground">· {r.city}</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`size-4 ${i < r.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                      />
                    ))}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {fmtRelative(r.created_at)}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm("Supprimer cet avis ?")) remove.mutate(r.id);
                  }}
                >
                  <Trash2 className="size-4" /> Supprimer
                </Button>
              </div>
              <p className="mt-3 whitespace-pre-line rounded-lg bg-secondary/50 px-3 py-2 text-sm text-foreground">
                {r.comment}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
