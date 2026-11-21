import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtRelative } from "@/lib/format";

export function NotificationsBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });
  const unread = data.filter((n) => !n.read).length;

  async function markAll() {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {unread > 0 && <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">{unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-semibold text-primary">Notifications</p>
          {unread > 0 && <button onClick={markAll} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><CheckCheck className="size-3.5" /> Tout lire</button>}
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {data.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune notification</li>}
          {data.map((n) => (
            <li key={n.id} className={`border-b border-border px-4 py-3 last:border-0 ${n.read ? "" : "bg-brand-soft/50"}`}>
              {n.link ? <Link to={n.link} className="block"><Item n={n} /></Link> : <Item n={n} />}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function Item({ n }: { n: { title: string; body: string | null; created_at: string } }) {
  return (
    <>
      <p className="text-sm font-semibold text-primary">{n.title}</p>
      {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
      <p className="mt-1 text-[11px] text-muted-foreground">{fmtRelative(n.created_at)}</p>
    </>
  );
}
