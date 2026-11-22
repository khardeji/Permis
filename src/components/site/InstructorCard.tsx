import { Link } from "@tanstack/react-router";
import { MapPin, Star, Award, ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicInstructor } from "@/lib/public.functions";
import { initials } from "@/lib/format";
import { t } from "@/i18n";
import { drivingCover } from "@/lib/driving-images";
import { isDemoInstructor } from "@/lib/demo-instructors";

export function InstructorAvatar({ src, name, className = "size-16" }: { src?: string | null; name: string; className?: string }) {
  return src ? (
    <img src={src} alt={name} loading="lazy" className={`${className} rounded-2xl object-cover`} />
  ) : (
    <span className={`${className} grid place-items-center rounded-2xl bg-primary-soft font-display text-lg font-bold text-primary`}>
      {initials(name)}
    </span>
  );
}

export function InstructorCard({ i }: { i: PublicInstructor }) {
  const name = `${i.first_name} ${i.last_name}`.trim();
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={i.avatar_url || i.cover_url || drivingCover(i.slug)}
            alt={i.avatar_url ? name : "Illustration de l’apprentissage de la conduite"}
            loading="lazy"
            width={816}
            height={816}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        {(isDemoInstructor(i.id) || (!i.avatar_url && !i.cover_url)) && <span className="absolute bottom-3 left-3 rounded bg-card/95 px-2 py-1 text-xs text-muted-foreground">{isDemoInstructor(i.id) ? "Profil de démonstration · Illustration" : "Illustration"}</span>}
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur ${
            i.accepting_students ? "bg-success-soft/95 text-success" : "bg-warning-soft/95 text-warning-foreground"
          }`}
        >
          {i.accepting_students ? "Disponible" : "Complet"}
        </span>
        {i.rating > 0 && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-xs font-bold text-primary backdrop-blur">
          <Star className="size-3.5 fill-warning text-warning" /> {Number(i.rating).toFixed(1)}
        </span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-primary">{name}</h3>
        {i.driving_school_name && (
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-brand">
            <Building2 className="size-3.5 shrink-0" /> {i.driving_school_name}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {i.city}</span>
          {i.experience_years ? (
            <span className="inline-flex items-center gap-1"><Award className="size-3.5" /> {i.experience_years} ans d'expérience</span>
          ) : null}
        </div>
        <p className="mt-3 line-clamp-2 flex-1 text-sm text-foreground/80">{i.short_bio}</p>
        <Button asChild variant="outline" className="mt-5 w-full group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
          <Link to="/moniteur/$slug" params={{ slug: i.slug }}>
            {t("cta.profile")} <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
