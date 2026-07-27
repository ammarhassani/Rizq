/**
 * The locked search space.
 *
 * Every pass so far found defects, stopped, and then found more the moment a NEW way of looking
 * was invented — Arabic-first, then sweeping instead of walking, then UI/UX. That is a good
 * problem, but it means "we are done" never meant anything: the yield reset each time someone
 * thought of another axis.
 *
 * So the axes are enumerated here and treated as closed. Adding one is allowed, but it is an
 * explicit event that resets the dry counter, not a quiet improvement — because it genuinely
 * reopens the search.
 *
 * These seven cover every defect this product has shipped. Each value carries what it exposes,
 * so a run can be chosen for a reason rather than at random.
 *
 * ── Why NOT the full cross product ──────────────────────────────────────────────────────────
 * 6 personas × 10 flows × 7 strategies × 6 surfaces × 6 states × 6 tiers × 5 entries is roughly
 * 900,000 combinations. At ten minutes a run that is seventeen years. Combination defects
 * overwhelmingly involve TWO values interacting, not seven, so the target here is pairwise
 * coverage: every pair of values from every pair of axes appears in at least one run. That
 * collapses to a few dozen runs and is an "exhausted" that can actually be reached.
 */

export const AXES = {
  /** WHO is driving. A defect is only visible to someone whose expectations it violates. */
  persona: {
    why: "the rusher finds double-submits; the accountant finds the halala that does not add up",
    values: ["rusher", "meticulous", "newcomer", "veteran", "sceptic", "english-first"],
  },

  /** WHAT they are trying to get done. */
  flow: {
    why: "money, legal obligation and client-facing output are where defects cost most",
    values: [
      "onboarding",
      "proposal-to-client",
      "invoice-and-vat",
      "income-and-hadaf",
      "pricing-tool",
      "clients-and-projects",
      "documents-and-catalog",
      "mobile",
      "english-locale",
      "recovery",
    ],
  },

  /** WHAT KIND of question is asked. The axis that changes what is findable at all. */
  strategy: {
    why: "the band-ceiling P0 was invisible to every question except a metamorphic one",
    values: [
      "metamorphic",
      "differential",
      "time-travel",
      "adversarial",
      "fuzz",
      "state-machine",
      "scale",
    ],
  },

  /**
   * WHERE the output lands. The same data rendered somewhere else is a different artefact with
   * its own bugs — the price band was redacted on the share page and still present in the DOCX.
   */
  surface: {
    why: "redaction, formatting and layout are re-implemented per surface, so they drift per surface",
    values: [
      "screen-desktop",
      "screen-mobile",
      "print-pdf",
      "docx-export",
      "share-anonymous",
      "csv-export",
    ],
  },

  /**
   * WHAT SHAPE the account is in. A fresh account hid almost every defect found so far.
   */
  state: {
    why: "an empty account hides everything; a heavy one breaks what an empty one could not",
    values: [
      "empty",
      "minimal",
      "realistic",
      "heavy",
      "edge-unicode",
      "degraded-profile",
    ],
  },

  /**
   * WHICH TIER. Enforcement, quotas and gating differ per tier, and a lapsed grant is where the
   * money bugs live — `pro_until` in the past was ignored for weeks.
   */
  tier: {
    why: "advertised limits must equal enforced limits, in every tier including a lapsed one",
    // No `admin`: the driver signs itself up, and `users.role` is revoked from the
    // authenticated role precisely so an account cannot promote itself. A tier the harness
    // cannot reach would be a row in the plan that can never be ticked.
    values: ["anon", "free", "free-exhausted", "pro-active", "pro-lapsed"],
  },

  /**
   * HOW they arrived. Feature 005 exists entirely because context travels with the entry point.
   */
  entry: {
    why: "a deep link, a back button mid-save and a guided context are three different apps",
    values: [
      "direct-url",
      "in-app-navigation",
      "shared-link",
      "back-or-refresh-midflow",
      "guided-context",
    ],
  },
};

export const AXIS_NAMES = Object.keys(AXES);

/**
 * Combinations that cannot exist.
 *
 * A plan row nobody can execute is worse than a missing one: the loop reaches it, cannot run
 * it, and either stalls or quietly skips — and a skipped row still looks covered. So the
 * impossible ones are excluded from the search space rather than left to be discovered at 3am.
 */
export function isValid(run) {
  const { tier, flow, surface, strategy, state, entry } = run;

  // Anonymous visitors can price and can open something shared with them. Nothing else.
  if (tier === "anon") {
    if (!["pricing-tool", "proposal-to-client"].includes(flow)) return false;
    if (!["screen-desktop", "screen-mobile", "share-anonymous", "print-pdf"].includes(surface)) return false;
    if (["guided-context", "in-app-navigation"].includes(entry)) return false;
  }

  // Surfaces only exist where the artefact does.
  if (surface === "docx-export" && flow !== "proposal-to-client") return false;
  if (surface === "print-pdf" && !["proposal-to-client", "invoice-and-vat"].includes(flow)) return false;
  if (surface === "csv-export" && !["income-and-hadaf", "documents-and-catalog", "clients-and-projects"].includes(flow))
    return false;
  if (surface === "share-anonymous" && !["proposal-to-client", "invoice-and-vat", "pricing-tool"].includes(flow))
    return false;

  // Guided context is a project concept.
  if (entry === "guided-context" && !["clients-and-projects", "proposal-to-client", "invoice-and-vat", "income-and-hadaf"].includes(flow))
    return false;

  // Asking whether it survives volume requires volume.
  if (strategy === "scale" && state !== "heavy") return false;

  // Onboarding is by definition the empty account, before any tier question exists.
  if (flow === "onboarding" && !["empty", "degraded-profile"].includes(state)) return false;
  if (flow === "onboarding" && ["free-exhausted", "pro-active", "pro-lapsed", "anon"].includes(tier)) return false;

  return true;
}

/**
 * Every pair a VALID run can actually contain.
 *
 * Found by sampling the valid space rather than enumerating the cross product: the constraints
 * make whole regions unreachable, and counting pairs nobody can reach would leave the plan
 * permanently "incomplete" for reasons that are nobody's fault.
 */
export function allPairs(samples = 60_000) {
  const universe = new Set();
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  for (let i = 0; i < samples; i++) {
    const run = {};
    for (const axis of AXIS_NAMES) run[axis] = pick(AXES[axis].values);
    if (!isValid(run)) continue;
    for (const pair of pairsOf(run)) universe.add(pair);
  }
  return [...universe];
}

/** The pairs a single run covers. */
export function pairsOf(run) {
  const out = [];
  for (let i = 0; i < AXIS_NAMES.length; i++) {
    for (let j = i + 1; j < AXIS_NAMES.length; j++) {
      const a = AXIS_NAMES[i];
      const b = AXIS_NAMES[j];
      if (run[a] && run[b]) out.push(`${a}=${run[a]}&${b}=${run[b]}`);
    }
  }
  return out;
}

/**
 * A greedy pairwise covering set.
 *
 * Each candidate is SEEDED from a pair that is still missing, then filled in randomly and
 * checked for validity. Generating candidates purely at random cannot finish: the constrained
 * corners — onboarding, which is pinned to an empty account on the free tier — come up so
 * rarely that their pairs are never covered, and the loop gives up believing the space is
 * unreachable when it is only unlikely.
 */
export function coveringSet({ covered = [], candidatesPerStep = 60, universe = null } = {}) {
  const need = new Set(universe ?? allPairs());
  for (const pair of covered) need.delete(pair);

  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const parsePair = (pair) => {
    const [left, right] = pair.split("&");
    const [aAxis, aValue] = left.split("=");
    const [bAxis, bValue] = right.split("=");
    return { aAxis, aValue, bAxis, bValue };
  };

  /** A valid run containing this pair, or null if the pair turns out to be unreachable. */
  const buildAround = (pair, attempts = 400) => {
    const { aAxis, aValue, bAxis, bValue } = parsePair(pair);
    for (let i = 0; i < attempts; i++) {
      const run = { [aAxis]: aValue, [bAxis]: bValue };
      for (const axis of AXIS_NAMES) if (!run[axis]) run[axis] = pick(AXES[axis].values);
      if (isValid(run)) return run;
    }
    return null;
  };

  const plan = [];
  while (need.size > 0 && plan.length < 500) {
    const target = need.values().next().value;
    let best = null;
    let bestGain = -1;
    for (let i = 0; i < candidatesPerStep; i++) {
      const run = buildAround(target);
      if (!run) break;
      const gain = pairsOf(run).filter((p) => need.has(p)).length;
      if (gain > bestGain) {
        bestGain = gain;
        best = run;
      }
    }
    if (!best) {
      // Genuinely unreachable under the constraints — drop it rather than spin.
      need.delete(target);
      continue;
    }
    for (const pair of pairsOf(best)) need.delete(pair);
    plan.push(best);
  }

  return { plan, remaining: need.size, total: (universe ?? allPairs()).length };
}

/** A run as a stable ledger key: `persona/flow/strategy/surface/state/tier/entry`. */
export function runKey(run) {
  return AXIS_NAMES.map((a) => run[a]).join("/");
}

export function runFromKey(key) {
  const parts = key.split("/");
  const run = {};
  AXIS_NAMES.forEach((axis, i) => {
    if (parts[i]) run[axis] = parts[i];
  });
  return run;
}
