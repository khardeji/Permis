import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPageView } from "@/components/dashboard/NotificationCenter";

export const Route = createFileRoute("/_authenticated/pro/notifications")({
  head: () => workspaceHead("Mes notifications — Espace Moniteur"),
  component: () => <NotificationsPageView role="instructor" />,
});
