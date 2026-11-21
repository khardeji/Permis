import { describe, expect, it } from "vitest";
import { completeGallery } from "@/lib/driving-images";
import { demoInstructors, isDemoInstructor, withDemoInstructors } from "@/lib/demo-instructors";

describe("Public media and demo safety", () => {
  it("preserves uploaded photos when completing a sparse gallery", () => {
    const uploaded = { id: "real", image_url: "https://example.test/car.jpg", caption: "Voiture du moniteur" };
    const result = completeGallery([uploaded]);
    expect(result[0]).toEqual(uploaded);
    expect(result).toHaveLength(5);
    expect(result.slice(1).every((photo) => photo.caption?.includes("Illustration"))).toBe(true);
  });
  it("never replaces a real directory with demonstration profiles", () => {
    const sample = demoInstructors[0];
    if (!sample) throw new Error("Missing sample");
    const real = [{ ...sample, id: "real-instructor" }];
    expect(withDemoInstructors(real)).toBe(real);
    expect(withDemoInstructors([])).toHaveLength(6);
    expect(isDemoInstructor(real[0]?.id ?? "")).toBe(false);
    expect(demoInstructors.every((i) => isDemoInstructor(i.id))).toBe(true);
  });
});