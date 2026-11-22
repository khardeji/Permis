import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/cron/lesson-reminders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        if (secret) {
          const auth = request.headers.get("authorization");
          const urlSecret = new URL(request.url).searchParams.get("secret");
          if (auth !== `Bearer ${secret}` && urlSecret !== secret) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { sendPushToUsers, formatTunisDateTime } = await import("@/lib/fcm.server");

          const now = Date.now();
          // Fenêtre de 45 à 75 minutes avant le début (idéale pour un cron toutes les 15 min)
          const windowStart = new Date(now + 45 * 60_000).toISOString();
          const windowEnd = new Date(now + 75 * 60_000).toISOString();

          const admin = supabaseAdmin as unknown as { from: (t: string) => any };
          const { data: lessons, error } = await admin
            .from("lessons")
            .select(
              "id, starts_at, ends_at, location, status, instructor_id, student_id, students(full_name, user_id, license_type), instructors(first_name, last_name, user_id)",
            )
            .eq("status", "scheduled")
            .is("reminder_sent_at", null)
            .gte("starts_at", windowStart)
            .lte("starts_at", windowEnd);

          if (error) {
            return Response.json({ error: error.message }, { status: 500 });
          }

          let processed = 0;
          let pushSent = 0;

          for (const lesson of lessons ?? []) {
            // Verrouillage optimiste pour éviter tout doublon en cas d'exécution concurrente
            const { data: claimed } = await admin
              .from("lessons")
              .update({ reminder_sent_at: new Date().toISOString() })
              .eq("id", lesson.id)
              .is("reminder_sent_at", null)
              .eq("status", "scheduled")
              .select("id");

            if (!claimed || claimed.length === 0) continue;
            processed++;

            const { date, time } = formatTunisDateTime(lesson.starts_at);
            const student = lesson.students as {
              full_name: string;
              user_id: string | null;
              license_type: string;
            } | null;
            const inst = lesson.instructors as {
              first_name: string;
              last_name: string;
              user_id: string | null;
            } | null;

            const loc = lesson.location ? ` · Lieu : ${lesson.location}` : "";
            const instrName = inst ? `${inst.first_name} ${inst.last_name}`.trim() : "votre moniteur";
            const studentName = student?.full_name ?? "votre élève";
            const license = student?.license_type ? ` (Permis ${student.license_type})` : "";

            if (inst?.user_id) {
              const res = await sendPushToUsers({
                userIds: [inst.user_id],
                title: "Votre prochaine séance approche !",
                body: `Séance dans 1 heure avec ${studentName}${license} — ${date} à ${time}${loc}.`,
                link: "/pro/planning",
                category: "reminders",
                insertInApp: true,
              });
              pushSent += res.sent;
            }

            if (student?.user_id) {
              const res = await sendPushToUsers({
                userIds: [student.user_id],
                title: "Rappel de votre séance de conduite",
                body: `Votre séance avec ${instrName}${license} commence à ${time} (${date})${loc}.`,
                link: "/eleve/planning",
                category: "reminders",
                insertInApp: true,
              });
              pushSent += res.sent;
            }
          }

          return Response.json({ ok: true, processed, pushSent });
        } catch (err) {
          console.error("[Cron] lesson-reminders error:", err);
          return Response.json(
            { error: err instanceof Error ? err.message : "Internal error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
