import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { InstructorCard } from "@/components/site/InstructorCard";
import { instructorsQuery } from "@/lib/public-queries";
import { CITIES } from "@/lib/site";
import { isDemoInstructor } from "@/lib/demo-instructors";

type Search = { q?: string; ville?: string; dispo?: boolean };

export const Route = createFileRoute("/moniteurs")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    ...(typeof s["q"] === "string" && s["q"] ? { q: s["q"] } : {}),
    ...(typeof s["ville"] === "string" && s["ville"] ? { ville: s["ville"] } : {}),
    ...(s["dispo"] === true || s["dispo"] === "true" ? { dispo: true } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Nos moniteurs de conduite partenaires — PermiConduit" },
      { name: "description", content: "Annuaire des moniteurs de conduite vérifiés en Tunisie : recherchez par ville et disponibilité, consultez les profils et demandez votre inscription." },
      { property: "og:title", content: "Annuaire des moniteurs — PermiConduit" },
      { property: "og:description", content: "Trouvez un moniteur de conduite vérifié près de chez vous." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(instructorsQuery()),
  component: Directory,
});

function Directory() {
  const { data } = useSuspenseQuery(instructorsQuery());
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/moniteurs" });
  const cities = useMemo(() => [...new Set([...CITIES, ...data.map((i) => i.city).filter(Boolean)])].sort(), [data]);

  const list = useMemo(() => {
    const q = (search.q ?? "").toLowerCase().trim();
    return data.filter((i) => {
      if (search.ville && i.city !== search.ville) return false;
      if (search.dispo && !i.accepting_students) return false;
      if (!q) return true;
      return [i.first_name, i.last_name, i.city, i.short_bio, ...(i.services ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [data, search]);

  const set = (patch: { [K in keyof Search]: Search[K] | undefined }) =>
    navigate({
      search: (prev) =>
        Object.fromEntries(
          Object.entries({ ...prev, ...patch }).filter(([, v]) => v !== undefined),
        ) as Search,
      replace: true,
    });
  const hasFilters = !!(search.q || search.ville || search.dispo);

  return (
    <SiteLayout>
      <PageHero eyebrow="Annuaire" title="Nos moniteurs partenaires" subtitle="Des professionnels vérifiés, prêts à vous accompagner jusqu'au permis." />
      <section className="container-page -mt-8 pb-20">
        <div className="relative z-10 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card md:grid-cols-[1.6fr_1fr_auto_auto] md:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search.q ?? ""}
              onChange={(e) => set({ q: e.target.value || undefined })}
              placeholder="Nom, service (moto, boîte auto…)"
              className="h-11 pl-9"
            />
          </div>
          <Select value={search.ville ?? "all"} onValueChange={(v) => set({ ville: v === "all" ? undefined : v })}>
            <SelectTrigger className="h-11" aria-label="Ville"><SelectValue placeholder="Ville" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex h-11 items-center gap-2 rounded-lg border border-input px-3 text-sm font-medium">
            <Switch checked={!!search.dispo} onCheckedChange={(v) => set({ dispo: v || undefined })} />
            Disponibles uniquement
          </label>
          {hasFilters ? (
            <Button variant="ghost" onClick={() => navigate({ search: {}, replace: true })}><X /> Effacer</Button>
          ) : (
            <span className="hidden items-center gap-1 px-2 text-sm text-muted-foreground md:flex"><SlidersHorizontal className="size-4" /> Filtres</span>
          )}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          <span className="font-semibold text-primary">{list.length}</span> moniteur{list.length > 1 ? "s" : ""} trouvé{list.length > 1 ? "s" : ""}
        </p>
        {data.some((i) => isDemoInstructor(i.id)) && <p className="mt-2 text-sm text-muted-foreground">Profils de démonstration avec illustrations. Aucune inscription n’est envoyée à ces profils.</p>}
        {list.length ? (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((i) => <InstructorCard key={i.id} i={i} />)}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <p className="font-semibold text-primary">Aucun moniteur ne correspond à votre recherche.</p>
            <p className="mt-1 text-sm text-muted-foreground">Essayez une autre ville ou retirez un filtre.</p>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
