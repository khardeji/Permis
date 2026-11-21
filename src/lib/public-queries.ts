import { queryOptions } from "@tanstack/react-query";
import {
  getPublicInstructor,
  getPublicStats,
  listPublicGallery,
  listPublicInstructors,
  listSiteReviews,
} from "./public.functions";

export const instructorsQuery = () =>
  queryOptions({
    queryKey: ["public-instructors"],
    queryFn: () => listPublicInstructors(),
  });

export const instructorQuery = (slug: string) =>
  queryOptions({
    queryKey: ["public-instructor", slug],
    queryFn: () => getPublicInstructor({ data: { slug } }),
  });

export const publicGalleryQuery = () =>
  queryOptions({
    queryKey: ["public-gallery"],
    queryFn: () => listPublicGallery(),
  });

export const siteReviewsQuery = () =>
  queryOptions({
    queryKey: ["site-reviews"],
    queryFn: () => listSiteReviews(),
  });

export const publicStatsQuery = () =>
  queryOptions({
    queryKey: ["public-stats"],
    queryFn: () => getPublicStats(),
  });
