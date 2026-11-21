import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const url =
    process.env["SUPABASE_URL"] ||
    process.env["VITE_SUPABASE_URL"] ||
    import.meta.env.VITE_SUPABASE_URL;
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY",
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const PUBLIC_COLUMNS =
  "id, slug, first_name, last_name, city, address, phone, whatsapp, email, short_bio, bio, experience_years, avatar_url, cover_url, services, availability, accepting_students, price_per_hour, rating";

export type PublicInstructor = {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  city: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  short_bio: string | null;
  bio: string | null;
  experience_years: number | null;
  avatar_url: string | null;
  cover_url: string | null;
  services: string[];
  availability: { day: string; hours: string }[];
  accepting_students: boolean;
  price_per_hour: number | null;
  rating: number;
};

export const listPublicInstructors = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("instructors")
    .select(PUBLIC_COLUMNS)
    .eq("status", "active")
    .order("rating", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PublicInstructor[];
});

export const getPublicInstructor = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => ({ slug: String(input.slug).slice(0, 120) }))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: inst, error } = await sb
      .from("instructors")
      .select(PUBLIC_COLUMNS)
      .eq("slug", data.slug)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inst) return null;
    const { data: gallery } = await sb
      .from("galleries")
      .select("id, image_url, caption, position")
      .eq("instructor_id", (inst as { id: string }).id)
      .order("position");
    return { instructor: inst as unknown as PublicInstructor, gallery: gallery ?? [] };
  });
