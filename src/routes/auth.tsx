import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/site/AuthShell";
import { OrDivider, SocialButtons } from "@/components/site/SocialButtons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, safeRedirect } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string; mode?: "forgot" } => ({
    ...(typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {}),
    ...(s["mode"] === "forgot" ? { mode: "forgot" as const } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Connexion — PermiConduit" },
      { name: "description", content: "Connectez-vous à votre espace élève, moniteur ou administrateur PermiConduit." },
      { property: "og:title", content: "Connexion — PermiConduit" },
      { property: "og:description", content: "Accédez à votre espace PermiConduit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [busy, setBusy] = useState(false);

  const goNext = () => {
    const to = safeRedirect(search["redirect"]);
    if (to) window.location.assign(to);
    else navigate({ to: "/espace", replace: true });
  };

  useEffect(() => {
    if (ready && user) goNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user]);

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(f.get("email")).trim(),
      password: String(f.get("password")),
    });
    setBusy(false);
    if (error) {
      toast.error("Identifiants incorrects", { description: "Vérifiez votre email et votre mot de passe." });
      return;
    }
    toast.success("Bienvenue !");
  }

  async function forgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) {
      toast.error("Envoi impossible", { description: error.message });
      return;
    }
    toast.success("Email envoyé", { description: "Suivez le lien reçu pour choisir un nouveau mot de passe." });
  }

  if (search["mode"] === "forgot") {
    return (
      <AuthShell title="Mot de passe oublié" subtitle="Recevez un lien pour réinitialiser votre mot de passe.">
        <form onSubmit={forgot} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required className="h-11" /></div>
          <Button type="submit" className="h-11 w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Envoyer le lien</Button>
        </form>
        <p className="mt-6 text-center text-sm"><Link to="/auth" className="font-semibold text-primary hover:text-brand">← Retour à la connexion</Link></p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Bon retour 👋" subtitle="Connectez-vous à votre espace PermiConduit.">
      <SocialButtons onSignedIn={goNext} />
      <OrDivider />
      <form onSubmit={login} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required className="h-11" /></div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link to="/auth" search={{ mode: "forgot" as const }} className="text-xs font-medium text-muted-foreground hover:text-primary">Mot de passe oublié ?</Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-11" />
        </div>
        <Button type="submit" className="h-11 w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Se connecter</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Pas encore de compte ? <Link to="/inscription" className="font-semibold text-primary hover:text-brand">Créer un compte</Link>
      </p>
    </AuthShell>
  );
}
