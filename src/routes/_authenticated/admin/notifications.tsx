import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPageView } from "@/components/dashboard/NotificationCenter";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  head: () => workspaceHead("Mes notifications — Administration"),
  component: () => <NotificationsPageView role="admin" />,
});
