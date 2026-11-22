import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { paymentsByMonth, paymentsByYear, remaining, splitHours, totalDue, totalPaid } from "@/lib/finance";
import { formatDT, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMyInstructor } from "../pro";

export const Route = createFileRoute("/_authenticated/pro/finances")({
  head: () => workspaceHead("Finances — Espace Moniteur"),
  component: FinancesPage,
});

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function FinancesPage() {
  const { data: instructor } = useMyInstructor();
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ["pro-finances", instructor?.id],
    enabled: !!instructor,
    queryFn: async () => {
      const iid = instructor!.id;
      const [payments, students, lessons] = await Promise.all([
        supabase
          .from("payments")
          .select("id, student_id, amount, method, paid_at, note, students(full_name)")
          .eq("instructor_id", iid)
          .order("paid_at", { ascending: false }),
        supabase.from("students").select("id").eq("instructor_id", iid),
        supabase.from("lessons").select("student_id, starts_at, ends_at, status").eq("instructor_id", iid),
      ]);
      return { payments: payments.data ?? [], students: students.data ?? [], lessons: lessons.data ?? [] };
    },
  });

  const payments = data?.payments ?? [];
  const lessons = data?.lessons ?? [];
  const hourlyRate = instructor?.price_per_hour ?? 0;
  const years = useMemo(() => paymentsByYear(payments).map((p) => p.year), [payments]);
  const yearOptions = [...new Set([new Date().getFullYear(), ...years])].sort((a, b) => b - a);
  const months = useMemo(() => paymentsByMonth(payments, year), [payments, year]);
  const maxMonth = Math.max(1, ...months);
  const yearTotal = months.reduce((a, b) => a + b, 0);
  const allPaid = totalPaid(payments);
  const totalRemaining = (data?.students ?? []).reduce((sum, s) => {
    const sHours = splitHours(lessons.filter((l) => l.student_id === s.id));
    const due = totalDue(sHours.done, hourlyRate);
    return sum + remaining(due, payments.filter((p) => p.student_id === s.id));
  }, 0);

  async function remove(id: string) {
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) {
      toast.error("Suppression impossible", { description: error.message });
      return;
    }
    toast.success("Paiement supprimé");
    qc.invalidateQueries({ queryKey: ["pro-finances"] });
  }

  return (
    <>
      <PageHeader title="Finances" subtitle="Suivez vos encaissements et les restes à payer." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total encaissé" value={formatDT(allPaid)} icon={Wallet} tone="success" />
        <StatCard label={`Encaissé en ${year}`} value={formatDT(yearTotal)} icon={Wallet} tone="brand" />
        <StatCard label="Reste à payer (élèves en cours)" value={formatDT(totalRemaining)} icon={Wallet} tone="warning" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Panel
          title="Encaissements par mois"
          action={
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          }
        >
          <div className="flex h-48 items-end gap-1.5">
            {months.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={cn("w-full rounded-t-md bg-brand/80", v === 0 && "bg-secondary")}
                  style={{ height: `${Math.max(2, (v / maxMonth) * 100)}%` }}
                  title={`${MONTHS[i]} : ${formatDT(v)}`}
                />
                <span className="text-[10px] text-muted-foreground">{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Historique des paiements">
          {isLoading ? (
            <p className="py-10 text-center text-muted-foreground">Chargement…</p>
          ) : payments.length === 0 ? (
            <EmptyState icon={Wallet} title="Aucun paiement enregistré" text="Ajoutez un paiement depuis la fiche d'un élève." />
          ) : (
            <ul className="divide-y divide-border">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-primary">{(p.students as { full_name: string } | null)?.full_name ?? "Élève"}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(p.paid_at)} · {p.method}{p.note ? ` · ${p.note}` : ""}
                    </p>
                  </div>
                  <p className="font-semibold text-success">{formatDT(Number(p.amount))}</p>
                  <Button variant="ghost" size="icon" title="Supprimer" onClick={() => remove(p.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
