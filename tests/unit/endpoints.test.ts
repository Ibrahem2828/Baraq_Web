import { describe, expect, it } from "vitest";
import { endpoints } from "@/lib/api/endpoints";

describe("endpoints contract", () => {
  it("builds detail paths with a trailing slash (Django requires one)", () => {
    expect(endpoints.studyPlans.detail(42)).toBe("/study-plans/42/");
    expect(endpoints.quizzes.detail("7")).toBe("/quizzes/7/");
    expect(endpoints.sources.detail(1)).toBe("/student-sources/1/");
  });

  it("builds AI job paths from a public_id string, not a numeric id", () => {
    const publicId = "3fae2b8a-1111-2222-3333-444455556666";
    expect(endpoints.ai.job(publicId)).toBe(`/ai/jobs/${publicId}/`);
    expect(endpoints.ai.jobCancel(publicId)).toBe(`/ai/jobs/${publicId}/cancel/`);
  });

  it("builds project paths from public_id (UUID), matching the backend's non-integer lookup", () => {
    expect(endpoints.projects.detail("abc-123")).toBe("/projects/abc-123/");
    expect(endpoints.projects.archive("abc-123")).toBe("/projects/abc-123/archive/");
  });

  it("exposes static route strings for list endpoints", () => {
    expect(endpoints.auth.login).toBe("/auth/login/");
    expect(endpoints.subjects.educationStages).toBe("/education-stages/");
  });
});
