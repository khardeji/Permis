import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/dashboard/DashboardShell";
import { remaining, totalPaid } from "@/lib/finance";
import { formatDT, fmtDate } from "@/lib/format";
import { useMyStudent } from "../eleve";
import { useMyTraining } from "./index";

export const Route = createFileRoute("/_authenticated/eleve/paiements")({
  head: () => workspaceHead("Mes paiements — Espace Élève"),
  component: ElevePayments,
});

function ElevePayments() {
  const { data: student } = useMyStudent();
  const { data: training, isLoading } = useMyTraining(student?.id);

  const payments = training?.payments ?? [];
  const paid = totalPaid(payments);
  const left = student ? remaining(student.agreed_price, payments) : 0;

  return (
    <>
      <PageHeader title="Mes paiements" subtitle="Le récapitulatif de vos règlements, mis à jour par votre moniteur." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Prix convenu" value={formatDT(student?.agreed_price ?? 0)} icon={Wallet} />
        <StatCard label="Total payé" value={formatDT(paid)} icon={Wallet} tone="success" />
        <StatCard label="Reste à payer" value={formatDT(left)} icon={Wallet} tone={left > 0 ? "warning" : "success"} />
      </div>

      <div className="mt-6">
        <Panel title="Historique">
          {isLoading ? (
            <p className="py-10 text-center text-muted-foreground">Chargement…</p>
          ) : payments.length === 0 ? (
            <EmptyState icon={Wallet} title="Aucun paiement enregistré" text="Vos paiements apparaîtront ici dès que votre moniteur les aura saisis." />
          ) : (
            <ul className="divide-y divide-border">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1">
                    <p className="font-medium text-primary">{fmtDate(p.paid_at)}</p>
                    <p className="text-xs text-muted-foreground">{p.method}{p.note ? ` · ${p.note}` : ""}</p>
                  </div>
                  <p className="font-semibold text-success">{formatDT(Number(p.amount))}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
