/**
 * The part of "looks wrong" a machine can actually judge.
 *
 * Taste does not automate — whether a proposal reads like something a Saudi freelancer sends
 * with pride is a human call. But a great deal of what makes an interface feel broken is
 * mechanical and measurable, and every check here maps to a principle this product committed
 * to: mobile-first (III), Arabic-first (II), and never showing an affordance that lies (I).
 *
 * Each returns findings as plain sentences, because the loop's output is read by a person.
 */
import AxeBuilder from "@axe-core/playwright";

/** WCAG 2.5.5 / Apple HIG both land near this. Below it, thumbs miss. */
const MIN_TAP_PX = 44;

/**
 * Content wider than the viewport.
 *
 * 70%+ of Saudi traffic is mobile, and a page that scrolls sideways is the single most
 * obvious way to look broken on a phone.
 */
export async function horizontalOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    if (doc.scrollWidth <= window.innerWidth + 2) return [];
    const guilty = [...document.querySelectorAll("*")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > window.innerWidth + 2 || r.left < -2);
      })
      .slice(0, 4)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`);
    return [`page scrolls sideways (${doc.scrollWidth}px in a ${window.innerWidth}px viewport): ${guilty.join(", ")}`];
  });
}

/** Interactive things too small to hit with a thumb. Only meaningful on a phone viewport. */
export async function tapTargets(page) {
  return page.evaluate((min) => {
    const out = [];
    for (const el of document.querySelectorAll('button, a[href], [role="button"], [role="switch"], input[type="checkbox"]')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue; // hidden
      if (r.width < min || r.height < min) {
        const label = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30);
        out.push(`${Math.round(r.width)}×${Math.round(r.height)}px "${label}"`);
      }
    }
    return out.length ? [`${out.length} tap target(s) under ${min}px: ${out.slice(0, 5).join(" | ")}`] : [];
  }, MIN_TAP_PX);
}

/**
 * Arabic text whose CSS names a Latin-only font stack.
 *
 * The browser still renders it, by falling back per glyph to whatever Arabic face the device
 * happens to have — so this is NOT breakage, and the check must not claim it is. Verified by
 * blowing an Arabic-Indic zero up to 120px: the diamond it renders is the real ٠ glyph from a
 * fallback, not tofu.
 *
 * It is worth reporting anyway, because the fallback is undeclared: the money figures use
 * `font-mono` / `tabular font-sans`, both Latin-only, so their shapes and weights are whatever
 * the device supplies. That looks right on the founder's Mac and different on a Saudi user's
 * Android — a design-system gap rather than a rendering bug, and one nobody sees on one device.
 */
export async function arabicInLatinFont(page) {
  return page.evaluate(() => {
    const arabic = /[؀-ۿ]/;
    const out = new Set();
    for (const el of document.querySelectorAll("p, span, h1, h2, h3, h4, button, a, label, li, td, th")) {
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("");
      if (!arabic.test(own)) continue;
      const family = getComputedStyle(el).fontFamily.toLowerCase();
      if (!/tajawal|messiri|kufi|arabic|noto/.test(family)) {
        out.add(`"${own.trim().slice(0, 20)}" declares ${family.split(",")[0]}`);
      }
    }
    return out.size
      ? [
          `${out.size} Arabic string(s) fall back to an undeclared font (Latin-only stack, so ` +
            `glyph shapes vary by device): ${[...out].slice(0, 3).join(" | ")}`,
        ]
      : [];
  });
}

/**
 * Keyboard focus that leaves no visible mark.
 *
 * Tabs through the first handful of controls and asks whether anything on screen changed to
 * show where focus went. A keyboard user who cannot see focus cannot use the page at all.
 */
export async function focusVisibility(page, steps = 8) {
  const invisible = [];
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press("Tab");
    const state = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      // `next dev` injects <nextjs-portal> for its own error/status overlay. It is not
      // product UI, it has no focus ring by design, and it does not exist in a production
      // build — reporting it as an app defect cost RZQ-0016 and 16 findings in one run.
      if (el.tagName.toLowerCase() === "nextjs-portal" || el.closest("nextjs-portal")) return null;
      const s = getComputedStyle(el);
      const marked =
        (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) ||
        s.boxShadow !== "none" ||
        s.borderColor !== getComputedStyle(el.parentElement ?? document.body).borderColor;
      return {
        marked,
        label: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 30),
      };
    });
    if (state && !state.marked) invisible.push(state.label);
  }
  return invisible.length ? [`focus is invisible on ${invisible.length} control(s): ${invisible.slice(0, 4).join(" | ")}`] : [];
}

/**
 * A dead end: a screen with nothing on it and nothing to do.
 *
 * An empty state that does not say what happened or offer the next step reads as a bug even
 * when the data really is empty — feature 010 was entirely about this distinction.
 */
export async function deadEnd(page) {
  return page.evaluate(() => {
    const main = document.querySelector("main") ?? document.body;
    const text = main.innerText.trim();
    if (text.length > 400) return [];
    const actions = main.querySelectorAll('button:not([disabled]), a[href], [role="button"]');
    if (actions.length === 0) return [`screen has ${text.length} chars of text and no action to take`];
    return [];
  });
}

/**
 * A control that is off, with no reason given.
 *
 * The VAT switch was disabled for freelancers who are not VAT-registered and said nothing —
 * correct behaviour, silent delivery. A disabled control needs to explain itself.
 */
export async function silentlyDisabled(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('button[disabled], [aria-disabled="true"]')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      const explained =
        el.getAttribute("aria-describedby") ||
        el.getAttribute("title") ||
        (el.closest("div,section,fieldset")?.innerText ?? "").length > (el.textContent ?? "").length + 30;
      if (!explained) {
        out.push((el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30));
      }
    }
    return out.length ? [`${out.length} disabled control(s) with no reason given: ${out.slice(0, 4).join(" | ")}`] : [];
  });
}

/**
 * Motion that ignores the reader's preference.
 *
 * The product leans on animation by design; a freelancer who has asked their phone to stop
 * moving things has asked for a reason.
 */
export async function motionRespectsPreference(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const moving = await page.evaluate(() => {
    const running = document.getAnimations().filter((a) => a.playState === "running");
    return running.length;
  });
  await page.emulateMedia({ reducedMotion: null });
  return moving > 3 ? [`${moving} animations still running under prefers-reduced-motion`] : [];
}

/** Serious and critical axe violations — the machine-checkable half of accessibility. */
export async function axeSerious(page) {
  try {
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    return violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .slice(0, 5)
      .map((v) => `${v.impact}: ${v.id} — ${v.help} (${v.nodes.length} node(s))`);
  } catch (err) {
    return [`axe could not run: ${String(err).slice(0, 80)}`];
  }
}

/**
 * Everything measurable about how this screen looks and behaves.
 *
 * `mobile` turns on the checks that only mean something on a phone.
 */
export async function uxReview(page, { mobile = false, route = "" } = {}) {
  const findings = [
    ...(await horizontalOverflow(page)),
    ...(await arabicInLatinFont(page)),
    ...(await deadEnd(page)),
    ...(await silentlyDisabled(page)),
    ...(await axeSerious(page)),
  ];
  if (mobile) findings.push(...(await tapTargets(page)));
  else findings.push(...(await focusVisibility(page)));
  return findings.map((f) => (route ? `${route} — ${f}` : f));
}
