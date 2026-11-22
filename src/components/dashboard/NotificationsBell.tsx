import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Settings } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/lib/auth";
import { listenForegroundMessages } from "@/lib/firebase-web";
import { fmtRelative } from "@/lib/format";

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  } catch {
    // Ignore autoplay restrictions
  }
}

export function NotificationsBell() {
  const { user } = useAuth();
  const { data: roles = [] } = useRoles();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const notificationsRoute = roles.includes("admin")
    ? "/admin/notifications"
    : roles.includes("instructor")
      ? "/pro/notifications"
      : "/eleve/notifications";

  const { data = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;
    let unsubscribe: (() => void) | undefined;
    listenForegroundMessages((payload) => {
      const title = payload.notification?.title || payload.data?.["title"] || "Nouvelle notification";
      const body = payload.notification?.body || payload.data?.["body"];
      playNotificationChime();
      toast.info(title, body ? { description: body } : undefined);
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-all"] });
    }).then((unsub) => {
      unsubscribe = unsub;
    });
    return () => unsubscribe?.();
  }, [user, qc]);

  const unread = data.filter((n) => !n.read).length;

  async function markOne(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-all"] });
  }

  async function markAll() {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-all"] });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-semibold text-primary">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAll}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              <CheckCheck className="size-3.5" /> Tout lire
            </button>
          )}
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {data.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune notification</li>
          )}
          {data.map((n) => (
            <li
              key={n.id}
              className={`border-b border-border px-4 py-3 last:border-0 ${n.read ? "" : "bg-brand-soft/50"}`}
            >
              {n.link ? (
                <Link
                  to={n.link}
                  onClick={() => {
                    if (!n.read) markOne(n.id);
                    setOpen(false);
                  }}
                  className="block"
                >
                  <Item n={n} />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => !n.read && markOne(n.id)}
                  className="block w-full text-left"
                >
                  <Item n={n} />
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-4 py-2.5">
          <Link
            to={notificationsRoute}
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:text-brand"
          >
            <Settings className="size-3.5" /> Voir toutes mes notifications & paramètres
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Item({ n }: { n: { title: string; body: string | null; created_at: string; read: boolean } }) {
  return (
    <>
      <div className="flex items-center gap-1.5">
        {!n.read && <span className="size-2 shrink-0 rounded-full bg-brand" />}
        <p className="text-sm font-semibold text-primary">{n.title}</p>
      </div>
      {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
      <p className="mt-1 text-[11px] text-muted-foreground">{fmtRelative(n.created_at)}</p>
    </>
  );
}
