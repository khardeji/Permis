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

export type PublicGalleryPhoto = {
  id: string;
  image_url: string;
  caption: string | null;
  position: number;
};

export type SiteReview = {
  id: string;
  user_id: string;
  author_name: string;
  author_role: string;
  city: string | null;
  rating: number;
  comment: string;
  created_at: string;
};

export type InstructorReview = {
  id: string;
  instructor_id: string;
  student_user_id: string;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

export type PublicStats = {
  instructors_count: number;
  students_count: number;
  cities_count: number;
  reviews_count: number;
  avg_rating: number | null;
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

    const instructorId = (inst as { id: string }).id;
    const [{ data: gallery }, { data: reviews }] = await Promise.all([
      sb
        .from("galleries")
        .select("id, image_url, caption, position")
        .eq("instructor_id", instructorId)
        .order("position"),
      (sb as unknown as { from: (t: string) => any })
        .from("instructor_reviews")
        .select("id, instructor_id, student_user_id, author_name, rating, comment, created_at")
        .eq("instructor_id", instructorId)
        .order("created_at", { ascending: false }),
    ]);

    return {
      instructor: inst as unknown as PublicInstructor,
      gallery: (gallery ?? []) as PublicGalleryPhoto[],
      reviews: (reviews ?? []) as InstructorReview[],
    };
  });

export const listPublicGallery = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data: active } = await sb.from("instructors").select("id, first_name, last_name").eq("status", "active");
  const activeIds = (active ?? []).map((i) => i.id);
  if (activeIds.length === 0) return [] as PublicGalleryPhoto[];

  const { data, error } = await sb
    .from("galleries")
    .select("id, image_url, caption, position")
    .in("instructor_id", activeIds)
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) return [] as PublicGalleryPhoto[];
  return (data ?? []) as PublicGalleryPhoto[];
});

export const listSiteReviews = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient() as unknown as { from: (t: string) => any };
  const { data, error } = await sb
    .from("site_reviews")
    .select("id, user_id, author_name, author_role, city, rating, comment, created_at")
    .order("created_at", { ascending: false })
    .limit(24);
  if (error) return [] as SiteReview[];
  return (data ?? []) as SiteReview[];
});

export const getPublicStats = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient() as unknown as { rpc: (fn: string) => Promise<{ data: any; error: any }> };
  const { data, error } = await sb.rpc("get_public_stats");
  if (error || !data) {
    return {
      instructors_count: 0,
      students_count: 0,
      cities_count: 0,
      reviews_count: 0,
      avg_rating: null,
    } satisfies PublicStats;
  }
  return {
    instructors_count: Number(data.instructors_count ?? 0),
    students_count: Number(data.students_count ?? 0),
    cities_count: Number(data.cities_count ?? 0),
    reviews_count: Number(data.reviews_count ?? 0),
    avg_rating: data.avg_rating !== null && data.avg_rating !== undefined ? Number(data.avg_rating) : null,
  } satisfies PublicStats;
});
