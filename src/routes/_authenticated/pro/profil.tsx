import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Panel } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { CITIES } from "@/lib/site";
import { uploadMedia } from "@/lib/storage";
import { useMyInstructor } from "../pro";

export const Route = createFileRoute("/_authenticated/pro/profil")({
  head: () => workspaceHead("Mon profil — Espace Moniteur"),
  component: ProfilePage,
});

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const SERVICE_SUGGESTIONS = ["Permis B", "Conduite accompagnée", "Perfectionnement", "Code de la route", "Moto", "Boîte automatique"];

type Availability = { day: string; hours: string }[];

function ProfilePage() {
  const { data: instructor, isLoading } = useMyInstructor();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [city, setCity] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<boolean | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const { data: gallery = [] } = useQuery({
    queryKey: ["my-gallery", instructor?.id],
    enabled: !!instructor,
    queryFn: async () => {
      const { data } = await supabase.from("galleries").select("*").eq("instructor_id", instructor!.id).order("position");
      return data ?? [];
    },
  });

  if (isLoading) return <p className="py-20 text-center text-muted-foreground">Chargement…</p>;
  if (!instructor) return <p className="py-20 text-center text-muted-foreground">Profil moniteur introuvable.</p>;

  const availability = (Array.isArray(instructor.availability) ? instructor.availability : []) as unknown as Availability;
  const currentCity = city ?? instructor.city;
  const currentAccepting = accepting ?? instructor.accepting_students;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const services = String(f.get("services"))
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
    const avail: Availability = DAYS.map((day) => ({
      day,
      hours: String(f.get(`avail_${day}`)).trim(),
    })).filter((a) => a.hours);
    setBusy(true);
    const { error } = await supabase
      .from("instructors")
      .update({
        first_name: String(f.get("first_name")).trim(),
        last_name: String(f.get("last_name")).trim(),
        phone: String(f.get("phone")).trim() || null,
        whatsapp: String(f.get("whatsapp")).trim() || null,
        email: String(f.get("email")).trim() || null,
        address: String(f.get("address")).trim() || null,
        city: currentCity,
        short_bio: String(f.get("short_bio")).trim() || null,
        bio: String(f.get("bio")).trim() || null,
        experience_years: Number(f.get("experience_years")) || null,
        price_per_hour: Number(f.get("price_per_hour")) || null,
        services,
        availability: avail,
        accepting_students: currentAccepting,
        updated_at: new Date().toISOString(),
      })
      .eq("id", instructor!.id);
    setBusy(false);
    if (error) {
      toast.error("Enregistrement impossible", { description: error.message });
      return;
    }
    toast.success("Profil mis à jour", { description: "Les changements sont visibles sur votre page publique." });
    qc.invalidateQueries({ queryKey: ["my-instructor"] });
  }

  async function upload(file: File, kind: "avatar" | "cover" | "gallery") {
    try {
      const url = await uploadMedia(file, kind);
      if (kind === "gallery") {
        const { error } = await supabase.from("galleries").insert({ instructor_id: instructor!.id, image_url: url, position: gallery.length });
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["my-gallery"] });
      } else {
        const { error } = await supabase
          .from("instructors")
          .update(kind === "avatar" ? { avatar_url: url } : { cover_url: url })
          .eq("id", instructor!.id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["my-instructor"] });
      }
      toast.success("Image ajoutée");
    } catch (err) {
      toast.error("Envoi impossible", { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function removeGallery(id: string) {
    const { error } = await supabase.from("galleries").delete().eq("id", id);
    if (error) {
      toast.error("Suppression impossible", { description: error.message });
      return;
    }
    qc.invalidateQueries({ queryKey: ["my-gallery"] });
  }

  return (
    <>
      <PageHeader title="Mon profil" subtitle="Ces informations apparaissent sur votre page publique." />
      <form onSubmit={save} className="grid gap-6 lg:grid-cols-2">
        <Panel title="Identité et contact" className="lg:row-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prénom</Label>
              <Input id="first_name" name="first_name" defaultValue={instructor.first_name} required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nom</Label>
              <Input id="last_name" name="last_name" defaultValue={instructor.last_name} required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Ville</Label>
              <Select value={currentCity} onValueChange={setCity}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" name="address" defaultValue={instructor.address ?? ""} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" name="phone" defaultValue={instructor.phone ?? ""} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" name="whatsapp" defaultValue={instructor.whatsapp ?? ""} placeholder="+216 …" className="h-11" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email public</Label>
              <Input id="email" name="email" type="email" defaultValue={instructor.email ?? ""} className="h-11" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="short_bio">Accroche (courte)</Label>
              <Input id="short_bio" name="short_bio" defaultValue={instructor.short_bio ?? ""} maxLength={160} placeholder="Ex. Moniteur patient, 10 ans d'expérience à Tunis" className="h-11" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bio">Présentation détaillée</Label>
              <Textarea id="bio" name="bio" defaultValue={instructor.bio ?? ""} rows={5} maxLength={3000} />
            </div>
          </div>
        </Panel>

        <Panel title="Services et tarifs">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="experience_years">Années d'expérience</Label>
              <Input id="experience_years" name="experience_years" type="number" min="0" defaultValue={instructor.experience_years ?? ""} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_per_hour">Tarif horaire (DT)</Label>
              <Input id="price_per_hour" name="price_per_hour" type="number" min="0" step="0.5" defaultValue={instructor.price_per_hour ?? ""} className="h-11" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="services">Services (séparés par des virgules)</Label>
              <Input id="services" name="services" defaultValue={instructor.services.join(", ")} placeholder={SERVICE_SUGGESTIONS.join(", ")} className="h-11" />
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 sm:col-span-2">
              <span className="text-sm font-medium text-primary">J'accepte de nouveaux élèves</span>
              <Switch checked={currentAccepting} onCheckedChange={setAccepting} />
            </label>
          </div>
        </Panel>

        <Panel title="Disponibilités">
          <div className="grid gap-3">
            {DAYS.map((day) => (
              <div key={day} className="grid grid-cols-[90px_1fr] items-center gap-3">
                <Label htmlFor={`avail_${day}`} className="text-sm">{day}</Label>
                <Input
                  id={`avail_${day}`}
                  name={`avail_${day}`}
                  defaultValue={availability.find((a) => a.day === day)?.hours ?? ""}
                  placeholder="Ex. 09:00–12:00, 14:00–18:00"
                  className="h-10"
                />
              </div>
            ))}
          </div>
        </Panel>

        <div className="lg:col-span-2">
          <Button type="submit" size="lg" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Enregistrer le profil</Button>
        </div>
      </form>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Photos de profil et de couverture">
          <div className="flex flex-wrap items-center gap-6">
            <div className="text-center">
              <button type="button" onClick={() => avatarRef.current?.click()} className="group relative block size-24 overflow-hidden rounded-full border border-border bg-secondary">
                {instructor.avatar_url ? <img src={instructor.avatar_url} alt="Photo de profil" className="size-full object-cover" /> : <ImagePlus className="mx-auto mt-8 size-8 text-muted-foreground" />}
              </button>
              <p className="mt-2 text-xs text-muted-foreground">Photo de profil</p>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "avatar")} />
            </div>
            <div className="text-center">
              <button type="button" onClick={() => coverRef.current?.click()} className="group relative block h-24 w-48 overflow-hidden rounded-xl border border-border bg-secondary">
                {instructor.cover_url ? <img src={instructor.cover_url} alt="Couverture" className="size-full object-cover" /> : <ImagePlus className="mx-auto mt-8 size-8 text-muted-foreground" />}
              </button>
              <p className="mt-2 text-xs text-muted-foreground">Photo de couverture</p>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "cover")} />
            </div>
          </div>
        </Panel>

        <Panel
          title="Galerie photos"
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => galleryRef.current?.click()}>
              <ImagePlus /> Ajouter
            </Button>
          }
        >
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "gallery")} />
          {gallery.length === 0 ? (
            <p className="text-sm text-muted-foreground">Montrez votre voiture, votre salle de code, vos élèves réussis…</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {gallery.map((g) => (
                <div key={g.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                  <img src={g.image_url} alt={g.caption ?? "Photo de la galerie"} className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeGallery(g.id)}
                    className="absolute right-1.5 top-1.5 rounded-md bg-background/80 p-1.5 opacity-0 transition group-hover:opacity-100"
                    title="Supprimer"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
