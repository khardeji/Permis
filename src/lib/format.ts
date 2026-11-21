import { format, formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";

export function formatDT(amount: number | null | undefined) {
  const n = Number(amount ?? 0);
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} DT`;
}

export function fmtDate(d: string | Date, pattern = "dd/MM/yyyy") {
  return format(typeof d === "string" ? new Date(d) : d, pattern, { locale: fr });
}

export function fmtTime(d: string | Date) {
  return format(typeof d === "string" ? new Date(d) : d, "HH:mm", { locale: fr });
}

export function fmtRelative(d: string | Date) {
  return formatDistanceToNowStrict(typeof d === "string" ? new Date(d) : d, { locale: fr, addSuffix: true });
}

export function fmtHours(h: number) {
  const rounded = Math.round(h * 10) / 10;
  return `${rounded.toLocaleString("fr-FR")} h`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function waLink(phone: string | null | undefined, text?: string) {
  const digits = (phone ?? "").replace(/[^\d]/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function telLink(phone: string | null | undefined) {
  return `tel:${(phone ?? "").replace(/\s+/g, "")}`;
}
