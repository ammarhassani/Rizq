import { describe, it, expect } from "vitest";
import { resolveSpecialty } from "./specialtyResolve";

describe("resolveSpecialty", () => {
  it("no profile specialty → trusts the AI (fallback unchanged)", () => {
    expect(resolveSpecialty({ primarySlug: null, aiSlug: "logo-design" })).toBe("logo-design");
    expect(resolveSpecialty({ primarySlug: "", aiSlug: "web-dev" })).toBe("web-dev");
  });
  it("off-discipline AI guess → anchors to the profile primary (the disambiguation fix)", () => {
    // graphic designer; AI tagged the brand brief as logo-design → keep graphic-design
    expect(resolveSpecialty({ primarySlug: "graphic-design", listedSlugs: [], aiSlug: "logo-design" })).toBe("graphic-design");
  });
  it("AI matches one of the freelancer's listed disciplines → trusts the AI (multi-discipline)", () => {
    expect(
      resolveSpecialty({ primarySlug: "graphic-design", listedSlugs: ["graphic-design", "web-dev"], aiSlug: "web-dev" })
    ).toBe("web-dev");
  });
  it("primary is always implicitly a listed discipline", () => {
    expect(resolveSpecialty({ primarySlug: "logo-design", listedSlugs: null, aiSlug: "logo-design" })).toBe("logo-design");
  });
});
