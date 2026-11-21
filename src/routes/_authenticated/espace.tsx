import { workspaceHead } from "@/lib/workspace-head";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { fetchRoles, homeForRoles } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/espace")({
  beforeLoad: async ({ context }) => {
    const roles = await fetchRoles(context.user.id);
    throw redirect({ to: homeForRoles(roles), replace: true });
  },
  head: () => workspaceHead("Mon espace"),
  component: () => null,
});
