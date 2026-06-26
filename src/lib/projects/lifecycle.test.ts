import { describe, it, expect } from "vitest";
import { resolveLifecycle, type LifecycleInput } from "./lifecycle";

const base: LifecycleInput = {
  proposal: null,
  hasProject: false,
  projectHasOriginProposal: false,
  gig: null,
  invoices: [],
};

function stateOf(input: LifecycleInput, key: "proposal" | "project" | "invoice") {
  return resolveLifecycle(input).stages.find((s) => s.key === key)!.state;
}

describe("resolveLifecycle — stage ① proposal", () => {
  it("is current at the very start (nothing exists)", () => {
    const r = resolveLifecycle(base);
    expect(stateOf(base, "proposal")).toBe("current");
    expect(r.currentStageKey).toBe("proposal");
    expect(r.nextAction).toBe("finalize_proposal");
  });

  it("is current while the proposal is still a draft", () => {
    expect(stateOf({ ...base, proposal: { status: "draft" } }, "proposal")).toBe("current");
  });

  it.each(["final", "sent", "viewed", "accepted"])(
    "is done once the proposal is %s (no project yet) and project becomes current",
    (status) => {
      const input = { ...base, proposal: { status } };
      expect(stateOf(input, "proposal")).toBe("done");
      expect(resolveLifecycle(input).currentStageKey).toBe("project");
      expect(resolveLifecycle(input).nextAction).toBe("set_up_project");
    }
  );

  it("stays done once a project exists even if the proposal was later declined", () => {
    const input: LifecycleInput = {
      ...base,
      proposal: { status: "declined" },
      hasProject: true,
      projectHasOriginProposal: true,
      gig: { amount_sar: 1000, status: "pending" },
    };
    expect(stateOf(input, "proposal")).toBe("done");
  });

  it("is skipped when a project exists with no origin proposal (direct bill)", () => {
    const input: LifecycleInput = {
      ...base,
      hasProject: true,
      projectHasOriginProposal: false,
      gig: { amount_sar: 1000, status: "pending" },
    };
    expect(stateOf(input, "proposal")).toBe("skipped");
    expect(resolveLifecycle(input).currentStageKey).toBe("invoice");
  });
});

describe("resolveLifecycle — stage ② project", () => {
  it("is done when project + money child exist", () => {
    const input: LifecycleInput = {
      ...base,
      proposal: { status: "accepted" },
      hasProject: true,
      projectHasOriginProposal: true,
      gig: { amount_sar: 5000, status: "pending" },
    };
    expect(stateOf(input, "project")).toBe("done");
    expect(resolveLifecycle(input).currentStageKey).toBe("invoice");
    expect(resolveLifecycle(input).nextAction).toBe("create_invoice");
  });

  it("is next while the proposal is still being drafted", () => {
    expect(stateOf({ ...base, proposal: { status: "draft" } }, "project")).toBe("next");
  });
});

describe("resolveLifecycle — stage ③ invoice", () => {
  const setUp: LifecycleInput = {
    ...base,
    proposal: { status: "accepted" },
    hasProject: true,
    projectHasOriginProposal: true,
    gig: { amount_sar: 5000, status: "pending" },
  };

  it("create_invoice when no invoice yet", () => {
    expect(resolveLifecycle(setUp).nextAction).toBe("create_invoice");
  });

  it("send_invoice when a draft invoice exists", () => {
    const r = resolveLifecycle({ ...setUp, invoices: [{ status: "draft" }] });
    expect(r.currentStageKey).toBe("invoice");
    expect(r.nextAction).toBe("send_invoice");
  });

  it("mark_paid when an invoice is sent/viewed", () => {
    expect(resolveLifecycle({ ...setUp, invoices: [{ status: "sent" }] }).nextAction).toBe("mark_paid");
    expect(resolveLifecycle({ ...setUp, invoices: [{ status: "viewed" }] }).nextAction).toBe("mark_paid");
  });

  it("completes when an invoice is paid", () => {
    const r = resolveLifecycle({ ...setUp, invoices: [{ status: "paid" }] });
    expect(stateOf({ ...setUp, invoices: [{ status: "paid" }] }, "invoice")).toBe("done");
    expect(r.complete).toBe(true);
    expect(r.currentStageKey).toBe(null);
    expect(r.nextAction).toBe(null);
  });
});

describe("resolveLifecycle — shape & totality", () => {
  it("always returns three stages in order", () => {
    const r = resolveLifecycle(base);
    expect(r.stages.map((s) => s.key)).toEqual(["proposal", "project", "invoice"]);
  });

  it("never throws on odd input", () => {
    // @ts-expect-error intentional bad input
    expect(() => resolveLifecycle({ invoices: null, hasProject: false })).not.toThrow();
  });
});
