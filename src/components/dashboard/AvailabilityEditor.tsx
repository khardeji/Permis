import { Clock, Copy, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const DAYS = [
  { name: "Lundi", short: "Lun" },
  { name: "Mardi", short: "Mar" },
  { name: "Mercredi", short: "Mer" },
  { name: "Jeudi", short: "Jeu" },
  { name: "Vendredi", short: "Ven" },
  { name: "Samedi", short: "Sam" },
  { name: "Dimanche", short: "Dim" },
] as const;

export type TimeSlot = { start: string; end: string };
export type WeekSchedule = Record<string, { enabled: boolean; slots: TimeSlot[] }>;
export type AvailabilityItem = { day: string; hours: string };

const DEFAULT_SLOTS: TimeSlot[] = [
  { start: "08:30", end: "12:30" },
  { start: "14:00", end: "18:00" },
];

function parseHoursString(raw: string): TimeSlot[] {
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const slots: TimeSlot[] = [];
  for (const part of parts) {
    const match = part.match(/(\d{1,2}:\d{2})\s*[–—-]\s*(\d{1,2}:\d{2})/);
    if (match && match[1] && match[2]) {
      const start = match[1].padStart(5, "0");
      const end = match[2].padStart(5, "0");
      slots.push({ start, end });
    }
  }
  return slots.length > 0 ? slots : [{ start: "09:00", end: "17:00" }];
}

export function availabilityToSchedule(items: AvailabilityItem[]): WeekSchedule {
  const map = new Map(items.map((i) => [i.day, i.hours]));
  const schedule: WeekSchedule = {};
  for (const d of DAYS) {
    const raw = map.get(d.name)?.trim();
    if (raw) {
      schedule[d.name] = { enabled: true, slots: parseHoursString(raw) };
    } else {
      schedule[d.name] = { enabled: false, slots: DEFAULT_SLOTS.map((s) => ({ ...s })) };
    }
  }
  return schedule;
}

export function scheduleToAvailability(schedule: WeekSchedule): AvailabilityItem[] {
  return DAYS.flatMap((d) => {
    const entry = schedule[d.name];
    if (!entry?.enabled) return [];
    const formatted = entry.slots
      .filter((s) => s.start && s.end)
      .map((s) => `${s.start}–${s.end}`)
      .join(", ");
    return formatted ? [{ day: d.name, hours: formatted }] : [];
  });
}

export function AvailabilityEditor({
  value,
  onChange,
}: {
  value: WeekSchedule;
  onChange: (next: WeekSchedule) => void;
}) {
  const openCount = DAYS.filter((d) => value[d.name]?.enabled).length;

  function toggleDay(day: string, enabled?: boolean) {
    const cur = value[day] ?? { enabled: false, slots: DEFAULT_SLOTS.map((s) => ({ ...s })) };
    const nextEnabled = enabled ?? !cur.enabled;
    onChange({
      ...value,
      [day]: {
        enabled: nextEnabled,
        slots: cur.slots.length > 0 ? cur.slots : [{ start: "09:00", end: "17:00" }],
      },
    });
  }

  function updateSlot(day: string, idx: number, field: "start" | "end", val: string) {
    const cur = value[day];
    if (!cur) return;
    const nextSlots = cur.slots.map((s, i) => (i === idx ? { ...s, [field]: val } : s));
    onChange({ ...value, [day]: { ...cur, slots: nextSlots } });
  }

  function addSlot(day: string) {
    const cur = value[day];
    if (!cur || cur.slots.length >= 3) return;
    const last = cur.slots[cur.slots.length - 1];
    const nextSlot = last && last.end <= "13:00"
      ? { start: "14:00", end: "18:00" }
      : { start: "18:00", end: "20:00" };
    onChange({ ...value, [day]: { ...cur, slots: [...cur.slots, nextSlot] } });
  }

  function removeSlot(day: string, idx: number) {
    const cur = value[day];
    if (!cur || cur.slots.length <= 1) return;
    onChange({ ...value, [day]: { ...cur, slots: cur.slots.filter((_, i) => i !== idx) } });
  }

  function copyToWeekdays(sourceDay: string) {
    const src = value[sourceDay];
    if (!src) return;
    const next: WeekSchedule = { ...value };
    for (const d of ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]) {
      next[d] = { enabled: src.enabled, slots: src.slots.map((s) => ({ ...s })) };
    }
    onChange(next);
  }

  function applyPreset(kind: "weekdays" | "monSat" | "clear") {
    const next: WeekSchedule = {};
    for (const d of DAYS) {
      if (kind === "clear") {
        next[d.name] = { enabled: false, slots: DEFAULT_SLOTS.map((s) => ({ ...s })) };
      } else if (kind === "weekdays") {
        const isWeekday = !["Samedi", "Dimanche"].includes(d.name);
        next[d.name] = {
          enabled: isWeekday,
          slots: [
            { start: "08:30", end: "12:30" },
            { start: "14:00", end: "18:00" },
          ],
        };
      } else {
        const isOpen = d.name !== "Dimanche";
        next[d.name] = {
          enabled: isOpen,
          slots: [{ start: "08:00", end: "18:00" }],
        };
      }
    }
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {/* Aperçu rapide des 7 jours */}
      <div className="rounded-xl border border-border bg-secondary/40 p-3">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            {openCount} jour{openCount > 1 ? "s" : ""} ouvert{openCount > 1 ? "s" : ""} par semaine
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => applyPreset("weekdays")}>
              <Sparkles className="size-3 text-brand" /> Lun–Ven (2 créneaux)
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => applyPreset("monSat")}>
              Lun–Sam (continu)
            </Button>
            {openCount > 0 && (
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => applyPreset("clear")}>
                Tout fermer
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((d) => {
            const active = !!value[d.name]?.enabled;
            return (
              <button
                key={d.name}
                type="button"
                onClick={() => toggleDay(d.name)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-lg border py-2 text-xs font-semibold transition",
                  active
                    ? "border-brand bg-brand/10 text-primary shadow-soft"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30",
                )}
              >
                <span>{d.short}</span>
                <span className={cn("size-1.5 rounded-full", active ? "bg-brand" : "bg-muted-foreground/30")} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Détail par jour */}
      <div className="space-y-2.5">
        {DAYS.map((d) => {
          const entry = value[d.name] ?? { enabled: false, slots: DEFAULT_SLOTS };
          return (
            <div
              key={d.name}
              className={cn(
                "rounded-xl border p-3 transition",
                entry.enabled ? "border-border bg-card shadow-soft" : "border-dashed border-border/70 bg-secondary/20",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <Switch checked={entry.enabled} onCheckedChange={(v) => toggleDay(d.name, v)} />
                  <span className={cn("text-sm font-semibold", entry.enabled ? "text-primary" : "text-muted-foreground")}>
                    {d.name}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      entry.enabled ? "bg-success-soft text-success" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {entry.enabled ? "Ouvert" : "Fermé"}
                  </span>
                </label>

                {entry.enabled && (
                  <div className="flex items-center gap-1">
                    {entry.slots.length < 3 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-primary"
                        onClick={() => addSlot(d.name)}
                      >
                        <Plus className="size-3.5" /> Créneau
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                      title="Appliquer ces horaires du lundi au vendredi"
                      onClick={() => copyToWeekdays(d.name)}
                    >
                      <Copy className="size-3" /> Lun–Ven
                    </Button>
                  </div>
                )}
              </div>

              {entry.enabled && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {entry.slots.map((slot, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5 text-xs"
                    >
                      <Clock className="size-3.5 text-brand" />
                      <input
                        type="time"
                        aria-label={`${d.name} début créneau ${idx + 1}`}
                        value={slot.start}
                        onChange={(e) => updateSlot(d.name, idx, "start", e.target.value)}
                        className="bg-transparent font-medium text-primary focus:outline-none"
                      />
                      <span className="text-muted-foreground">→</span>
                      <input
                        type="time"
                        aria-label={`${d.name} fin créneau ${idx + 1}`}
                        value={slot.end}
                        onChange={(e) => updateSlot(d.name, idx, "end", e.target.value)}
                        className="bg-transparent font-medium text-primary focus:outline-none"
                      />
                      {entry.slots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSlot(d.name, idx)}
                          aria-label="Supprimer ce créneau"
                          className="ml-0.5 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
