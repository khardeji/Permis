import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { GraduationCap, Loader2, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuthShell } from "@/components/site/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { instructorsQuery } from "@/lib/public-queries";
import { CITIES } from "@/lib/site";
import { cn } from "@/lib/utils";
import { isDemoInstructor } from "@/lib/demo-instructors";

type Search = { type?: "eleve" | "moniteur"; moniteur?: string };

export const Route = createFileRoute("/inscription")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    ...(s["type"] === "moniteur" ? { type: "moniteur" as const } : s["type"] === "eleve" ? { type: "eleve" as const } : {}),
    ...(typeof s["moniteur"] === "string" ? { moniteur: s["moniteur"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Créer un compte — PermiConduit" },
      { name: "description", content: "Inscrivez-vous gratuitement comme élève pour trouver votre moniteur, ou comme moniteur pour rejoindre le réseau PermiConduit." },
      { property: "og:title", content: "Inscription — PermiConduit" },
      { property: "og:description", content: "Créez votre compte élève ou moniteur en une minute." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(instructorsQuery()),
  component: Signup,
});

const schema = z.object({
  full_name: z.string().trim().min(3, "Indiquez votre nom et prénom").max(120),
  phone: z.string().trim().min(8, "Téléphone invalide").max(30),
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum").max(72),
  city: z.string().trim().min(2, "Choisissez votre ville").max(80),
});

function Signup() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data: instructors } = useSuspenseQuery(instructorsQuery());
  const [type, setType] = useState<"eleve" | "moniteur">(search["type"] ?? "eleve");
  const [city, setCity] = useState("");
  const [desired, setDesired] = useState<string>(search["moniteur"] ?? "none");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = schema.safeParse({ ...raw, city });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone,
          city: parsed.data.city,
          account_type: type === "moniteur" ? "instructor" : "student",
          desired_instructor_id: type === "eleve" && desired !== "none" ? desired : "",
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error("Inscription impossible", {
        description: error.message.includes("registered") ? "Un compte existe déjà avec cet email." : error.message,
      });
      return;
    }
    if (data.session) {
      await supabase.auth.signOut();
    }
    toast.success("Compte créé !", {
      description: "Vérifiez votre boîte mail pour confirmer votre adresse puis connectez-vous.",
    });
    navigate({
      to: "/auth",
      search: { checkEmail: true, email: parsed.data.email },
      replace: true,
    });
  }

  return (
    <AuthShell
      title="Créer un compte"
      subtitle={type === "moniteur" ? "Rejoignez le réseau des moniteurs partenaires." : "Trouvez votre moniteur et suivez votre progression."}
    >
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1.5">
        {([
          ["eleve", "Je suis élève", GraduationCap],
          ["moniteur", "Je suis moniteur", Car],
        ] as const).map(([v, label, Icon]) => (
          <button
            key={v}
            type="button"
            onClick={() => setType(v)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition",
              type === v ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-primary",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <F label="Nom et prénom" name="full_name" autoComplete="name" className="sm:col-span-2" />
        <F label="Téléphone" name="phone" type="tel" autoComplete="tel" placeholder="+216 …" />
        <div className="space-y-2">
          <Label>Ville</Label>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <F label="Email" name="email" type="email" autoComplete="email" className="sm:col-span-2" />
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="password">Mot de passe</Label>
          <PasswordInput id="password" name="password" autoComplete="new-password" required className="h-11" />
        </div>
        {type === "eleve" && (
          <div className="space-y-2 sm:col-span-2">
            <Label>Moniteur souhaité</Label>
            <Select value={desired} onValueChange={setDesired}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Je choisirai plus tard</SelectItem>
                {instructors.filter((i) => !isDemoInstructor(i.id) && (i.accepting_students || i.id === desired)).map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.first_name} {i.last_name} — {i.city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Une demande d'inscription lui sera envoyée automatiquement.</p>
          </div>
        )}
        {type === "moniteur" && (
          <p className="rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-primary sm:col-span-2">
            Votre profil sera visible dans l'annuaire après validation par l'équipe PermiConduit. Vous pouvez déjà utiliser votre tableau de bord.
          </p>
        )}
        <Button type="submit" className="h-11 sm:col-span-2" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Créer mon compte
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Déjà inscrit ? <Link to="/auth" className="font-semibold text-primary hover:text-brand">Se connecter</Link>
      </p>
    </AuthShell>
  );
}

function F({ label, name, className, ...rest }: { label: string; name: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} required className="h-11" {...rest} />
    </div>
  );
}
