import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const FAQ = [
  {
    q: "L'inscription sur PermiConduit est-elle payante pour les élèves ?",
    a: "Non. Créer un compte élève, consulter les moniteurs et envoyer une demande d'inscription est entièrement gratuit. Vous réglez uniquement vos séances directement à votre moniteur.",
  },
  {
    q: "Comment sont sélectionnés les moniteurs ?",
    a: "Chaque moniteur partenaire est validé par l'équipe PermiConduit avant d'apparaître dans l'annuaire. Vous pouvez signaler un profil à tout moment.",
  },
  {
    q: "Puis-je suivre mes paiements en ligne ?",
    a: "Oui. Chaque versement enregistré par votre moniteur apparaît dans votre espace avec sa date et son montant, ainsi que le total payé et le reste à payer.",
  },
  {
    q: "Je suis moniteur : combien coûte l'adhésion ?",
    a: "La création de votre profil est gratuite pendant la phase de lancement. Vous profitez d'un mini-site, d'un planning, d'un suivi des élèves et des paiements.",
  },
  {
    q: "Que se passe-t-il après ma demande d'inscription ?",
    a: "Le moniteur reçoit votre demande dans son tableau de bord. Dès qu'il l'accepte, vous êtes associé à lui et accédez à votre planning et à vos paiements.",
  },
];

export function Faq() {
  return (
    <Accordion type="single" collapsible className="divide-y divide-border rounded-2xl border border-border bg-card px-6 shadow-soft">
      {FAQ.map((f, i) => (
        <AccordionItem key={i} value={`f${i}`} className="border-0">
          <AccordionTrigger className="py-5 text-left text-base font-semibold text-primary hover:no-underline">{f.q}</AccordionTrigger>
          <AccordionContent className="pb-5 text-muted-foreground">{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
