import { describe, expect, it } from "vitest";
import { remaining, splitHours, totalPaid, paymentsByMonth } from "@/lib/finance";

const payments = [
  { amount: 100, paid_at: "2026-11-05" },
  { amount: 200, paid_at: "2026-11-12" },
  { amount: 100, paid_at: "2026-11-19" },
];

describe("finances élève", () => {
  it("additionne les paiements : 100 + 200 + 100 = 400 DT", () => {
    expect(totalPaid(payments)).toBe(400);
  });

  it("calcule le reste à payer à partir du prix convenu", () => {
    expect(remaining(900, payments)).toBe(500);
  });

  it("ne crée pas de reste négatif en cas de trop-perçu", () => {
    expect(remaining(300, payments)).toBe(0);
  });

  it("regroupe les paiements par mois", () => {
    expect(paymentsByMonth(payments, 2026)[10]).toBe(400);
  });
});

describe("heures de conduite", () => {
  const now = new Date("2026-11-19T12:00:00");
  it("sépare heures effectuées et programmées, sans compter les annulées", () => {
    const { done, planned } = splitHours(
      [
        { starts_at: "2026-11-18T09:00:00", ends_at: "2026-11-18T10:30:00", status: "scheduled" },
        { starts_at: "2026-11-20T09:00:00", ends_at: "2026-11-20T10:00:00", status: "scheduled" },
        { starts_at: "2026-11-21T09:00:00", ends_at: "2026-11-21T11:00:00", status: "cancelled" },
      ],
      now,
    );
    expect(done).toBe(1.5);
    expect(planned).toBe(1);
  });
});
