import { createSign } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type NotificationCategory = "enrollments" | "lessons" | "reminders" | "admin" | "general";

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function getServiceAccount(): ServiceAccount | null {
  const rawJson = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as Partial<ServiceAccount>;
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          project_id: parsed.project_id,
          client_email: parsed.client_email,
          private_key: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      console.error("[FCM] Invalid FIREBASE_SERVICE_ACCOUNT_JSON");
    }
  }

  const project_id = process.env["FIREBASE_PROJECT_ID"];
  const client_email = process.env["FIREBASE_CLIENT_EMAIL"];
  const private_key = process.env["FIREBASE_PRIVATE_KEY"]?.replace(/\\n/g, "\n");
  if (project_id && client_email && private_key) {
    return { project_id, client_email, private_key };
  }
  return null;
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getGoogleAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60) {
    return cachedAccessToken.token;
  }

  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      aud: "https://oauth2.googleapis.com/token",
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      iat: now,
      exp: now + 3600,
    }),
  );

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = base64Url(signer.sign(sa.private_key));
  const assertion = `${header}.${payload}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FCM OAuth error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 3500),
  };
  return data.access_token;
}

export function formatTunisDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("fr-TN", {
    timeZone: "Africa/Tunis",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
  const time = new Intl.DateTimeFormat("fr-TN", {
    timeZone: "Africa/Tunis",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return { date, time };
}

function isCategoryAllowed(
  pref: Record<string, unknown> | undefined,
  category: NotificationCategory,
): boolean {
  if (!pref) return true;
  if (pref["push_enabled"] === false) return false;
  if (category === "enrollments" && pref["enrollments"] === false) return false;
  if (category === "lessons" && pref["lessons"] === false) return false;
  if (category === "reminders" && pref["reminders"] === false) return false;
  if (category === "admin" && pref["admin_alerts"] === false) return false;
  return true;
}

export async function sendPushToUsers(params: {
  userIds: string[];
  title: string;
  body: string;
  link?: string;
  category: NotificationCategory;
  insertInApp?: boolean;
}): Promise<{ sent: number; failed: number; pruned: number }> {
  const uniqueIds = [...new Set(params.userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return { sent: 0, failed: 0, pruned: 0 };

  const admin = supabaseAdmin as unknown as { from: (t: string) => any };

  if (params.insertInApp) {
    await admin.from("notifications").insert(
      uniqueIds.map((user_id) => ({
        user_id,
        title: params.title,
        body: params.body,
        link: params.link ?? null,
        category: params.category,
      })),
    );
  }

  const sa = getServiceAccount();
  if (!sa) {
    return { sent: 0, failed: 0, pruned: 0 };
  }

  const [{ data: prefs }, { data: tokens }] = await Promise.all([
    admin.from("notification_preferences").select("*").in("user_id", uniqueIds),
    admin.from("fcm_tokens").select("id, user_id, token").in("user_id", uniqueIds),
  ]);

  const prefMap = new Map<string, Record<string, unknown>>(
    ((prefs ?? []) as Record<string, unknown>[]).map((p) => [String(p["user_id"]), p]),
  );

  const eligibleTokens = ((tokens ?? []) as { id: string; user_id: string; token: string }[]).filter(
    (t) => isCategoryAllowed(prefMap.get(t.user_id), params.category),
  );

  if (eligibleTokens.length === 0) return { sent: 0, failed: 0, pruned: 0 };

  const accessToken = await getGoogleAccessToken(sa);
  const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  let sent = 0;
  let failed = 0;
  const deadTokenIds: string[] = [];

  await Promise.all(
    eligibleTokens.map(async (entry) => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: entry.token,
              notification: {
                title: params.title,
                body: params.body,
              },
              data: {
                title: params.title,
                body: params.body,
                link: params.link ?? "/",
                category: params.category,
              },
              webpush: {
                fcm_options: {
                  link: params.link ?? "/",
                },
                notification: {
                  icon: "/logo-mark.png",
                  badge: "/favicon.png",
                },
              },
            },
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          failed++;
          const errText = await res.text();
          if (errText.includes("UNREGISTERED") || errText.includes("INVALID_ARGUMENT")) {
            deadTokenIds.push(entry.id);
          }
        }
      } catch {
        failed++;
      }
    }),
  );

  if (deadTokenIds.length > 0) {
    await admin.from("fcm_tokens").delete().in("id", deadTokenIds);
  }

  return { sent, failed, pruned: deadTokenIds.length };
}
