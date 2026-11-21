import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-10 place-items-center overflow-hidden rounded-xl bg-navy p-1.5 shadow-glow",
        className,
      )}
      aria-hidden="true"
    >
      <img
        src="/logo-mark.png"
        alt=""
        className="size-full object-contain"
        decoding="async"
      />
    </span>
  );
}

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn("inline-flex items-center", className)} aria-label="PermiConduit — accueil">
      <img
        src={light ? "/logo-dark.png" : "/logo-light.png"}
        alt="PermiConduit — Votre permis commence ici."
        className={cn("h-11 w-auto object-contain", light && "h-12")}
        decoding="async"
      />
    </Link>
  );
}
