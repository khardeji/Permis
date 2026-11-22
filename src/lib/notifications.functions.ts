import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PushEventInput =
  | { type: "enrollment_created"; instructorId: string }
  | { type: "enrollment_decided"; requestId: string; accepted: boolean }
  | { type: "instructor_status_changed"; instructorId: string; status: "active" | "suspended" }
  | { type: "lesson_event"; action: "created" | "updated" | "cancelled"; studentId: string; startsAt: string; location?: string | null; count?: number }
  | { type: "new_partner_signup" };

export const dispatchPushEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: PushEventInput) => input)
  .handler(async ({ data, context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { sendPushToUsers, formatTunisDateTime } = await import("@/lib/fcm.server");

      const callerId = context.userId;

      if (data.type === "enrollment_created") {
        const [{ data: inst }, { data: profile }] = await Promise.all([
          supabaseAdmin.from("instructors").select("user_id, first_name, last_name").eq("id", data.instructorId).maybeSingle(),
          supabaseAdmin.from("profiles").select("full_name").eq("id", callerId).maybeSingle(),
        ]);
        const studentName = profile?.full_name?.trim() || "Un élève";
        if (inst?.user_id) {
          await sendPushToUsers({
            userIds: [inst.user_id],
            title: "Nouvelle demande d'inscription",
            body: `${studentName} souhaite apprendre la conduite avec vous.`,
            link: "/pro/demandes",
            category: "enrollments",
          });
        }
        await sendPushToUsers({
          userIds: [callerId],
          title: "Demande envoyée",
          body: `Votre demande a été transmise à ${inst ? `${inst.first_name} ${inst.last_name}` : "votre moniteur"}.`,
          link: "/eleve",
          category: "enrollments",
        });
        return { ok: true };
      }

      if (data.type === "enrollment_decided") {
        const { data: req } = await supabaseAdmin
          .from("enrollment_requests")
          .select("student_user_id, instructor_id, full_name")
          .eq("id", data.requestId)
          .maybeSingle();
        if (!req) return { ok: false };

        const { data: inst } = await supabaseAdmin
          .from("instructors")
          .select("user_id, first_name, last_name")
          .eq("id", req.instructor_id)
          .maybeSingle();
        if (!inst || inst.user_id !== callerId) return { ok: false };

        const instrName = `${inst.first_name} ${inst.last_name}`.trim();
        await sendPushToUsers({
          userIds: [req.student_user_id],
          title: data.accepted ? "Inscription acceptée !" : "Demande d'inscription refusée",
          body: data.accepted
            ? `${instrName} a accepté votre demande. Consultez votre espace élève.`
            : `${instrName} n'a pas pu accepter votre demande pour le moment.`,
          link: data.accepted ? "/eleve" : "/moniteurs",
          category: "enrollments",
        });
        return { ok: true };
      }

      if (data.type === "instructor_status_changed") {
        const { data: roleRow } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", callerId)
          .eq("role", "admin")
          .maybeSingle();
        if (!roleRow) return { ok: false };

        const { data: inst } = await supabaseAdmin
          .from("instructors")
          .select("user_id")
          .eq("id", data.instructorId)
          .maybeSingle();
        if (!inst?.user_id) return { ok: false };

        await sendPushToUsers({
          userIds: [inst.user_id],
          title: data.status === "active" ? "Profil partenaire validé !" : "Profil partenaire suspendu",
          body:
            data.status === "active"
              ? "Votre profil est maintenant visible dans l'annuaire PermiConduit."
              : "Votre profil a été temporairement suspendu par l'administration.",
          link: "/pro",
          category: "admin",
        });
        return { ok: true };
      }

      if (data.type === "lesson_event") {
        const { data: student } = await supabaseAdmin
          .from("students")
          .select("id, user_id, instructor_id, full_name, license_type")
          .eq("id", data.studentId)
          .maybeSingle();
        if (!student) return { ok: false };

        const { data: inst } = await supabaseAdmin
          .from("instructors")
          .select("user_id, first_name, last_name")
          .eq("id", student.instructor_id)
          .maybeSingle();
        if (!inst || inst.user_id !== callerId) return { ok: false };

        if (!student.user_id) return { ok: true };

        const { date, time } = formatTunisDateTime(data.startsAt);
        const instrName = `${inst.first_name} ${inst.last_name}`.trim();
        const loc = data.location ? ` · Lieu : ${data.location}` : "";

        const title =
          data.action === "created"
            ? data.count && data.count > 1
              ? `${data.count} nouvelles séances programmées`
              : "Nouvelle séance programmée"
            : data.action === "updated"
              ? "Séance modifiée"
              : "Séance annulée";

        const body =
          data.action === "created"
            ? data.count && data.count > 1
              ? `${instrName} a planifié ${data.count} séances (Permis ${student.license_type}) à partir du ${date} à ${time}${loc}.`
              : `Séance avec ${instrName} (Permis ${student.license_type}) le ${date} à ${time}${loc}.`
            : data.action === "updated"
              ? `Votre séance avec ${instrName} a été mise à jour : ${date} à ${time}${loc}.`
              : `Votre séance du ${date} à ${time} avec ${instrName} a été annulée.`;

        await sendPushToUsers({
          userIds: [student.user_id],
          title,
          body,
          link: "/eleve/planning",
          category: "lessons",
        });
        return { ok: true };
      }

      if (data.type === "new_partner_signup") {
        const { data: admins } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        const adminIds = (admins ?? []).map((a) => a.user_id);
        if (adminIds.length > 0) {
          await sendPushToUsers({
            userIds: adminIds,
            title: "Nouvelle demande de partenariat",
            body: "Un nouveau moniteur souhaite rejoindre PermiConduit. Consultez sa demande et prenez une décision.",
            link: "/admin/moniteurs",
            category: "admin",
          });
        }
        return { ok: true };
      }

      return { ok: true };
    } catch (err) {
      console.error("[Push] dispatch error:", err);
      return { ok: false };
    }
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendPushToUsers } = await import("@/lib/fcm.server");
    return sendPushToUsers({
      userIds: [context.userId],
      title: "Test PermiConduit",
      body: "Les notifications Push fonctionnent correctement sur cet appareil !",
      link: "/espace",
      category: "general",
    });
  });
