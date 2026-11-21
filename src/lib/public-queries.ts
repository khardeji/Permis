import { queryOptions } from "@tanstack/react-query";
import { getPublicInstructor, listPublicInstructors } from "./public.functions";
import { demoInstructors, withDemoInstructors } from "./demo-instructors";
import { drivingImages } from "./driving-images";

export const instructorsQuery = () =>
  queryOptions({ queryKey: ["public-instructors"], queryFn: async () => withDemoInstructors(await listPublicInstructors()) });

export const instructorQuery = (slug: string) =>
  queryOptions({ queryKey: ["public-instructor", slug], queryFn: async () => {
    const data = await getPublicInstructor({ data: { slug } });
    if (data) return data;
    const instructors = await listPublicInstructors();
    if (instructors.length > 0) return null;
    const demo = demoInstructors.find((i) => i.slug === slug || (slug === "leila-ben-ammar" && i.slug === "leila-hamdi"));
    return demo ? { instructor: demo, gallery: drivingImages.map((photo, position) => ({ ...photo, position })) } : null;
  } });
