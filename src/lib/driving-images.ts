import car from "@/assets/driving-school-car.jpg";
import lesson from "@/assets/driving-lesson.jpg";
import classroom from "@/assets/driving-classroom.jpg";
import coast from "@/assets/coastal-driving.jpg";
import city from "@/assets/tunis-driving.jpg";

export const drivingImages = [
  { id: "illustration-car", image_url: car, caption: "Véhicule d’apprentissage · Illustration" },
  { id: "illustration-lesson", image_url: lesson, caption: "Séance de conduite · Illustration" },
  { id: "illustration-classroom", image_url: classroom, caption: "Cours de code · Illustration" },
  { id: "illustration-coast", image_url: coast, caption: "Conduite sur route côtière · Illustration" },
  { id: "illustration-city", image_url: city, caption: "Conduite en ville · Illustration" },
];

export function drivingCover(slug: string) {
  const index = Array.from(slug).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % drivingImages.length;
  return drivingImages[index]?.image_url ?? car;
}

export function completeGallery<T extends { id: string; image_url: string; caption: string | null }>(photos: T[]) {
  const valid = photos.filter((photo) => photo.image_url.trim());
  const used = new Set(valid.map((photo) => photo.image_url));
  const extras = drivingImages.filter((photo) => !used.has(photo.image_url)).slice(0, Math.max(0, 5 - valid.length));
  return [...valid, ...extras];
}