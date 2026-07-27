/**
 * Sweeps — the checks worth re-running on every screen, every iteration.
 *
 * A walk finds the defect on the screen you happened to open. A sweep finds the whole class:
 * pass 6 turned two one-off numeral bugs into seven found at once by checking every route
 * instead of the two that had already failed. Each of these came from a defect that reached
 * production, so they earn their keep — add to them whenever an iteration finds a new class.
 */

/** Routes whose visible numbers are the APP's own, so a Latin digit is the app's fault. */
export const APP_CHROME_ROUTES = [
  "/ar/hadaf",
  "/ar/income",
  "/ar/invoices/new",
  "/ar/settings",
  "/ar/settings/profile",
  "/ar/catalog",
  "/ar/calendar",
  "/ar/projects/start",
  "/ar/upgrade",
];

/** Every signed-in route, for the checks that hold regardless of whose words are on screen. */
export const ALL_ROUTES = [
  "/ar",
  "/ar/dashboard",
  "/ar/tool",
  "/ar/proposals",
  "/ar/proposals/new",
  "/ar/invoices",
  "/ar/invoices/new",
  "/ar/clients",
  "/ar/clients/new",
  "/ar/income",
  "/ar/income/new",
  "/ar/hadaf",
  "/ar/rate-calculator",
  "/ar/methodology",
  "/ar/projects",
  "/ar/projects/start",
  "/ar/calendar",
  "/ar/catalog",
  "/ar/documents",
  "/ar/settings",
  "/ar/settings/profile",
  "/ar/upgrade",
];

/**
 * Latin digits among Arabic-Indic ones, in text the app itself printed.
 *
 * Walks text nodes rather than splitting innerText: a number glued to its label
 * ("أيام ضمان ما بعد التسليم0") hides from a whitespace split. Nodes carrying Latin letters
 * or identifier punctuation are skipped, so emails, URLs, phone prefixes and reference codes
 * are not flagged.
 */
export async function numeralSweep({ page, go }, routes = APP_CHROME_ROUTES) {
  const findings = [];
  for (const route of routes) {
    await go(route, 3500);
    const offenders = await page.evaluate(() => {
      const out = [];
      const walk = (el) => {
        for (const node of el.childNodes) {
          if (node.nodeType === 3) {
            const text = (node.textContent ?? "").trim();
            if (/[0-9]/.test(text) && !/[A-Za-z@:/._#+\\-]/.test(text)) out.push(text.slice(0, 40));
          } else if (node.nodeType === 1) {
            walk(node);
          }
        }
      };
      walk(document.body);
      return [...new Set(out)].slice(0, 6);
    });
    if (offenders.length) findings.push(`${route} prints Latin digits: ${offenders.join(" | ")}`);
  }
  return findings;
}

/**
 * A number that never should have been shown to anyone.
 *
 * `Intl.NumberFormat("ar").format(NaN)` is "ليس رقمًا", which is how the pricing screen came
 * to read "based on NaN Saudi freelancers" in Arabic while English read "based on 5".
 */
export async function notANumberSweep({ page, go }, routes = ALL_ROUTES) {
  const findings = [];
  for (const route of routes) {
    await go(route, 3000);
    const hit = await page.evaluate(() => {
      const t = document.body.innerText;
      const m = t.match(/[^\n]*(ليس رقمًا|ليس رقما|\bNaN\b|\bInfinity\b|\bundefined\b|\[object Object\])[^\n]*/);
      return m ? m[0].slice(0, 120) : null;
    });
    if (hit) findings.push(`${route} shows a non-number: "${hit}"`);
  }
  return findings;
}

/**
 * A route that fails to render, or renders an error where content belongs.
 *
 * Distinguishes the two states feature 010 was about: a real error state (honest) versus a
 * blank/never-settling screen (not).
 */
export async function renderSweep({ page, go }, routes = ALL_ROUTES) {
  const findings = [];
  for (const route of routes) {
    const status = await go(route, 4000);
    if (status >= 500) {
      findings.push(`${route} returned ${status}`);
      continue;
    }
    const state = await page.evaluate(() => {
      const t = document.body.innerText.trim();
      return {
        len: t.length,
        stuck: /جارٍ التحميل|Loading/.test(t) && t.length < 400,
        crashed: /Application error|Unhandled Runtime|حدث خطأ غير متوقع/i.test(t),
      };
    });
    if (state.crashed) findings.push(`${route} rendered a crash state`);
    else if (state.stuck) findings.push(`${route} is still loading after 4s`);
    else if (state.len < 120) findings.push(`${route} rendered almost nothing (${state.len} chars)`);
  }
  return findings;
}

/**
 * Run the standing sweeps. An iteration should start here, then go do something a person
 * would actually do — the sweeps catch regressions, they do not find new kinds of wrong.
 */
export async function standardSweeps(tools) {
  const findings = [
    ...(await renderSweep(tools)),
    ...(await notANumberSweep(tools)),
    ...(await numeralSweep(tools)),
  ];
  return findings;
}
