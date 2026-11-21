import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, ClipboardList, LayoutDashboard, Wallet, Globe, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { HowSteps } from "@/components/site/HowSteps";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Faq } from "@/components/site/Faq";

export const Route = createFileRoute("/comment-ca-marche")({
  head: () => ({
    meta: [
      { title: "Comment ça marche — PermiConduit" },
      { name: "description", content: "Choisissez un moniteur, envoyez votre demande d'inscription et suivez vos séances et paiements en ligne. Découvrez aussi l'espace moniteur." },
      { property: "og:title", content: "Comment fonctionne PermiConduit" },
      { property: "og:description", content: "3 étapes pour trouver votre moniteur et suivre votre progression vers le permis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowPage,
});

const PRO = [
  { Icon: Globe, title: "Mini-site personnalisé", text: "Votre page publique avec photos, services, horaires, téléphone et WhatsApp." },
  { Icon: ClipboardList, title: "Demandes d'inscription", text: "Acceptez ou refusez les demandes en un clic ; l'élève est automatiquement associé." },
  { Icon: CalendarDays, title: "Planning interactif", text: "Vues jour, semaine et mois. Ajoutez, modifiez ou annulez vos séances." },
  { Icon: Wallet, title: "Dossier financier", text: "Enregistrez chaque versement : total payé et reste à payer calculés automatiquement." },
  { Icon: LayoutDashboard, title: "Tableau de bord", text: "Élèves, heures, revenus et prochaines séances en un coup d'œil." },
  { Icon: Bell, title: "Notifications", text: "Soyez prévenu à chaque nouvelle demande d'inscription." },
];

function HowPage() {
  return (
    <SiteLayout>
      <PageHero eyebrow="Comment ça marche" title="Du premier contact jusqu'au permis" subtitle="PermiConduit simplifie la relation entre élèves et moniteurs de conduite." />
      <section className="container-page py-16">
        <SectionHeading eyebrow="Pour les élèves" title="Votre parcours en 3 étapes" />
        <div className="mt-12"><HowSteps /></div>
        <div className="mt-10 text-center">
          <Button asChild size="lg" variant="hero"><Link to="/moniteurs">Trouver un moniteur <ArrowRight /></Link></Button>
        </div>
      </section>
      <section className="bg-secondary/60 py-20">
        <div className="container-page">
          <SectionHeading eyebrow="Pour les moniteurs" title="Un outil de gestion complet, gratuit au lancement" />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PRO.map(({ Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground"><Icon className="size-5" /></div>
                <h3 className="mt-4 font-bold text-primary">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild size="lg" variant="brand"><Link to="/inscription" search={{ type: "moniteur" }}>Devenir partenaire <ArrowRight /></Link></Button>
          </div>
        </div>
      </section>
      <section className="container-page max-w-3xl py-20">
        <SectionHeading title="Questions fréquentes" />
        <div className="mt-10"><Faq /></div>
      </section>
    </SiteLayout>
  );
}
