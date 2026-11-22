import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPageView } from "@/components/dashboard/NotificationCenter";

export const Route = createFileRoute("/_authenticated/eleve/notifications")({
  head: () => workspaceHead("Mes notifications — Espace Élève"),
  component: () => <NotificationsPageView role="student" />,
});
