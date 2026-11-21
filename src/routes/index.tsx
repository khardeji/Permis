import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight, BadgeCheck, CalendarCheck, CheckCircle2, MapPin, MessageCircle, Quote, Search,
  ShieldCheck, Star, Wallet, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteLayout } from "@/components/site/SiteLayout";
import { InstructorCard } from "@/components/site/InstructorCard";
import { HowSteps } from "@/components/site/HowSteps";
import { Faq } from "@/components/site/Faq";
import { SectionHeading } from "@/components/site/SectionHeading";
import { instructorsQuery } from "@/lib/public-queries";
import { CITIES } from "@/lib/site";
import { t } from "@/i18n";
import heroImg from "@/assets/hero-driving.jpg";
import { PhotoGallery } from "@/components/site/PhotoGallery";
import { drivingImages } from "@/lib/driving-images";
import { isDemoInstructor } from "@/lib/demo-instructors";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PermiConduit — Trouvez votre moniteur de conduite en Tunisie" },
      { name: "description", content: "Trouvez votre moniteur, avancez vers votre permis. Profils vérifiés, demande d'inscription en ligne, suivi des séances et des paiements." },
      { property: "og:title", content: "PermiConduit — Votre permis commence ici." },
      { property: "og:description", content: "Trouvez votre moniteur de conduite, demandez votre inscription et suivez séances et paiements en ligne." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(instructorsQuery()),
  component: Home,
});

const BENEFITS = [
  { Icon: BadgeCheck, title: "Moniteurs vérifiés", text: "Chaque partenaire est validé par notre équipe avant d'être visible." },
  { Icon: CalendarCheck, title: "Planning en ligne", text: "Vos prochaines séances, horaires et durées toujours à portée de main." },
  { Icon: Wallet, title: "Paiements transparents", text: "Total payé, reste à payer et historique daté de chaque versement." },
  { Icon: MessageCircle, title: "Contact direct", text: "Appelez ou écrivez sur WhatsApp à votre moniteur en un clic." },
  { Icon: ShieldCheck, title: "Données protégées", text: "Chacun n'accède qu'à ses propres informations, en toute sécurité." },
  { Icon: Users, title: "Pour élèves et moniteurs", text: "Un espace dédié et simple pour chacun, sur mobile comme sur ordinateur." },
];

const TESTIMONIALS = [
  { name: "Yasmine B.", city: "Tunis", text: "J'ai trouvé une monitrice près de chez moi en 5 minutes. Voir mes heures et mes paiements dans l'appli me rassure énormément.", rating: 5 },
  { name: "Mehdi T.", city: "Ariana", text: "Fini les carnets papier ! Je sais exactement combien il me reste à payer et quand est ma prochaine séance.", rating: 5 },
  { name: "Sami B.A., moniteur", city: "Tunis", text: "Mon planning et mes encaissements sont enfin organisés. Et mon mini-site m'apporte de nouveaux élèves chaque mois.", rating: 5 },
];

function Home() {
  const { data: instructors } = useSuspenseQuery(instructorsQuery());
  const navigate = useNavigate();
  const [city, setCity] = useState<string>("all");

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-hero">
        <div className="absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_65%)]" />
        <div className="container-page relative grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.05fr_1fr]">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-card/80 px-3 py-1.5 text-xs font-semibold text-primary shadow-soft">
              <span className="size-2 rounded-full bg-brand" /> Votre permis commence ici.
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] text-primary sm:text-5xl lg:text-6xl">
              Trouvez votre moniteur, <span className="text-brand-gradient">avancez vers votre permis.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              PermiConduit vous met en relation avec des moniteurs de conduite partenaires près de chez vous.
              Consultez leur profil, demandez votre inscription et suivez séances et paiements en ligne.
            </p>

            <form
              className="mt-8 flex flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-card sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/moniteurs", search: city === "all" ? {} : { ville: city } });
              }}
            >
              <div className="flex flex-1 items-center gap-2 px-2">
                <MapPin className="size-5 text-brand" />
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="h-11 border-0 shadow-none focus:ring-0" aria-label="Ville">
                    <SelectValue placeholder="Votre ville" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les villes</SelectItem>
                    {CITIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" size="lg" variant="hero">
                <Search /> {t("cta.find")}
              </Button>
            </form>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="outline">
                <Link to="/inscription" search={{ type: "moniteur" }}>
                  {t("cta.partner")} <ArrowRight />
                </Link>
              </Button>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["Inscription gratuite", "Moniteurs vérifiés", "Suivi en temps réel"].map((x) => (
                <li key={x} className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success" /> {x}</li>
              ))}
            </ul>
          </div>

          <div className="relative animate-fade-up [animation-delay:150ms]">
            <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient opacity-20 blur-2xl" />
            <img
              src={heroImg}
              alt="Une élève au volant avec son moniteur de conduite à Tunis"
              width={1600}
              height={1104}
              className="relative aspect-[4/3] w-full rounded-[1.75rem] border-4 border-card object-cover shadow-elevated"
            />
            <div className="absolute -bottom-6 -left-4 hidden animate-float rounded-2xl border border-border bg-card p-4 shadow-card sm:block">
              <p className="text-xs font-medium text-muted-foreground">Prochaine séance</p>
              <p className="mt-0.5 font-display text-lg font-bold text-primary">Demain · 09:00</p>
              <p className="text-xs text-success">Circuit d'examen · 1h30</p>
            </div>
            <div className="absolute -right-3 -top-5 hidden rounded-2xl border border-border bg-card p-4 shadow-card sm:block">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-4 fill-warning text-warning" />)}
              </div>
              <p className="mt-1 text-xs font-semibold text-primary">4,9/5 · élèves satisfaits</p>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-border bg-card">
        <div className="container-page grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
          {[
            ["+150", "moniteurs partenaires"],
            ["+2 400", "élèves accompagnés"],
            ["24", "gouvernorats couverts"],
            ["92 %", "de réussite à l'examen"],
          ].map(([n, l]) => (
            <div key={l} className="text-center">
              <p className="font-display text-3xl font-extrabold text-primary">{n}</p>
              <p className="text-sm text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BENEFITS */}
      <section className="container-page py-20">
        <SectionHeading eyebrow="Pourquoi PermiConduit" title="Tout pour apprendre à conduire sereinement" subtitle="Une plateforme moderne pensée pour les élèves comme pour les moniteurs." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ Icon, title, text }) => (
            <div key={title} className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-card">
              <div className="grid size-12 place-items-center rounded-xl bg-brand-soft text-primary transition group-hover:bg-brand group-hover:text-brand-foreground">
                <Icon className="size-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-primary">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section className="bg-secondary/60 py-20">
        <div className="container-page">
          <SectionHeading eyebrow="Comment ça marche" title="Votre permis en 3 étapes" />
          <div className="mt-12"><HowSteps /></div>
        </div>
      </section>

      {/* INSTRUCTORS */}
      <section className="container-page py-20">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <SectionHeading center={false} eyebrow="Nos moniteurs" title="Des moniteurs partenaires près de chez vous" />
          <Button asChild variant="outline">
            <Link to="/moniteurs">Voir tous les moniteurs <ArrowRight /></Link>
          </Button>
        </div>
        {instructors.some((i) => isDemoInstructor(i.id)) && <p className="mt-5 text-sm text-muted-foreground">Profils de démonstration — les partenaires réels apparaîtront après validation.</p>}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {instructors.slice(0, 6).map((i) => <InstructorCard key={i.id} i={i} />)}
        </div>
      </section>

      <section className="border-y border-border bg-secondary/60 py-16">
        <div className="container-page">
          <SectionHeading eyebrow="Galerie" title="Du code à la conduite" />
          <div className="mt-8"><PhotoGallery photos={drivingImages} /></div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-navy-gradient py-20 text-navy-foreground">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-brand">Témoignages</p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Ils avancent avec PermiConduit</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((tm) => (
              <figure key={tm.name} className="rounded-2xl border border-navy-foreground/10 bg-navy-foreground/5 p-6 backdrop-blur">
                <Quote className="size-8 text-brand" />
                <blockquote className="mt-3 text-navy-foreground/90">« {tm.text} »</blockquote>
                <figcaption className="mt-5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{tm.name}</p>
                    <p className="text-xs text-navy-foreground/60">{tm.city}</p>
                  </div>
                  <div className="flex">
                    {Array.from({ length: tm.rating }).map((_, i) => <Star key={i} className="size-4 fill-warning text-warning" />)}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page grid gap-10 py-20 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <SectionHeading center={false} eyebrow="FAQ" title="Questions fréquentes" subtitle="Vous ne trouvez pas votre réponse ? Écrivez-nous." />
          <Button asChild variant="outline" className="mt-6"><Link to="/contact">Nous contacter</Link></Button>
        </div>
        <Faq />
      </section>

      {/* CTA */}
      <section className="container-page pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-10 text-primary-foreground shadow-elevated md:p-14">
          <div className="absolute -right-20 -top-20 size-72 rounded-full bg-primary-foreground/10" />
          <div className="relative grid items-center gap-6 md:grid-cols-[1.5fr_1fr]">
            <div>
              <h2 className="text-3xl font-bold md:text-4xl">Vous êtes moniteur de conduite ?</h2>
              <p className="mt-3 max-w-xl text-primary-foreground/85">
                Rejoignez PermiConduit : mini-site personnalisé, planning interactif, suivi des élèves et des paiements. Gratuit pendant le lancement.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Button asChild size="lg" variant="glass">
                <Link to="/inscription" search={{ type: "moniteur" }}>{t("cta.partner")} <ArrowRight /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
