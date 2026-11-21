export function workspaceHead(title: string) {
  const description = `${title} : espace privé de gestion et de suivi PermiConduit.`;
  return { meta: [
    { title: `${title} — PermiConduit` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — PermiConduit` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] };
}