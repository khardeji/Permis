import { Search, Send, TrendingUp } from "lucide-react";

export const STEPS = [
  {
    Icon: Search,
    title: "Choisissez votre moniteur",
    text: "Parcourez les profils vérifiés, comparez les villes, services, horaires et avis.",
  },
  {
    Icon: Send,
    title: "Envoyez votre demande",
    text: "Créez votre compte en 1 minute et demandez votre inscription. Le moniteur vous répond directement.",
  },
  {
    Icon: TrendingUp,
    title: "Suivez votre progression",
    text: "Séances, heures effectuées, paiements et reste à payer : tout est dans votre espace élève.",
  },
];

export function HowSteps() {
  return (
    <div className="relative grid gap-6 md:grid-cols-3">
      <div className="absolute left-[16%] right-[16%] top-10 hidden h-px border-t-2 border-dashed border-brand/40 md:block" />
      {STEPS.map(({ Icon, title, text }, idx) => (
        <div key={title} className="relative rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
          <div className="relative mx-auto grid size-20 place-items-center rounded-2xl bg-brand-gradient text-primary-foreground shadow-glow">
            <Icon className="size-8" />
            <span className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full border-4 border-card bg-primary text-xs font-bold text-primary-foreground">
              {idx + 1}
            </span>
          </div>
          <h3 className="mt-5 text-lg font-bold text-primary">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{text}</p>
        </div>
      ))}
    </div>
  );
}
