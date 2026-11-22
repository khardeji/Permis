import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameDay, isSameMonth,
  startOfDay, startOfMonth, startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Loader2, MapPin, Plus, Repeat, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader, StatusBadge } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMyInstructor } from "../pro";

export const Route = createFileRoute("/_authenticated/pro/planning")({
  head: () => workspaceHead("Planning — Espace Moniteur"),
  component: PlanningPage,
});

type View = "day" | "week" | "month";
type LessonRow = {
  id: string; starts_at: string; ends_at: string; status: string;
  location: string | null; notes: string | null; student_id: string;
  students: { full_name: string } | null;
};

function PlanningPage() {
  const { data: instructor } = useMyInstructor();
  const qc = useQueryClient();
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(new Date());
  const [addOpen, setAddOpen] = useState(false);

  const range = useMemo(() => {
    if (view === "day") return { from: startOfDay(cursor), to: addDays(startOfDay(cursor), 1) };
    if (view === "week") {
      const s = startOfWeek(cursor, { weekStartsOn: 1 });
      return { from: s, to: addDays(s, 7) };
    }
    const s = startOfMonth(cursor);
    return { from: s, to: addDays(endOfMonth(cursor), 1) };
  }, [view, cursor]);

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["pro-lessons", instructor?.id, range.from.toISOString(), range.to.toISOString()],
    enabled: !!instructor,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, starts_at, ends_at, status, location, notes, student_id, students(full_name)")
        .eq("instructor_id", instructor!.id)
        .gte("starts_at", range.from.toISOString())
        .lt("starts_at", range.to.toISOString())
        .order("starts_at");
      if (error) throw error;
      return (data ?? []) as LessonRow[];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["pro-students-list", instructor?.id],
    enabled: !!instructor,
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id, full_name").eq("instructor_id", instructor!.id).eq("status", "active").order("full_name");
      return data ?? [];
    },
  });

  function move(dir: -1 | 1) {
    setCursor((c) => (view === "day" ? addDays(c, dir) : view === "week" ? addWeeks(c, dir) : addMonths(c, dir)));
  }

  const title =
    view === "day"
      ? format(cursor, "EEEE d MMMM yyyy", { locale: fr })
      : view === "week"
        ? `Semaine du ${format(range.from, "d MMMM", { locale: fr })}`
        : format(cursor, "MMMM yyyy", { locale: fr });

  async function setStatus(id: string, status: "completed" | "cancelled") {
    const { error } = await supabase.from("lessons").update({ status }).eq("id", id);
    if (error) {
      toast.error("Mise à jour impossible", { description: error.message });
      return;
    }
    toast.success(status === "completed" ? "Séance marquée effectuée" : "Séance annulée");
    qc.invalidateQueries({ queryKey: ["pro-lessons"] });
  }

  return (
    <>
      <PageHeader
        title="Planning"
        subtitle="Organisez vos leçons de conduite."
        actions={
          <Button onClick={() => setAddOpen(true)} disabled={students.length === 0}>
            <Plus /> Nouvelle séance
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border bg-card p-1">
          {(["day", "week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary",
              )}
            >
              {v === "day" ? "Jour" : v === "week" ? "Semaine" : "Mois"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => move(-1)} aria-label="Précédent"><ChevronLeft /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Aujourd'hui</Button>
          <Button variant="outline" size="icon" onClick={() => move(1)} aria-label="Suivant"><ChevronRight /></Button>
        </div>
        <p className="ml-1 font-display text-lg font-bold capitalize text-primary">{title}</p>
      </div>

      {isLoading ? (
        <p className="py-20 text-center text-muted-foreground">Chargement…</p>
      ) : view === "month" ? (
        <MonthGrid cursor={cursor} lessons={lessons} />
      ) : (
        <LessonList lessons={lessons} onStatus={setStatus} />
      )}

      <LessonForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        instructorId={instructor?.id}
        students={students}
        onSaved={() => qc.invalidateQueries({ queryKey: ["pro-lessons"] })}
      />
    </>
  );
}

function LessonList({ lessons, onStatus }: { lessons: LessonRow[]; onStatus: (id: string, s: "completed" | "cancelled") => void }) {
  if (lessons.length === 0) {
    return <EmptyState icon={CalendarDays} title="Aucune séance sur cette période" text="Changez de période ou planifiez une nouvelle séance." />;
  }
  const byDay = new Map<string, LessonRow[]>();
  for (const l of lessons) {
    const key = format(new Date(l.starts_at), "yyyy-MM-dd");
    byDay.set(key, [...(byDay.get(key) ?? []), l]);
  }
  return (
    <div className="space-y-6">
      {[...byDay.entries()].map(([day, items]) => (
        <section key={day}>
          <h3 className="mb-2 font-display text-base font-bold capitalize text-primary">
            {format(new Date(`${day}T12:00:00`), "EEEE d MMMM", { locale: fr })}
          </h3>
          <ul className="space-y-2">
            {items.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
                <div className="min-w-24">
                  <p className="font-semibold text-primary">{fmtTime(l.starts_at)} – {fmtTime(l.ends_at)}</p>
                </div>
                <p className="flex-1 font-medium text-primary">{l.students?.full_name ?? "Élève"}</p>
                {l.location && <p className="inline-flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" />{l.location}</p>}
                <StatusBadge status={l.status} />
                {l.status === "scheduled" && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="Marquer effectuée" onClick={() => onStatus(l.id, "completed")}>
                      <Check className="size-4 text-success" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Annuler la séance" onClick={() => onStatus(l.id, "cancelled")}>
                      <X className="size-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MonthGrid({ cursor, lessons }: { cursor: Date; lessons: LessonRow[] }) {
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="grid grid-cols-7 border-b border-border bg-secondary/60 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const dayLessons = lessons.filter((l) => isSameDay(new Date(l.starts_at), d));
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "min-h-24 border-b border-r border-border p-1.5 [&:nth-child(7n)]:border-r-0",
                !isSameMonth(d, cursor) && "bg-secondary/30 text-muted-foreground",
                isSameDay(d, new Date()) && "bg-brand-soft/40",
              )}
            >
              <p className={cn("text-xs font-semibold", isSameDay(d, new Date()) ? "text-brand" : "text-primary")}>{format(d, "d")}</p>
              <div className="mt-1 space-y-1">
                {dayLessons.slice(0, 3).map((l) => (
                  <p
                    key={l.id}
                    className={cn(
                      "truncate rounded px-1.5 py-0.5 text-[11px] font-medium",
                      l.status === "cancelled" ? "bg-destructive-soft text-destructive line-through" : "bg-primary-soft text-primary",
                    )}
                    title={`${fmtTime(l.starts_at)} ${l.students?.full_name ?? ""}`}
                  >
                    {fmtTime(l.starts_at)} {l.students?.full_name ?? ""}
                  </p>
                ))}
                {dayLessons.length > 3 && <p className="text-[11px] text-muted-foreground">+{dayLessons.length - 3} autres</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const WEEKDAYS = [
  { jsDay: 1, short: "Lun" },
  { jsDay: 2, short: "Mar" },
  { jsDay: 3, short: "Mer" },
  { jsDay: 4, short: "Jeu" },
  { jsDay: 5, short: "Ven" },
  { jsDay: 6, short: "Sam" },
  { jsDay: 0, short: "Dim" },
] as const;

function buildOccurrenceDates(
  startDateStr: string,
  recurring: boolean,
  selectedDays: number[],
  weeks: number,
): string[] {
  if (!startDateStr) return [];
  const base = new Date(`${startDateStr}T12:00:00`);
  if (Number.isNaN(base.getTime())) return [];
  if (!recurring) return [startDateStr];

  const countWeeks = Math.max(1, Math.min(24, Math.floor(weeks) || 1));
  const daysSet = new Set(selectedDays.length > 0 ? selectedDays : [base.getDay()]);
  const totalDays = countWeeks * 7;
  const out: string[] = [];
  for (let offset = 0; offset < totalDays; offset++) {
    const d = addDays(base, offset);
    if (daysSet.has(d.getDay())) {
      out.push(format(d, "yyyy-MM-dd"));
    }
  }
  return out;
}

function LessonForm({
  open, onClose, instructorId, students, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  instructorId: string | undefined;
  students: { id: string; full_name: string }[];
  onSaved: () => void;
}) {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [busy, setBusy] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [dateStr, setDateStr] = useState(todayStr);
  const [recurring, setRecurring] = useState(false);
  const [weeks, setWeeks] = useState(3);
  const [selectedDays, setSelectedDays] = useState<number[]>(() => [new Date().getDay()]);

  function handleDateChange(val: string) {
    setDateStr(val);
    const parsed = new Date(`${val}T12:00:00`);
    if (!Number.isNaN(parsed.getTime()) && !recurring) {
      setSelectedDays([parsed.getDay()]);
    }
  }

  function toggleWeekday(jsDay: number) {
    setSelectedDays((prev) => {
      if (prev.includes(jsDay)) {
        return prev.length > 1 ? prev.filter((d) => d !== jsDay) : prev;
      }
      return [...prev, jsDay];
    });
  }

  const occurrenceDates = useMemo(
    () => buildOccurrenceDates(dateStr, recurring, selectedDays, weeks),
    [dateStr, recurring, selectedDays, weeks],
  );

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!instructorId) return;
    if (!studentId) {
      toast.error("Choisissez un élève");
      return;
    }
    const f = new FormData(e.currentTarget);
    const start = String(f.get("start"));
    const end = String(f.get("end"));
    const sampleStart = new Date(`${dateStr}T${start}`);
    const sampleEnd = new Date(`${dateStr}T${end}`);
    if (!(sampleEnd > sampleStart)) {
      toast.error("L'heure de fin doit être après l'heure de début");
      return;
    }
    if (occurrenceDates.length === 0) {
      toast.error("Sélectionnez au moins un jour");
      return;
    }
    const location = String(f.get("location")).trim() || null;
    const notes = String(f.get("notes")).trim() || null;

    const payload = occurrenceDates.map((d) => ({
      instructor_id: instructorId,
      student_id: studentId,
      starts_at: new Date(`${d}T${start}`).toISOString(),
      ends_at: new Date(`${d}T${end}`).toISOString(),
      location,
      notes,
    }));

    setBusy(true);
    const { error } = await supabase.from("lessons").insert(payload);
    setBusy(false);
    if (error) {
      toast.error("Séance non créée", { description: error.message });
      return;
    }
    toast.success(
      payload.length > 1
        ? `${payload.length} séances planifiées sur ${weeks} semaine${weeks > 1 ? "s" : ""}`
        : "Séance planifiée",
    );
    setStudentId("");
    setRecurring(false);
    setWeeks(3);
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle séance</DialogTitle>
          <DialogDescription>Planifiez une séance unique ou récurrente sur plusieurs semaines.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="space-y-2">
            <Label>Élève</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Choisir un élève" /></SelectTrigger>
              <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
            <button
              type="button"
              onClick={() => setRecurring(false)}
              className={cn(
                "rounded-lg py-2 text-xs font-semibold transition",
                !recurring ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-primary",
              )}
            >
              Séance unique
            </button>
            <button
              type="button"
              onClick={() => {
                setRecurring(true);
                const parsed = new Date(`${dateStr}T12:00:00`);
                if (!Number.isNaN(parsed.getTime()) && selectedDays.length === 0) {
                  setSelectedDays([parsed.getDay()]);
                }
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition",
                recurring ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-primary",
              )}
            >
              <Repeat className="size-3.5" /> Répéter chaque semaine
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">{recurring ? "À partir du" : "Date"}</Label>
            <Input
              id="date"
              name="date"
              type="date"
              required
              value={dateStr}
              onChange={(e) => handleDateChange(e.target.value)}
              className="h-11"
            />
          </div>

          {recurring && (
            <div className="space-y-3 rounded-xl border border-border bg-secondary/40 p-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs">Jours de la semaine</Label>
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((w) => {
                    const active = selectedDays.includes(w.jsDay);
                    return (
                      <button
                        key={w.jsDay}
                        type="button"
                        onClick={() => toggleWeekday(w.jsDay)}
                        className={cn(
                          "rounded-lg border py-1.5 text-xs font-semibold transition",
                          active
                            ? "border-brand bg-brand text-brand-foreground shadow-soft"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {w.short}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="weeks" className="text-xs">Pendant combien de semaines ?</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="weeks"
                    type="number"
                    min={1}
                    max={24}
                    value={weeks}
                    onChange={(e) => setWeeks(Math.max(1, Math.min(24, Number(e.target.value) || 1)))}
                    className="h-9 w-20 text-center"
                  />
                  <span className="text-xs text-muted-foreground">semaine{weeks > 1 ? "s" : ""}</span>
                </div>
              </div>
              <p className="text-xs font-medium text-primary">
                {occurrenceDates.length} séance{occurrenceDates.length > 1 ? "s" : ""} à planifier
                {occurrenceDates.length > 0 && (
                  <span className="block font-normal text-muted-foreground">
                    {occurrenceDates
                      .slice(0, 5)
                      .map((d) => format(new Date(`${d}T12:00:00`), "EEE d MMM", { locale: fr }))
                      .join(" · ")}
                    {occurrenceDates.length > 5 ? ` · +${occurrenceDates.length - 5} autres` : ""}
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start">Début</Label>
              <Input id="start" name="start" type="time" required defaultValue="09:00" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Fin</Label>
              <Input id="end" name="end" type="time" required defaultValue="10:00" className="h-11" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Lieu de rendez-vous</Label>
            <Input id="location" name="location" maxLength={150} placeholder="Ex. Devant le lycée, place…" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" maxLength={1000} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {recurring ? `Planifier (${occurrenceDates.length})` : "Planifier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
