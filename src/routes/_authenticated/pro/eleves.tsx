import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Award, CheckCircle2, Loader2, Pencil, Plus, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { remaining, splitHours, totalDue, totalPaid } from "@/lib/finance";
import { formatDT, fmtHours, telLink, waLink } from "@/lib/format";
import { CITIES } from "@/lib/site";
import { cn } from "@/lib/utils";
import { useMyInstructor } from "../pro";

export const Route = createFileRoute("/_authenticated/pro/eleves")({
  head: () => workspaceHead("Mes élèves — Espace Moniteur"),
  component: StudentsPage,
});

type Student = Tables<"students">;
type StatusFilter = "all" | "ongoing" | "completed";
type PaymentFilter = "all" | "paid" | "unpaid";

const LICENSES = ["B (voiture)", "A (moto)", "A1 (moto légère)", "C (poids lourd)"];
const METHODS = ["Espèces", "Virement", "Chèque", "Carte", "Autre"];

function StudentsPage() {
  const { data: instructor } = useMyInstructor();
  const qc = useQueryClient();
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [payStudent, setPayStudent] = useState<Student | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["pro-students", instructor?.id],
    enabled: !!instructor,
    queryFn: async () => {
      const iid = instructor!.id;
      const [students, payments, lessons] = await Promise.all([
        supabase.from("students").select("*").eq("instructor_id", iid).order("created_at", { ascending: false }),
        supabase.from("payments").select("student_id, amount, paid_at").eq("instructor_id", iid),
        supabase.from("lessons").select("student_id, starts_at, ends_at, status").eq("instructor_id", iid),
      ]);
      return { students: students.data ?? [], payments: payments.data ?? [], lessons: lessons.data ?? [] };
    },
  });

  const hourlyRate = instructor?.price_per_hour ?? 0;

  const rows = (data?.students ?? []).map((s) => {
    const pays = (data?.payments ?? []).filter((p) => p.student_id === s.id);
    const less = (data?.lessons ?? []).filter((l) => l.student_id === s.id);
    const hours = splitHours(less);
    const due = totalDue(hours.done, hourlyRate);
    const paid = totalPaid(pays);
    const left = remaining(due, pays);
    const isPaid = left <= 0;
    return { s, paid, due, left, isPaid, hours };
  });

  const ongoingCount = rows.filter((r) => r.s.status !== "completed").length;
  const completedRows = rows.filter((r) => r.s.status === "completed");
  const completedPaidCount = completedRows.filter((r) => r.isPaid).length;
  const completedUnpaidRows = completedRows.filter((r) => !r.isPaid);
  const completedUnpaidTotal = completedUnpaidRows.reduce((sum, r) => sum + r.left, 0);

  const filtered = rows.filter((r) => {
    if (statusFilter === "ongoing" && r.s.status === "completed") return false;
    if (statusFilter === "completed" && r.s.status !== "completed") return false;
    if (paymentFilter === "paid" && !r.isPaid) return false;
    if (paymentFilter === "unpaid" && r.isPaid) return false;
    return true;
  });

  async function markCompleted(student: Student) {
    const { error } = await supabase
      .from("students")
      .update({ status: "completed" })
      .eq("id", student.id);
    if (error) {
      toast.error("Mise à jour impossible", { description: error.message });
      return;
    }
    toast.success("Félicitations !", {
      description: `${student.full_name} est marqué comme terminé (permis obtenu).`,
    });
    qc.invalidateQueries({ queryKey: ["pro-students"] });
    qc.invalidateQueries({ queryKey: ["pro-students-list"] });
  }

  return (
    <>
      <PageHeader
        title="Mes élèves"
        subtitle={
          hourlyRate > 0
            ? `Suivi automatique basé sur votre tarif horaire : ${formatDT(hourlyRate)}/h.`
            : "Suivez les heures effectuées, les permis obtenus et les paiements de chaque élève."
        }
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus /> Ajouter un élève
          </Button>
        }
      />

      {instructor && !hourlyRate && (
        <Alert className="mb-5 border-warning/40 bg-warning-soft text-primary">
          <AlertCircle className="size-4 text-warning-foreground" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>Définissez votre tarif horaire (DT/heure) pour calculer automatiquement les montants dus.</span>
            <Button asChild size="sm" variant="outline">
              <Link to="/pro/profil">Configurer mon tarif</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {rows.length > 0 && (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Élèves en cours" value={ongoingCount} icon={Users} />
            <StatCard label="Terminés (permis obtenu)" value={completedRows.length} icon={Award} tone="brand" />
            <StatCard label="Terminés · Payés" value={completedPaidCount} icon={CheckCircle2} tone="success" />
            <StatCard
              label="Terminés · Non payés"
              value={completedUnpaidRows.length}
              icon={Wallet}
              tone={completedUnpaidRows.length > 0 ? "warning" : "success"}
              hint={completedUnpaidTotal > 0 ? `Reste : ${formatDT(completedUnpaidTotal)}` : "Tout est réglé"}
            />
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-1">
              {(
                [
                  ["all", `Tous (${rows.length})`],
                  ["ongoing", `En cours (${ongoingCount})`],
                  ["completed", `Permis obtenu (${completedRows.length})`],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStatusFilter(val)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    statusFilter === val
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-primary",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-1">
              {(
                [
                  ["all", "Tous paiements"],
                  ["paid", "Payés"],
                  ["unpaid", "Non payés"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPaymentFilter(val)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    paymentFilter === val
                      ? "bg-brand text-brand-foreground"
                      : "text-muted-foreground hover:text-primary",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {isLoading ? (
        <p className="py-20 text-center text-muted-foreground">Chargement…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun élève pour le moment"
          text="Ajoutez votre premier élève ou acceptez une demande d'inscription."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus /> Ajouter un élève
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun élève dans cette catégorie"
          text="Changez de filtre pour afficher vos autres élèves."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter("all");
                setPaymentFilter("all");
              }}
            >
              Afficher tous les élèves
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Élève</th>
                <th className="px-5 py-3 font-medium">Permis</th>
                <th className="px-5 py-3 font-medium">Heures effectuées</th>
                <th className="px-5 py-3 font-medium">Total dû</th>
                <th className="px-5 py-3 font-medium">Payé</th>
                <th className="px-5 py-3 font-medium">Reste</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ s, paid, due, left, isPaid, hours }) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-primary">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.phone && <a className="hover:text-brand" href={telLink(s.phone)}>{s.phone}</a>}
                      {s.phone && s.city ? " · " : ""}{s.city ?? ""}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{s.license_type}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    <span className="font-medium text-primary">{fmtHours(hours.done)}</span>
                    {hours.planned > 0 && (
                      <span className="block text-xs text-muted-foreground">+{fmtHours(hours.planned)} planifiées</span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-medium text-primary">{formatDT(due)}</td>
                  <td className="px-5 py-3 font-medium text-success">{formatDT(paid)}</td>
                  <td className="px-5 py-3">
                    <span className={`font-medium ${left > 0 ? "text-warning-foreground" : "text-muted-foreground"}`}>
                      {formatDT(left)}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        isPaid ? "bg-success-soft text-success" : "bg-warning-soft text-warning-foreground",
                      )}
                    >
                      {isPaid ? "Payé" : "Non payé"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {s.status === "completed" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success">
                        <Award className="size-3.5" /> Permis obtenu
                      </span>
                    ) : (
                      <StatusBadge status={s.status} />
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      {s.status !== "completed" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Marquer terminé (permis obtenu)"
                          onClick={() => markCompleted(s)}
                        >
                          <Award className="size-4 text-success" />
                        </Button>
                      )}
                      {s.phone && (
                        <Button asChild variant="ghost" size="icon" title="WhatsApp">
                          <a href={waLink(s.phone, `Bonjour ${s.full_name}, `)} target="_blank" rel="noreferrer">💬</a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Ajouter un paiement" onClick={() => setPayStudent(s)}>
                        <Wallet className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Modifier" onClick={() => setEditStudent(s)}>
                        <Pencil className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StudentForm
        key={editStudent?.id ?? "new"}
        open={addOpen || !!editStudent}
        onClose={() => {
          setAddOpen(false);
          setEditStudent(null);
        }}
        instructorId={instructor?.id}
        student={editStudent}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["pro-students"] });
          qc.invalidateQueries({ queryKey: ["pro-students-list"] });
        }}
      />
      <PaymentForm
        student={payStudent}
        instructorId={instructor?.id}
        onClose={() => setPayStudent(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["pro-students"] })}
      />
    </>
  );
}

function StudentForm({
  open, onClose, instructorId, student, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  instructorId: string | undefined;
  student: Student | null;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [city, setCity] = useState(student?.city ?? "");
  const [license, setLicense] = useState(student?.license_type ?? LICENSES[0] ?? "B (voiture)");
  const [status, setStatus] = useState(student?.status ?? "active");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!instructorId) return;
    const f = new FormData(e.currentTarget);
    const payload = {
      full_name: String(f.get("full_name")).trim(),
      phone: String(f.get("phone")).trim() || null,
      email: String(f.get("email")).trim() || null,
      city: city || null,
      license_type: license,
      status,
      notes: String(f.get("notes")).trim() || null,
    };
    if (payload.full_name.length < 3) {
      toast.error("Indiquez le nom complet de l'élève");
      return;
    }
    setBusy(true);
    const { error } = student
      ? await supabase.from("students").update(payload).eq("id", student.id)
      : await supabase.from("students").insert({ ...payload, instructor_id: instructorId, agreed_price: 0, hours_package: 0 });
    setBusy(false);
    if (error) {
      toast.error("Enregistrement impossible", { description: error.message });
      return;
    }
    toast.success(student ? "Élève mis à jour" : "Élève ajouté");
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{student ? "Modifier l'élève" : "Ajouter un élève"}</DialogTitle>
          <DialogDescription>
            Les heures et le montant à payer sont calculés automatiquement selon les séances effectuées et votre tarif horaire.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="full_name">Nom complet</Label>
            <Input id="full_name" name="full_name" defaultValue={student?.full_name} required className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" name="phone" defaultValue={student?.phone ?? ""} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={student?.email ?? ""} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Ville</Label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type de permis</Label>
            <Select value={license} onValueChange={setLicense}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{LICENSES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {student && (
            <div className="space-y-2 sm:col-span-2">
              <Label>Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif (en cours)</SelectItem>
                  <SelectItem value="paused">En pause</SelectItem>
                  <SelectItem value="completed">Terminé — Permis obtenu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={student?.notes ?? ""} maxLength={2000} placeholder="Progression, points à travailler…" />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({
  student, instructorId, onClose, onSaved,
}: {
  student: Student | null;
  instructorId: string | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState(METHODS[0] ?? "Espèces");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!student || !instructorId) return;
    const f = new FormData(e.currentTarget);
    const amount = Number(f.get("amount"));
    if (!amount || amount <= 0) {
      toast.error("Indiquez un montant valide");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("payments").insert({
      instructor_id: instructorId,
      student_id: student.id,
      amount,
      method,
      paid_at: String(f.get("paid_at")) || new Date().toISOString().slice(0, 10),
      note: String(f.get("note")).trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error("Paiement non enregistré", { description: error.message });
      return;
    }
    toast.success("Paiement enregistré", { description: `${amount} DT — ${student.full_name}` });
    onSaved();
    onClose();
  }

  return (
    <Dialog open={!!student} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau paiement</DialogTitle>
          <DialogDescription>{student?.full_name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Montant (DT)</Label>
            <Input id="amount" name="amount" type="number" min="1" step="0.5" required className="h-11" autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Mode de paiement</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paid_at">Date</Label>
            <Input id="paid_at" name="paid_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note (facultatif)</Label>
            <Input id="note" name="note" maxLength={200} placeholder="Ex. Acompte, 2e tranche…" className="h-11" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
