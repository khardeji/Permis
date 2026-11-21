import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Uploads into the caller's own folder of the private media bucket and returns a long-lived link. */
export async function uploadMedia(file: File, kind: "avatar" | "cover" | "gallery") {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Connexion requise");
  if (!file.type.startsWith("image/")) throw new Error("Veuillez choisir une image");
  if (file.size > 8 * 1024 * 1024) throw new Error("Image trop lourde (8 Mo max)");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${u.user.id}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("instructor-media").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage.from("instructor-media").createSignedUrl(path, TEN_YEARS);
  if (e2 || !data) throw e2 ?? new Error("Lien indisponible");
  return data.signedUrl;
}
