import { useState, type ComponentType, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/site/Logo";
import { NotificationsBell } from "./NotificationsBell";
import { NotificationPermissionPrompt } from "./NotificationCenter";
import { supabase } from "@/integrations/supabase/client";
import { initials } from "@/lib/format";

export type NavItem = { to: string; label: string; icon: ComponentType<{ className?: string }>; exact?: boolean; badge?: number };

export function DashboardShell({
  nav, spaceLabel, userName, userSub, children, publicLink,
}: {
  nav: NavItem[];
  spaceLabel: string;
  userName: string;
  userSub?: string | undefined;
  children: ReactNode;
  publicLink?: { to: string; params?: Record<string, string>; label: string } | undefined;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <Link to="/" className="flex items-center gap-2.5 px-5 py-5">
        <LogoMark />
        <div>
          <p className="font-display text-lg font-bold text-sidebar-accent-foreground">Permi<span className="text-brand">Conduit</span></p>
          <p className="text-[11px] uppercase tracking-widest text-sidebar-foreground/60">{spaceLabel}</p>
        </div>
      </Link>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            onClick={() => setOpen(false)}
            activeOptions={n.exact === undefined ? {} : { exact: n.exact }}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft [&>svg]:text-sidebar-primary" }}
          >
            <n.icon className="size-[18px]" />
            <span className="flex-1">{n.label}</span>
            {n.badge ? <span className="rounded-full bg-sidebar-primary px-2 py-0.5 text-[11px] font-bold text-sidebar-primary-foreground">{n.badge}</span> : null}
          </Link>
        ))}
      </nav>
      {publicLink && (
        <div className="px-3 pb-2">
          <a
            href={publicLink.params ? publicLink.to.replace("$slug", publicLink.params["slug"] ?? "") : publicLink.to}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg border border-sidebar-border px-3 py-2.5 text-sm hover:bg-sidebar-accent"
          >
            <ExternalLink className="size-4" /> {publicLink.label}
          </a>
        </div>
      )}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid size-9 place-items-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">{initials(userName || "?")}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">{userName}</p>
            {userSub && <p className="truncate text-xs text-sidebar-foreground/60">{userSub}</p>}
          </div>
          <button onClick={signOut} className="rounded-md p-2 hover:bg-sidebar-accent" aria-label="Se déconnecter" title="Se déconnecter">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary/50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu className="size-5" /></Button>
          <div className="flex-1" />
          <NotificationsBell />
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</main>
        <NotificationPermissionPrompt />
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-primary md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, hint, tone = "primary" }: {
  label: string; value: ReactNode; icon: ComponentType<{ className?: string }>; hint?: string;
  tone?: "primary" | "brand" | "success" | "warning" | "destructive";
}) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    brand: "bg-brand-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning-foreground",
    destructive: "bg-destructive-soft text-destructive",
  } as const;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={`grid size-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="size-5" /></span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-primary md:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-card shadow-soft ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          {title && <h2 className="font-display text-lg font-bold text-primary">{title}</h2>}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: ComponentType<{ className?: string }>; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-secondary text-muted-foreground"><Icon className="size-6" /></span>
      <p className="mt-3 font-semibold text-primary">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    scheduled: ["Programmée", "bg-brand-soft text-primary"],
    completed: ["Effectuée", "bg-success-soft text-success"],
    cancelled: ["Annulée", "bg-destructive-soft text-destructive"],
    pending: ["En attente", "bg-warning-soft text-warning-foreground"],
    accepted: ["Acceptée", "bg-success-soft text-success"],
    rejected: ["Refusée", "bg-destructive-soft text-destructive"],
    active: ["Actif", "bg-success-soft text-success"],
    suspended: ["Suspendu", "bg-destructive-soft text-destructive"],
    paused: ["En pause", "bg-warning-soft text-warning-foreground"],
    open: ["Ouvert", "bg-warning-soft text-warning-foreground"],
    resolved: ["Résolu", "bg-success-soft text-success"],
    dismissed: ["Classé", "bg-secondary text-muted-foreground"],
  };
  const [label, cls] = map[status] ?? [status, "bg-secondary text-muted-foreground"];
  if (status === "completed" && cls) return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}
