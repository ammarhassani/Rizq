// TEMP: render board + app (canonical dashboard + proposal studio), dark, 1x, for the side-by-side.
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, mkdirSync } from "node:fs";
for (const line of readFileSync("/Users/engammar/Apps/Rizq/.env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
// Screenshot output dir. Was hardcoded to one session's scratchpad, which no longer exists;
// override with CMP_OUT=/some/dir, otherwise it drops them next to the repo.
const OUT = process.env.CMP_OUT ?? "/tmp/rizq-cmp";

const BASE = "http://localhost:3000";
const BOARD = "file:///Users/engammar/Apps/Rizq/docs/design/board/wahaj-board.html";
const VP = { width: 1400, height: 1000 };
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();

// ── BOARD (no auth) ─────────────────────────────────────────────
{
  const p = await b.newPage({ viewport: VP, deviceScaleFactor: 1 });
  await p.goto(BOARD, { waitUntil: "networkidle" });
  await p.waitForTimeout(700);
  const click = async (t) => { try { await p.getByText(t, { exact: false }).first().click({ timeout: 2500 }); return true; } catch { return false; } };
  await click("داكن");
  await p.waitForTimeout(400);
  await click("Dashboard"); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/cmp-board-dash.png` });
  await click("Proposal Studio"); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/cmp-board-prop.png` });
  await p.close();
  console.log("board done");
}

// ── APP (auth + seed) ───────────────────────────────────────────
{
  const ctx = await b.newContext({ viewport: VP, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem("theme", "dark"); } catch {} });
  const p = await ctx.newPage();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const user = { email: `azahrani337+rizqcmp-${stamp}@gmail.com`, password: `RizqE2e!${Math.floor(Math.random() * 1e6)}` };
  await p.goto(`${BASE}/en/signup`, { waitUntil: "domcontentloaded" });
  await p.getByRole("textbox", { name: "Email" }).fill(user.email);
  await p.getByRole("textbox", { name: "Password" }).fill(user.password);
  await p.getByRole("button", { name: /create account/i }).click();
  await p.waitForURL(/\/(onboarding|dashboard)/, { timeout: 60000 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data: si } = await sb.auth.signInWithPassword({ email: user.email, password: user.password });
  const uid = si.user.id;
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);
  const lastMonth = new Date(Date.now() - 35 * 864e5).toISOString().slice(0, 10);
  const log = (w, e) => console.log("seed", w, e ? "ERR " + e.message : "ok");

  await sb.from("users").update({ onboarding_completed: true, onboarding_completed_at: nowIso, onboarded_at: nowIso, name: "عمّار", full_name_ar: "عمّار حساني", income_goal_monthly_sar: 35000 }).eq("id", uid).then(({ error }) => log("user", error));
  const { data: proj, error: pe } = await sb.from("projects").insert({ user_id: uid, title: "هوية بصرية لمقهى رواق", status: "active" }).select("id").single(); log("project", pe);
  if (proj) {
    for (const g of [
      { amount_sar: 18200, status: "paid", delivery_date: today, title: "دفعة مشروع" },
      { amount_sar: 6600, status: "pending", delivery_date: today, title: "دفعة قيد الدفع" },
      { amount_sar: 21000, status: "paid", delivery_date: lastMonth, title: "مشروع الشهر الماضي" },
    ]) { const { error } = await sb.from("gigs").insert({ user_id: uid, project_id: proj.id, ...g }); log("gig " + g.amount_sar, error); }
  }
  await sb.from("proposals").insert({ user_id: uid, client_name: "شركة نون", status: "accepted", price_anchor: 12500, created_at: nowIso }).then(({ error }) => log("proposal", error));

  const shot = async (path, name) => { await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" }); await p.waitForTimeout(2400); await p.screenshot({ path: `${OUT}/${name}.png` }); console.log("shot", name); };
  await shot("/ar/dashboard", "cmp-app-dash");
  await shot("/ar/proposals/new", "cmp-app-prop");
}
await b.close();
console.log("done");
