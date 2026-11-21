import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquarePlus, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/lib/auth";
import type { InstructorReview, SiteReview } from "@/lib/public.functions";

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Note sur 5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
          aria-checked={value === n}
          role="radio"
          className="rounded p-1 transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Star className={`size-6 ${n <= value ? "fill-warning text-warning" : "text-muted-foreground/40"}`} />
        </button>
      ))}
      <span className="ml-2 text-sm font-semibold">{value}/5</span>
    </div>
  );
}

export function SiteReviewForm({ reviews }: { reviews: SiteReview[] }) {
  const { user } = useAuth();
  const { data: roles } = useRoles();
  const qc = useQueryClient();

  const existing = user ? reviews.find((r) => r.user_id === user.id) : undefined;

  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [city, setCity] = useState(existing?.city ?? "");
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile-for-review", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, city")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (existing) {
      setRating(existing.rating);
      setComment(existing.comment);
      setCity(existing.city ?? "");
    } else if (profile?.city && !city) {
      setCity(profile.city);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, profile?.city]);

  if (!user) {
    return (
      <div className="mt-10 rounded-2xl border border-navy-foreground/15 bg-navy-foreground/5 p-6 text-center backdrop-blur">
        <p className="font-semibold text-navy-foreground">Vous utilisez PermiConduit ?</p>
        <p className="mt-1 text-sm text-navy-foreground/75">
          Connectez-vous pour partager votre avis sur la plateforme.
        </p>
        <Button asChild variant="glass" className="mt-4">
          <Link to="/auth">
            <MessageSquarePlus /> Se connecter pour laisser un avis
          </Link>
        </Button>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const trimmed = comment.trim();
    if (trimmed.length < 5) {
      toast.error("Veuillez écrire un avis d'au moins 5 caractères.");
      return;
    }
    setSaving(true);
    try {
      const roleLabel = roles?.includes("instructor")
        ? "Moniteur"
        : roles?.includes("admin")
          ? "Équipe"
          : "Élève";
      const authorName =
        profile?.full_name?.trim() ||
        (user.user_metadata?.["full_name"] as string | undefined)?.trim() ||
        user.email?.split("@")[0] ||
        "Utilisateur";

      const { error } = await (supabase as unknown as { from: (t: string) => any })
        .from("site_reviews")
        .upsert(
          {
            user_id: user.id,
            author_name: authorName,
            author_role: roleLabel,
            city: city.trim() || null,
            rating,
            comment: trimmed,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      if (error) throw error;
      toast.success(existing ? "Votre avis a été mis à jour." : "Merci ! Votre avis a été publié.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["site-reviews"] }),
        qc.invalidateQueries({ queryKey: ["public-stats"] }),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'enregistrer votre avis.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto mt-10 max-w-2xl rounded-2xl border border-navy-foreground/15 bg-navy-foreground/5 p-6 text-left backdrop-blur"
    >
      <h3 className="text-lg font-bold text-navy-foreground">
        {existing ? "Modifier votre avis sur PermiConduit" : "Donner votre avis sur PermiConduit"}
      </h3>
      <div className="mt-4 space-y-4">
        <div>
          <Label className="text-navy-foreground/90">Votre note</Label>
          <div className="mt-1.5 text-navy-foreground">
            <StarPicker value={rating} onChange={setRating} />
          </div>
        </div>
        <div>
          <Label htmlFor="site-review-city" className="text-navy-foreground/90">
            Ville (optionnel)
          </Label>
          <Input
            id="site-review-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex. Tunis, Ariana, Sfax…"
            className="mt-1.5 border-navy-foreground/20 bg-navy-foreground/10 text-navy-foreground placeholder:text-navy-foreground/50"
          />
        </div>
        <div>
          <Label htmlFor="site-review-comment" className="text-navy-foreground/90">
            Votre commentaire
          </Label>
          <Textarea
            id="site-review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            required
            placeholder="Partagez votre expérience avec PermiConduit…"
            className="mt-1.5 border-navy-foreground/20 bg-navy-foreground/10 text-navy-foreground placeholder:text-navy-foreground/50"
          />
        </div>
        <Button type="submit" variant="brand" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <MessageSquarePlus />}
          {existing ? "Mettre à jour mon avis" : "Publier mon avis"}
        </Button>
      </div>
    </form>
  );
}

export function InstructorReviewsSection({
  instructorId,
  instructorSlug,
  reviews,
}: {
  instructorId: string;
  instructorSlug: string;
  reviews: InstructorReview[];
}) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: canReview = false } = useQuery({
    queryKey: ["can-review-instructor", instructorId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("id")
        .eq("instructor_id", instructorId)
        .eq("user_id", user!.id)
        .limit(1);
      return (data?.length ?? 0) > 0;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["my-profile-for-review", user?.id],
    enabled: !!user && canReview,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const existing = user ? reviews.find((r) => r.student_user_id === user.id) : undefined;
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setRating(existing.rating);
      setComment(existing.comment);
    }
  }, [existing]);

  const avg =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length
      : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !canReview) return;
    const trimmed = comment.trim();
    if (trimmed.length < 5) {
      toast.error("Veuillez écrire un avis d'au moins 5 caractères.");
      return;
    }
    setSaving(true);
    try {
      const authorName =
        profile?.full_name?.trim() ||
        (user.user_metadata?.["full_name"] as string | undefined)?.trim() ||
        user.email?.split("@")[0] ||
        "Élève";

      const { error } = await (supabase as unknown as { from: (t: string) => any })
        .from("instructor_reviews")
        .upsert(
          {
            instructor_id: instructorId,
            student_user_id: user.id,
            author_name: authorName,
            rating,
            comment: trimmed,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "instructor_id,student_user_id" },
        );
      if (error) throw error;
      toast.success(existing ? "Votre avis a été mis à jour." : "Merci ! Votre avis a été publié.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["public-instructor", instructorSlug] }),
        qc.invalidateQueries({ queryKey: ["public-instructors"] }),
        qc.invalidateQueries({ queryKey: ["public-stats"] }),
        qc.invalidateQueries({ queryKey: ["instructor-reviews-inline", instructorId] }),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'enregistrer votre avis.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {avg !== null ? (
          <div className="flex items-center gap-2">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Star
                  key={idx}
                  className={`size-4 ${idx < Math.round(avg) ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                />
              ))}
            </div>
            <span className="font-semibold text-primary">{avg.toFixed(1)}/5</span>
            <span className="text-sm text-muted-foreground">
              ({reviews.length} avis)
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun avis pour le moment.</p>
        )}
      </div>

      {canReview ? (
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-secondary/40 p-4">
          <p className="text-sm font-semibold text-primary">
            {existing ? "Modifier votre avis sur ce moniteur" : "Laisser un avis sur votre moniteur"}
          </p>
          <div>
            <Label>Votre note</Label>
            <div className="mt-1">
              <StarPicker value={rating} onChange={setRating} />
            </div>
          </div>
          <div>
            <Label htmlFor={`inst-review-${instructorId}`}>Votre commentaire</Label>
            <Textarea
              id={`inst-review-${instructorId}`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              required
              placeholder="Comment se passe votre formation avec ce moniteur ?"
              className="mt-1 bg-card"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <MessageSquarePlus />}
            {existing ? "Mettre à jour mon avis" : "Publier mon avis"}
          </Button>
        </form>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-3 text-xs text-muted-foreground">
          {user
            ? "Seuls les élèves inscrits auprès de ce moniteur peuvent publier un avis."
            : "Seuls les élèves de ce moniteur peuvent publier un avis. Connectez-vous si vous êtes son élève."}
        </p>
      )}

      {reviews.length > 0 && (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-primary">{r.author_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("fr-TN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`size-4 ${idx < r.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-2.5 whitespace-pre-line text-sm text-foreground/85">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
