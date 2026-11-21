import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Award, CheckCircle2, Clock, Mail, MapPin, MessageCircle, Phone, Star, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoGallery } from "@/components/site/PhotoGallery";
import { drivingCover, completeGallery } from "@/lib/driving-images";
import { isDemoInstructor } from "@/lib/demo-instructors";
import { SiteLayout } from "@/components/site/SiteLayout";
import { InstructorAvatar } from "@/components/site/InstructorCard";
import { EnrollButton } from "@/components/site/EnrollButton";
import { ReportButton } from "@/components/site/ReportButton";
import { instructorQuery } from "@/lib/public-queries";
import { formatDT, telLink, waLink } from "@/lib/format";

export const Route = createFileRoute("/moniteur/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(instructorQuery(params.slug));
    if (!data) throw notFound();
    return { name: `${data.instructor.first_name} ${data.instructor.last_name}`.trim(), city: data.instructor.city, bio: data.instructor.short_bio, cover: data.instructor.cover_url };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Moniteur introuvable — PermiConduit" }, { name: "robots", content: "noindex" }] };
    const title = `${loaderData.name}, moniteur de conduite à ${loaderData.city} — PermiConduit`;
    const desc = loaderData.bio ?? `Découvrez le profil de ${loaderData.name} et demandez votre inscription.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(loaderData.cover?.startsWith("https://") ? [
          { property: "og:image", content: loaderData.cover },
          { name: "twitter:image", content: loaderData.cover },
        ] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container-page py-24 text-center">
        <h1 className="text-3xl font-bold text-primary">Ce moniteur est introuvable</h1>
        <p className="mt-2 text-muted-foreground">Le profil n'existe pas ou n'est pas encore validé.</p>
        <Button asChild className="mt-6"><Link to="/moniteurs">Voir les moniteurs</Link></Button>
      </div>
    </SiteLayout>
  ),
  component: InstructorPage,
});

function InstructorPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(instructorQuery(slug));
  if (!data) return null;
  const { instructor: i, gallery } = data;
  const name = `${i.first_name} ${i.last_name}`.trim();
  const wa = i.whatsapp || i.phone;
  const demo = isDemoInstructor(i.id);

  return (
    <SiteLayout>
      {/* Cover */}
      <section className="relative h-56 overflow-hidden bg-navy-gradient md:h-80">
        <img src={i.cover_url || drivingCover(i.slug)} alt={i.cover_url ? `Auto-école de ${name}` : "Illustration de conduite en Tunisie"} width={1536} height={1024} className="size-full object-cover opacity-90" />
        {!i.cover_url && <span className="absolute bottom-3 right-5 rounded bg-card/95 px-2 py-1 text-xs text-muted-foreground">Illustration</span>}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/10 to-transparent" />
        <div className="container-page absolute inset-x-0 top-5">
          <Button asChild variant="glass" size="sm"><Link to="/moniteurs"><ArrowLeft /> Tous les moniteurs</Link></Button>
        </div>
      </section>

      <section className="container-page relative -mt-20 pb-20">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <InstructorAvatar src={i.avatar_url} name={name} className="size-32 border-4 border-card shadow-card -mt-20 md:size-36" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-bold text-primary md:text-4xl">{name}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-primary">
                    <CheckCircle2 className="size-3.5 text-brand" /> {demo ? "Profil de démonstration · Illustration" : "Partenaire vérifié"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="size-4" /> {i.city}</span>
                  {i.experience_years ? <span className="inline-flex items-center gap-1"><Award className="size-4" /> {i.experience_years} ans d'expérience</span> : null}
                  {i.rating > 0 && <span className="inline-flex items-center gap-1"><Star className="size-4 fill-warning text-warning" /> {Number(i.rating).toFixed(1)}/5</span>}
                  {i.price_per_hour ? <span className="inline-flex items-center gap-1"><Wallet className="size-4" /> dès {formatDT(i.price_per_hour)}/h</span> : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {wa && (
                <Button asChild variant="whatsapp" size="lg">
                  <a href={waLink(wa, `Bonjour ${i.first_name}, je vous contacte via PermiConduit.`)} target="_blank" rel="noreferrer">
                    <MessageCircle /> Contacter
                  </a>
                </Button>
              )}
              {demo ? <Button asChild size="lg"><Link to="/inscription" search={{ type: "eleve" }}>Créer un compte élève</Link></Button> : <EnrollButton instructorId={i.id} instructorName={name} size="lg" variant="hero" />}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-8">
            <Card title="Présentation">
              <p className="whitespace-pre-line leading-relaxed text-foreground/85">{i.bio || i.short_bio}</p>
            </Card>
            <Card title="Services proposés">
              <ul className="grid gap-3 sm:grid-cols-2">
                {i.services.map((s) => (
                  <li key={s} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm font-medium text-primary">
                    <CheckCircle2 className="size-5 text-brand" /> {s}
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Galerie">
              <PhotoGallery photos={completeGallery(gallery)} />
            </Card>
          </div>

          <aside className="space-y-8">
            <Card title="Coordonnées">
              <ul className="space-y-4 text-sm">
                {i.phone && (
                  <li><a href={telLink(i.phone)} className="flex items-center gap-3 hover:text-brand"><IconBox><Phone className="size-4" /></IconBox>{i.phone}</a></li>
                )}
                {wa && (
                  <li><a href={waLink(wa)} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-brand"><IconBox><MessageCircle className="size-4" /></IconBox>WhatsApp</a></li>
                )}
                {i.email && (
                  <li><a href={`mailto:${i.email}`} className="flex items-center gap-3 break-all hover:text-brand"><IconBox><Mail className="size-4" /></IconBox>{i.email}</a></li>
                )}
                <li className="flex items-center gap-3"><IconBox><MapPin className="size-4" /></IconBox>{[i.address, i.city].filter(Boolean).join(", ")}</li>
              </ul>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {i.phone && <Button asChild variant="outline"><a href={telLink(i.phone)}><Phone /> Appeler</a></Button>}
                {wa && <Button asChild variant="whatsapp"><a href={waLink(wa)} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a></Button>}
              </div>
            </Card>
            <Card title="Horaires de disponibilité">
              <ul className="divide-y divide-border text-sm">
                {i.availability.length === 0 && <li className="py-3 text-muted-foreground">Horaires non renseignés.</li>}
                {i.availability.map((a) => (
                  <li key={a.day} className="flex items-center justify-between py-2.5">
                    <span className="font-medium text-primary">{a.day}</span>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Clock className="size-3.5" /> {a.hours}</span>
                  </li>
                ))}
              </ul>
              <p className={`mt-4 rounded-lg px-3 py-2 text-center text-sm font-semibold ${i.accepting_students ? "bg-success-soft text-success" : "bg-warning-soft text-warning-foreground"}`}>
                {i.accepting_students ? "Accepte de nouveaux élèves" : "Complet pour le moment"}
              </p>
            </Card>
            {!demo && <div className="text-center"><ReportButton instructorId={i.id} /></div>}
          </aside>
        </div>
      </section>

    </SiteLayout>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <h2 className="mb-4 text-xl font-bold text-primary">{title}</h2>
      {children}
    </div>
  );
}

function IconBox({ children }: { children: React.ReactNode }) {
  return <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-primary">{children}</span>;
}
