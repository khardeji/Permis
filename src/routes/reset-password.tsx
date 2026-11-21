import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/site/AuthShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — PermiConduit" },
      { name: "description", content: "Choisissez un nouveau mot de passe pour votre compte PermiConduit." },
      { property: "og:title", content: "Nouveau mot de passe — PermiConduit" },
      { property: "og:description", content: "Réinitialisation du mot de passe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pw = String(f.get("password"));
    if (pw.length < 8) {
      toast.error("8 caractères minimum");
      return;
    }
    if (pw !== String(f.get("confirm"))) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      toast.error("Lien expiré ou invalide", { description: error.message });
      return;
    }
    toast.success("Mot de passe mis à jour");
    navigate({ to: "/espace" });
  }
  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Choisissez un mot de passe sécurisé.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="password">Nouveau mot de passe</Label><Input id="password" name="password" type="password" required className="h-11" /></div>
        <div className="space-y-2"><Label htmlFor="confirm">Confirmer</Label><Input id="confirm" name="confirm" type="password" required className="h-11" /></div>
        <Button type="submit" className="h-11 w-full" disabled={busy}>Enregistrer</Button>
      </form>
    </AuthShell>
  );
}
