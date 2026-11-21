import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/site/AuthShell";
import { OrDivider, SocialButtons } from "@/components/site/SocialButtons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, safeRedirect, REMEMBER_EMAIL_KEY, SESSION_ONLY_KEY, ACTIVE_SESSION_KEY } from "@/lib/auth";

type AuthSearch = {
  redirect?: string;
  mode?: "forgot";
  checkEmail?: boolean;
  email?: string;
};

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): AuthSearch => ({
    ...(typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {}),
    ...(s["mode"] === "forgot" ? { mode: "forgot" as const } : {}),
    ...(s["checkEmail"] === true || s["checkEmail"] === "true" || s["checkEmail"] === "1"
      ? { checkEmail: true }
      : {}),
    ...(typeof s["email"] === "string" && s["email"] ? { email: s["email"] } : {}),
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
  const [email, setEmail] = useState(search.email ?? "");
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (search.email) {
      setEmail(search.email);
      return;
    }
    try {
      const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    } catch {
      // ignore storage errors
    }
  }, [search.email]);

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
    const trimmedEmail = String(f.get("email")).trim();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: String(f.get("password")),
    });
    setBusy(false);
    if (error) {
      const needsConfirm = error.message.toLowerCase().includes("confirm");
      toast.error(needsConfirm ? "Email non confirmé" : "Identifiants incorrects", {
        description: needsConfirm
          ? "Veuillez vérifier votre boîte mail et cliquer sur le lien de confirmation."
          : "Vérifiez votre email et votre mot de passe.",
      });
      return;
    }
    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, trimmedEmail);
        localStorage.removeItem(SESSION_ONLY_KEY);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
        localStorage.setItem(SESSION_ONLY_KEY, "1");
        sessionStorage.setItem(ACTIVE_SESSION_KEY, "1");
      }
    } catch {
      // ignore storage errors
    }
    toast.success("Bienvenue !");
  }

  async function forgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const forgotEmail = String(new FormData(e.currentTarget).get("email")).trim();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
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
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required className="h-11" defaultValue={email} />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Envoyer le lien
          </Button>
        </form>
        <p className="mt-6 text-center text-sm">
          <Link to="/auth" className="font-semibold text-primary hover:text-brand">← Retour à la connexion</Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Bon retour 👋" subtitle="Connectez-vous à votre espace PermiConduit.">
      {search.checkEmail && (
        <Alert className="mb-5 border-success/40 bg-success-soft text-primary">
          <MailCheck className="size-4 text-success" />
          <AlertTitle className="font-semibold text-primary">Vérifiez votre boîte mail</AlertTitle>
          <AlertDescription className="text-foreground/85">
            Votre compte a bien été créé. Ouvrez l'email de confirmation reçu
            {search.email ? ` à ${search.email}` : ""} puis connectez-vous ci-dessous.
          </AlertDescription>
        </Alert>
      )}
      <SocialButtons onSignedIn={goNext} />
      <OrDivider />
      <form onSubmit={login} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="h-11"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link to="/auth" search={{ mode: "forgot" as const }} className="text-xs font-medium text-muted-foreground hover:text-primary">
              Mot de passe oublié ?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            className="h-11"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember-me"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
          />
          <Label htmlFor="remember-me" className="cursor-pointer text-sm font-normal text-muted-foreground">
            Se souvenir de moi
          </Label>
        </div>
        <Button type="submit" className="h-11 w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Se connecter
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Pas encore de compte ? <Link to="/inscription" className="font-semibold text-primary hover:text-brand">Créer un compte</Link>
      </p>
    </AuthShell>
  );
}
