import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, BellRing, Check, CheckCheck, Loader2, Send, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles, type Role } from "@/lib/auth";
import { detectDeviceLabel, isPushSupported, requestFcmToken } from "@/lib/firebase-web";
import { sendTestPush } from "@/lib/notifications.functions";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

type Prefs = {
  push_enabled: boolean;
  enrollments: boolean;
  lessons: boolean;
  reminders: boolean;
  admin_alerts: boolean;
};

type FcmTokenRow = {
  id: string;
  token: string;
  device_label: string | null;
  updated_at: string;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  category?: string | null;
  created_at: string;
};

const DEFAULT_PREFS: Prefs = {
  push_enabled: true,
  enrollments: true,
  lessons: true,
  reminders: true,
  admin_alerts: true,
};

export function NotificationSettingsCard({ role }: { role: Role }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enabling, setEnabling] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    isPushSupported().then(setSupported);
  }, []);

  const { data: prefs = DEFAULT_PREFS } = useQuery({
    queryKey: ["notification-prefs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as unknown as { from: (t: string) => any })
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!data) return DEFAULT_PREFS;
      return {
        push_enabled: data.push_enabled ?? true,
        enrollments: data.enrollments ?? true,
        lessons: data.lessons ?? true,
        reminders: data.reminders ?? true,
        admin_alerts: data.admin_alerts ?? true,
      } satisfies Prefs;
    },
  });

  const { data: tokens = [] } = useQuery({
    queryKey: ["fcm-tokens", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as unknown as { from: (t: string) => any })
        .from("fcm_tokens")
        .select("id, token, device_label, updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      return (data ?? []) as FcmTokenRow[];
    },
  });

  async function savePrefs(patch: Partial<Prefs>) {
    if (!user) return;
    const next = { ...prefs, ...patch };
    const { error } = await (supabase as unknown as { from: (t: string) => any })
      .from("notification_preferences")
      .upsert(
        { user_id: user.id, ...next, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (error) {
      toast.error("Impossible d'enregistrer vos préférences", { description: error.message });
      return;
    }
    qc.invalidateQueries({ queryKey: ["notification-prefs", user.id] });
    toast.success("Préférences enregistrées");
  }

  async function enablePushOnDevice() {
    if (!user) return;
    setEnabling(true);
    try {
      const res = await requestFcmToken();
      if (!res.token) {
        toast.error("Activation impossible", { description: res.reason });
        return;
      }
      const { error } = await (supabase as unknown as { from: (t: string) => any })
        .from("fcm_tokens")
        .upsert(
          {
            user_id: user.id,
            role,
            token: res.token,
            device_label: detectDeviceLabel(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "token" },
        );
      if (error) throw error;
      if (!prefs.push_enabled) {
        await savePrefs({ push_enabled: true });
      }
      qc.invalidateQueries({ queryKey: ["fcm-tokens", user.id] });
      toast.success("Notifications Push activées sur cet appareil !");
    } catch (err) {
      toast.error("Erreur lors de l'activation", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setEnabling(false);
    }
  }

  async function testPush() {
    setTesting(true);
    try {
      const res = await sendTestPush();
      if (res.sent > 0) {
        toast.success(`Notification test envoyée (${res.sent} appareil${res.sent > 1 ? "s" : ""}) !`);
      } else {
        toast.error("Aucune notification envoyée", {
          description: res.error || "Vérifiez que cet appareil est bien activé.",
        });
      }
    } catch (err) {
      toast.error("Échec du test Push", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setTesting(false);
    }
  }

  async function removeDevice(id: string) {
    const { error } = await (supabase as unknown as { from: (t: string) => any })
      .from("fcm_tokens")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Suppression impossible", { description: error.message });
      return;
    }
    qc.invalidateQueries({ queryKey: ["fcm-tokens", user?.id] });
    toast.success("Appareil retiré");
  }

  const categoryItems: { key: keyof Prefs; label: string; desc: string }[] =
    role === "admin"
      ? [
          {
            key: "admin_alerts",
            label: "Demandes de partenariat & validations",
            desc: "Nouveaux moniteurs inscrits, validations en attente et signalements.",
          },
          {
            key: "enrollments",
            label: "Activité des inscriptions élèves",
            desc: "Suivi administratif des nouvelles demandes d'inscription sur la plateforme.",
          },
        ]
      : role === "instructor"
        ? [
            {
              key: "enrollments",
              label: "Demandes d'inscription de vos élèves",
              desc: "Alerte dès qu'un nouvel élève demande à s'inscrire avec vous.",
            },
            {
              key: "lessons",
              label: "Planning & séances de conduite",
              desc: "Confirmations, modifications ou annulations de séances avec vos élèves.",
            },
            {
              key: "reminders",
              label: "Rappels 1 heure avant vos séances",
              desc: "Rappel automatique avant chaque leçon programmée (heure de Tunisie).",
            },
            {
              key: "admin_alerts",
              label: "Décisions de l'administration",
              desc: "Validation ou mise à jour du statut de votre compte partenaire.",
            },
          ]
        : [
            {
              key: "enrollments",
              label: "Suivi de mon inscription",
              desc: "Confirmation d'envoi, acceptation ou refus par votre moniteur.",
            },
            {
              key: "lessons",
              label: "Mes séances de conduite",
              desc: "Nouvelle séance programmée, modifiée ou annulée par votre moniteur.",
            },
            {
              key: "reminders",
              label: "Rappel 1 heure avant ma séance",
              desc: "Alerte automatique avant chaque leçon prévue (heure de Tunisie).",
            },
          ];

  return (
    <Panel title="Paramètres des notifications">
      <div className="space-y-5">
        <div className="rounded-xl border border-brand/25 bg-brand-soft/50 p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/15 text-primary">
              <BellRing className="size-5 text-brand" />
            </span>
            <div className="flex-1">
              <p className="font-semibold text-primary">Recevez vos alertes même site fermé</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Activez les notifications Push pour recevoir vos rappels 1 heure avant chaque séance, les nouvelles
                demandes et les validations directement sur votre téléphone ou ordinateur.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {supported === false ? (
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BellOff className="size-3.5" /> Non pris en charge sur ce navigateur.
                  </p>
                ) : (
                  <Button type="button" size="sm" variant="brand" disabled={enabling} onClick={enablePushOnDevice}>
                    {enabling ? <Loader2 className="animate-spin" /> : <Bell />}
                    Activer sur cet appareil
                  </Button>
                )}
                {tokens.length > 0 && (
                  <Button type="button" size="sm" variant="outline" disabled={testing} onClick={testPush}>
                    {testing ? <Loader2 className="animate-spin" /> : <Send className="size-3.5" />}
                    Envoyer un test
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3">
            <div>
              <p className="text-sm font-semibold text-primary">Notifications Push</p>
              <p className="text-xs text-muted-foreground">
                Désactiver les Push conserve tout votre historique dans votre espace.
              </p>
            </div>
            <Switch
              checked={prefs.push_enabled}
              onCheckedChange={(v) => savePrefs({ push_enabled: v })}
            />
          </label>

          {categoryItems.map((c) => (
              <label key={c.key} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-medium text-primary">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
                <Switch
                  checked={prefs[c.key]}
                  onCheckedChange={(v) => savePrefs({ [c.key]: v })}
                />
              </label>
            ))}
        </div>

        {tokens.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Appareils enregistrés ({tokens.length})
            </p>
            <ul className="space-y-2">
              {tokens.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs"
                >
                  <span className="inline-flex items-center gap-2 text-primary">
                    <Smartphone className="size-3.5 text-brand" />
                    <span className="font-medium">{t.device_label || "Appareil Web"}</span>
                    <span className="text-muted-foreground">· {fmtRelative(t.updated_at)}</span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    title="Retirer cet appareil"
                    onClick={() => removeDevice(t.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  );
}

export function NotificationsPageView({ role }: { role: Role }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["notifications-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

  const unreadCount = rows.filter((n) => !n.read).length;
  const visible = filter === "unread" ? rows.filter((n) => !n.read) : rows;

  async function markOne(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-all"] });
  }

  async function markAll() {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-all"] });
    toast.success("Toutes les notifications ont été marquées comme lues");
  }

  return (
    <>
      <PageHeader
        title="Mes notifications"
        subtitle="Consultez votre historique et gérez vos préférences de notifications Push."
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" onClick={markAll}>
              <CheckCheck /> Tout marquer comme lu
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Panel
          title={`Historique (${visible.length})`}
          action={
            <div className="flex rounded-lg border border-border bg-secondary/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-semibold transition",
                  filter === "all" ? "bg-card text-primary shadow-soft" : "text-muted-foreground",
                )}
              >
                Toutes
              </button>
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-semibold transition",
                  filter === "unread" ? "bg-card text-primary shadow-soft" : "text-muted-foreground",
                )}
              >
                Non lues ({unreadCount})
              </button>
            </div>
          }
        >
          {isLoading ? (
            <p className="py-12 text-center text-muted-foreground">Chargement…</p>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={filter === "unread" ? "Aucune notification non lue" : "Aucune notification"}
              text="Vos alertes apparaîtront ici automatiquement."
            />
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "flex items-start justify-between gap-3 py-3.5 first:pt-0 last:pb-0",
                    !n.read && "rounded-xl bg-brand-soft/40 px-3",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    {n.link ? (
                      <Link
                        to={n.link}
                        onClick={() => !n.read && markOne(n.id)}
                        className="block hover:underline"
                      >
                        <p className="text-sm font-semibold text-primary">{n.title}</p>
                        {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                      </Link>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-primary">{n.title}</p>
                        {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                      </>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">{fmtRelative(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      title="Marquer comme lu"
                      onClick={() => markOne(n.id)}
                    >
                      <Check className="size-4 text-brand" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div>
          <NotificationSettingsCard role={role} />
        </div>
      </div>
    </>
  );
}

const PROMPT_DISMISS_KEY = "permiconduit_push_prompt_dismissed_v1";

export function NotificationPermissionPrompt() {
  const { user } = useAuth();
  const { data: roles = [] } = useRoles();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const primaryRole: Role = roles.includes("admin")
    ? "admin"
    : roles.includes("instructor")
      ? "instructor"
      : "student";

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    if (!("Notification" in window) || Notification.permission !== "default") return;
    try {
      if (sessionStorage.getItem(PROMPT_DISMISS_KEY) === "1") return;
    } catch {
      // ignore
    }
    isPushSupported().then((ok) => {
      if (ok && Notification.permission === "default") {
        setOpen(true);
      }
    });
  }, [user]);

  function dismiss() {
    setOpen(false);
    try {
      sessionStorage.setItem(PROMPT_DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  async function accept() {
    if (!user) return;
    setBusy(true);
    try {
      const res = await requestFcmToken();
      if (!res.token) {
        toast.error("Activation impossible", { description: res.reason });
        setOpen(false);
        return;
      }
      const { error } = await (supabase as unknown as { from: (t: string) => any })
        .from("fcm_tokens")
        .upsert(
          {
            user_id: user.id,
            role: primaryRole,
            token: res.token,
            device_label: detectDeviceLabel(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "token" },
        );
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["fcm-tokens", user.id] });
      toast.success("Notifications activées sur cet appareil !");
      setOpen(false);
    } catch (err) {
      toast.error("Erreur lors de l'activation", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
            <BellRing className="size-6" />
          </div>
          <DialogTitle>Activer les notifications PermiConduit ?</DialogTitle>
          <DialogDescription>
            Recevez vos rappels 1 heure avant chaque séance, les nouvelles demandes d'inscription et les mises à jour
            importantes directement sur votre appareil, même lorsque l'application est fermée.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={dismiss} disabled={busy}>
            Plus tard
          </Button>
          <Button type="button" variant="brand" onClick={accept} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Bell />}
            Autoriser les notifications
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
