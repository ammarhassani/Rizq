#!/usr/bin/env node
/** Regenerate drive/basket.md from the append-only basket. */
import { writeIndex, findings } from "./basket.mjs";
import { status } from "./invocation.mjs";
const items = findings();
const open = items.filter((f) => f.status === "open");
writeIndex();
const s = status();
console.log(`\nbasket: ${open.length} open of ${items.length} filed → drive/basket.md`);
for (const sev of ["P1", "P2", "P3"]) {
  const g = open.filter((f) => f.severity === sev);
  if (g.length) console.log(`  ${sev}: ${g.length} — ${g.slice(0, 3).map((f) => f.ref).join(", ")}${g.length > 3 ? "…" : ""}`);
}
console.log(`\ninvocations: ${s.completed} completed of ${s.total}`);
if (s.open) console.log(`  UNFINISHED ${s.open.id} — last step "${s.open.lastStep}", plan row ${s.open.planRow ?? "?"} — next run resumes it`);
console.log("");
