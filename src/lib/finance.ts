// Pure business rules for money and hours — covered by src/test/finance.test.ts.

export type PaymentLike = { amount: number | string; paid_at?: string };
export type LessonLike = { starts_at: string; ends_at: string; status: string };

export function totalPaid(payments: PaymentLike[]) {
  return payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
}

/** Remaining balance never goes below zero (an overpayment is not a debt). */
export function remaining(agreedPrice: number | string, payments: PaymentLike[]) {
  return Math.max(0, Number(agreedPrice || 0) - totalPaid(payments));
}

export function lessonDurationHours(l: Pick<LessonLike, "starts_at" | "ends_at">) {
  return Math.max(0, (new Date(l.ends_at).getTime() - new Date(l.starts_at).getTime()) / 3_600_000);
}

/**
 * Done = not cancelled and already finished (or explicitly completed).
 * Planned = not cancelled, not completed and still to come.
 */
export function splitHours(lessons: LessonLike[], now: Date = new Date()) {
  let done = 0;
  let planned = 0;
  for (const l of lessons) {
    if (l.status === "cancelled") continue;
    const h = lessonDurationHours(l);
    if (l.status === "completed" || new Date(l.ends_at) <= now) done += h;
    else planned += h;
  }
  return { done, planned };
}

export function paymentsByMonth(payments: PaymentLike[], year: number) {
  const months = Array.from({ length: 12 }, () => 0);
  for (const p of payments) {
    if (!p.paid_at) continue;
    const d = new Date(p.paid_at);
    if (d.getFullYear() === year) {
      const m = d.getMonth();
      months[m] = (months[m] ?? 0) + Number(p.amount || 0);
    }
  }
  return months;
}

export function paymentsByYear(payments: PaymentLike[]) {
  const map = new Map<number, number>();
  for (const p of payments) {
    if (!p.paid_at) continue;
    const y = new Date(p.paid_at).getFullYear();
    map.set(y, (map.get(y) ?? 0) + Number(p.amount || 0));
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([year, total]) => ({ year, total }));
}
