"""
Semi-automated migration of inline `isAr ? "AR" : "EN"` pairs into the next-intl
catalog.

Why this exists: the parity audit only certifies messages/{ar,en}.json, so every
string kept as an inline ternary is invisible to it and the two languages drift.
This lifts a file's pairs into the catalog under a chosen namespace and rewrites
the call sites.

Deliberately NOT fully automatic — it only rewrites the unambiguous shape and
leaves everything else for a human to look at:
  * pairs whose Arabic side is missing (layout-only ternaries like rtl/ltr,
    font-arabic/font-sans) are skipped: those belong inline
  * template literals, nested ternaries and interpolation are skipped
  * the caller must already have a `t` in scope (or pass --t-name)

Usage:
  python scripts/migrate-ternaries.py <file> <Namespace> [--apply] [--t-name t]
Without --apply it prints the plan and changes nothing.
"""
import json
import re
import sys
from pathlib import Path

ARABIC = re.compile(r"[؀-ۿ]")
# isAr ? "…" : "…"   (double-quoted, no escapes/interpolation)
PAIR = re.compile(r'isAr \? "([^"\\]*)" : "([^"\\]*)"')

STOP = {
    "the", "a", "an", "to", "of", "for", "and", "or", "is", "are", "your",
    "you", "this", "that", "it", "in", "on", "at", "with", "from", "by",
}


def key_from_en(text: str, taken: set[str]) -> str:
    words = [w for w in re.split(r"[^A-Za-z0-9]+", text.lower()) if w]
    meaningful = [w for w in words if w not in STOP] or words
    base = "".join(
        w if i == 0 else w[:1].upper() + w[1:] for i, w in enumerate(meaningful[:5])
    ) or "text"
    if base[0].isdigit():
        base = "n" + base
    key, n = base, 2
    while key in taken:
        key, n = f"{base}{n}", n + 1
    taken.add(key)
    return key


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    apply = "--apply" in sys.argv
    t_name = "t"
    for a in sys.argv[1:]:
        if a.startswith("--t-name="):
            t_name = a.split("=", 1)[1]
    if len(args) < 2:
        print(__doc__)
        return 2

    path, namespace = Path(args[0]), args[1]
    src = path.read_text(encoding="utf-8")

    en_path, ar_path = Path("messages/en.json"), Path("messages/ar.json")
    en = json.loads(en_path.read_text(encoding="utf-8"))
    ar = json.loads(ar_path.read_text(encoding="utf-8"))
    en.setdefault(namespace, {})
    ar.setdefault(namespace, {})
    taken = set(en[namespace]) | set(ar[namespace])

    # Reuse a key when this exact English string is already in the namespace, so
    # repeated labels collapse instead of multiplying near-duplicate keys.
    existing_by_en = {v: k for k, v in en[namespace].items() if isinstance(v, str)}

    planned: list[tuple[str, str, str]] = []

    def replace(m: re.Match) -> str:
        ar_txt, en_txt = m.group(1), m.group(2)
        if not ARABIC.search(ar_txt):
            return m.group(0)  # layout-only: leave inline
        key = existing_by_en.get(en_txt)
        if key is None:
            key = key_from_en(en_txt, taken)
            en[namespace][key] = en_txt
            ar[namespace][key] = ar_txt
            existing_by_en[en_txt] = key
            planned.append((key, ar_txt, en_txt))
        return f'{t_name}("{key}")'

    out = PAIR.sub(replace, src)

    print(f"{path}: {len(planned)} new key(s) under {namespace}")
    for k, _a, e in planned:
        # English only: Windows consoles are cp1252 and choke on Arabic output.
        print(f'  {k}: en="{e}"')
    remaining = len([m for m in PAIR.finditer(out) if ARABIC.search(m.group(1))])
    print(f"  remaining un-migrated user-facing pairs in file: {remaining}")

    if not apply:
        print("  (dry run — pass --apply to write)")
        return 0

    path.write_text(out, encoding="utf-8", newline="")
    en_path.write_text(json.dumps(en, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="")
    ar_path.write_text(json.dumps(ar, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="")
    print("  applied")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
