import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartHandshake, ShieldCheck, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import lesson from "@/assets/driving-lesson.jpg";

export const Route = createFileRoute("/a-propos")({
  head: () => ({
    meta: [
      { title: "À propos de PermiConduit" },
      { name: "description", content: "PermiConduit est la plateforme tunisienne qui rapproche élèves et moniteurs de conduite, avec transparence et simplicité." },
      { property: "og:title", content: "À propos — PermiConduit" },
      { property: "og:description", content: "Notre mission : rendre l'apprentissage de la conduite plus simple, plus transparent et plus sûr." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

const VALUES = [
  { Icon: Target, title: "Simplicité", text: "Des outils clairs, utilisables par tous, sur mobile comme sur ordinateur." },
  { Icon: ShieldCheck, title: "Confiance", text: "Des moniteurs vérifiés et des données protégées, accessibles uniquement à leurs propriétaires." },
  { Icon: HeartHandshake, title: "Proximité", text: "Nous valorisons le lien humain entre l'élève et son moniteur." },
  { Icon: Sparkles, title: "Transparence", text: "Heures, séances et paiements visibles en temps réel, sans surprise." },
];

function About() {
  return (
    <SiteLayout>
      <PageHero eyebrow="À propos" title="Rendre le permis plus simple pour tous" subtitle="PermiConduit est né d'un constat : trouver un bon moniteur et suivre sa formation restait compliqué, entre carnets papier et messages éparpillés." />
      <section className="container-page grid items-center gap-12 py-16 lg:grid-cols-2">
        <img src={lesson} alt="Illustration d’une séance de conduite en Tunisie" loading="lazy" width={1536} height={1024} className="aspect-[4/3] w-full rounded-3xl object-cover shadow-card" />
        <div>
          <h2 className="text-3xl font-bold text-primary">Notre mission</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Nous connectons les élèves aux moniteurs de conduite indépendants et aux auto-écoles partout en Tunisie.
            Chaque moniteur dispose d'un mini-site et d'un tableau de bord complet ; chaque élève suit sa progression et ses paiements en toute transparence.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Notre ambition : devenir la référence de l'apprentissage de la conduite, en français, en arabe et en anglais.
          </p>
          <Button asChild className="mt-6" variant="hero" size="lg"><Link to="/moniteurs">Découvrir nos moniteurs</Link></Button>
        </div>
      </section>
      <section className="bg-secondary/60 py-20">
        <div className="container-page grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(({ Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <Icon className="size-8 text-brand" />
              <h3 className="mt-4 text-lg font-bold text-primary">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
