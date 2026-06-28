import { describe, it, expect } from "vitest";
import { prefillFromUrl } from "./prefill";

describe("prefillFromUrl", () => {
  it("maps known platforms to their field", () => {
    expect(prefillFromUrl("https://bahr.sa/u/ammar")?.field).toBe("bahr_profile_url");
    expect(prefillFromUrl("mostaql.com/u/ammar")?.field).toBe("mostaql_profile_url");
    expect(prefillFromUrl("https://www.linkedin.com/in/ammar")?.platform).toBe("linkedin");
    expect(prefillFromUrl("https://khamsat.com/user/x")?.field).toBe("khamsat_profile_url");
  });
  it("adds a soft specialty hint where the platform implies a discipline", () => {
    expect(prefillFromUrl("https://behance.net/ammar")?.specialtyHint).toBe("graphic-design");
    expect(prefillFromUrl("https://dribbble.com/ammar")?.specialtyHint).toBe("ui-ux-design");
  });
  it("treats any other valid host as a personal website", () => {
    const r = prefillFromUrl("https://ammar.design");
    expect(r?.platform).toBe("website");
    expect(r?.field).toBe("personal_website_url");
  });
  it("normalizes a bare host and strips www", () => {
    expect(prefillFromUrl("www.linkedin.com/in/x")?.platform).toBe("linkedin");
  });
  it("rejects empty / non-URL input", () => {
    expect(prefillFromUrl("")).toBeNull();
    expect(prefillFromUrl("   ")).toBeNull();
    expect(prefillFromUrl("not a url")).toBeNull();
  });
});
