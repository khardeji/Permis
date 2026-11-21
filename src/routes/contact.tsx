import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Mail, MapPin, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — PermiConduit" },
      { name: "description", content: "Une question sur PermiConduit ? Écrivez-nous, notre équipe vous répond rapidement." },
      { property: "og:title", content: "Contacter PermiConduit" },
      { property: "og:description", content: "Écrivez à l'équipe PermiConduit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

const schema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(120),
  email: z.string().trim().email("Email invalide").max(255),
  phone: z.string().trim().max(30).optional(),
  subject: z.string().trim().max(150).optional(),
  message: z.string().trim().min(10, "Message trop court (10 caractères min.)").max(3000),
});

function Contact() {
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone || null,
      subject: parsed.data.subject || null, message: parsed.data.message,
    });
    setBusy(false);
    if (error) {
      toast.error("Envoi impossible, réessayez.");
      return;
    }
    toast.success("Message envoyé ! Nous vous répondons très vite.");
    form.reset();
  }

  return (
    <SiteLayout>
      <PageHero eyebrow="Contact" title="Parlons de votre projet" subtitle="Élève, moniteur ou auto-école : notre équipe est à votre écoute." />
      <section className="container-page grid gap-8 py-16 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-4">
          {[
            { Icon: Mail, title: "Email", value: SITE.email, href: `mailto:${SITE.email}` },
            { Icon: MapPin, title: "Pays", value: SITE.country },
            { Icon: Clock, title: "Délai de réponse", value: "Sous 24 h ouvrées" },
          ].map(({ Icon, title, value, href }) => (
            <div key={title} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-primary"><Icon className="size-5" /></span>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{title}</p>
                {href ? <a href={href} className="break-all font-semibold text-primary hover:text-brand">{value}</a> : <p className="font-semibold text-primary">{value}</p>}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-card md:grid-cols-2 md:p-8">
          <Field label="Nom complet" name="name" required />
          <Field label="Email" name="email" type="email" required />
          <Field label="Téléphone" name="phone" />
          <Field label="Sujet" name="subject" />
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" rows={6} required maxLength={3000} />
          </div>
          <Button type="submit" size="lg" variant="hero" className="md:col-span-2" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Send />} Envoyer le message
          </Button>
        </form>
      </section>
    </SiteLayout>
  );
}

function Field({ label, name, type = "text", required }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} className="h-11" />
    </div>
  );
}
