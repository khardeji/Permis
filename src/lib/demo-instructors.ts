import type { PublicInstructor } from "./public.functions";
import woman from "@/assets/demo-instructor-woman.jpg";
import man from "@/assets/demo-instructor-man.jpg";
import { drivingCover } from "./driving-images";

const entries = [
  ["leila-hamdi", "Leïla", "Hamdi", "Ariana", 8, woman, "Approche douce et rassurante, idéale pour les conducteurs anxieux."],
  ["sami-ben-ali", "Sami", "Ben Ali", "Tunis", 12, man, "Moniteur patient et pédagogue, spécialiste des élèves débutants."],
  ["nizar-bouazizi", "Nizar", "Bouazizi", "Nabeul", 10, "/images/instructors/nizar.jpg", "Spécialiste moto et scooter, passionné de sécurité routière."],
  ["amira-mansour", "Amira", "Mansour", "Sousse", 7, "/images/instructors/amira.jpg", "Un accompagnement progressif pour gagner confiance au volant."],
  ["youssef-trabelsi", "Youssef", "Trabelsi", "Sfax", 15, "/images/instructors/youssef.jpg", "Préparation à l’examen et perfectionnement de la conduite."],
  ["rim-jaziri", "Rim", "Jaziri", "Bizerte", 9, "/images/instructors/rim.jpg", "Apprentissage du code et de la conduite en toute sérénité."],
] as const;

export const demoInstructors: PublicInstructor[] = entries.map(([slug, first_name, last_name, city, experience_years, avatar_url, short_bio]) => ({
  id: `demo-${slug}`, slug, first_name, last_name, city, experience_years, avatar_url, short_bio,
  bio: short_bio, cover_url: drivingCover(slug), address: null, phone: null, whatsapp: null, email: null,
  services: ["Permis B (voiture)", "Code de la route", "Préparation à l’examen"],
  availability: [], accepting_students: true, price_per_hour: null, rating: 0,
}));

export const isDemoInstructor = (id: string) => id.startsWith("demo-");

export function withDemoInstructors(instructors: PublicInstructor[]) {
  return instructors.length > 0 ? instructors : demoInstructors;
}