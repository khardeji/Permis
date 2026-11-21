import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Mail, MapPin } from "lucide-react";
import { Logo } from "./Logo";
import { SITE } from "@/lib/site";
import { t } from "@/i18n";

export function Footer() {
  return (
    <footer className="bg-navy-gradient text-navy-foreground">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-sm text-sm text-navy-foreground/70">
            La plateforme qui relie les élèves aux meilleurs moniteurs de conduite en Tunisie.{" "}
            {SITE.slogan}
          </p>
          <div className="mt-6 flex gap-2">
            {[
              { href: SITE.socials.facebook, Icon: Facebook, label: "Facebook" },
              { href: SITE.socials.instagram, Icon: Instagram, label: "Instagram" },
              { href: SITE.socials.linkedin, Icon: Linkedin, label: "LinkedIn" },
            ].map(({ href, Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="grid size-10 place-items-center rounded-xl border border-navy-foreground/15 bg-navy-foreground/5 transition hover:bg-navy-foreground/15"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-navy-foreground/60">Plateforme</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/moniteurs" className="hover:text-brand">{t("nav.instructors")}</Link></li>
            <li><Link to="/comment-ca-marche" className="hover:text-brand">{t("nav.how")}</Link></li>
            <li><Link to="/a-propos" className="hover:text-brand">{t("nav.about")}</Link></li>
            <li><Link to="/inscription" search={{ type: "moniteur" }} className="hover:text-brand">{t("cta.partner")}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-navy-foreground/60">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 size-4 shrink-0 text-brand" />
              <a href={`mailto:${SITE.email}`} className="break-all hover:text-brand">{SITE.email}</a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" /> {SITE.country}
            </li>
            <li><Link to="/contact" className="hover:text-brand">Formulaire de contact →</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-foreground/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-navy-foreground/60 sm:flex-row">
          <p>© {new Date().getFullYear()} PermiConduit. {t("footer.rights")}</p>
          <p>{SITE.slogan}</p>
        </div>
      </div>
    </footer>
  );
}
