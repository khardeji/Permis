import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { t } from "@/i18n";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: t("nav.home") },
  { to: "/moniteurs", label: t("nav.instructors") },
  { to: "/comment-ca-marche", label: t("nav.how") },
  { to: "/a-propos", label: t("nav.about") },
  { to: "/contact", label: t("nav.contact") },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              activeProps={{ className: "text-primary" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <Button asChild>
              <Link to="/espace">
                <LayoutDashboard /> {t("nav.space")}
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/auth">{t("nav.login")}</Link>
              </Button>
              <Button asChild variant="brand">
                <Link to="/inscription" search={{ type: "moniteur" }}>
                  {t("cta.partner")}
                </Link>
              </Button>
            </>
          )}
        </div>
        <button
          className="grid size-10 place-items-center rounded-lg border border-border lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      <div className={cn("border-t border-border bg-background lg:hidden", open ? "block" : "hidden")}>
        <nav className="container-page flex flex-col gap-1 py-4">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
            >
              {n.label}
            </Link>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2">
            {user ? (
              <Button asChild className="col-span-2">
                <Link to="/espace">{t("nav.space")}</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link to="/auth">{t("nav.login")}</Link>
                </Button>
                <Button asChild variant="brand">
                  <Link to="/inscription" search={{ type: "moniteur" }}>
                    {t("cta.partner")}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
