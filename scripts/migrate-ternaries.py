"""
Semi-automated migration of inline `isAr ? "AR" : "EN"` pairs into the next-intl
catalog.

Why this exists: the parity audit only certifies messages/{ar,en}.json, so every
string kept as an inline ternary is invisible to it and the two languages drift.

Deliberately conservative — it only touches the unambiguous shape:
  * pairs whose Arabic side has no Arabic letters are SKIPPED. Those are layout
    or format logic (rtl/ltr, font-arabic/font-sans, ar-SA/en-US, ٪/%) and belong
    inline; moving them into the catalog would be wrong.
  * template literals, nested ternaries and escapes are skipped (regex won't match)
  * it prefers an EXISTING `t` in the file and only injects one when there is none

Usage:
  python scripts/migrate-ternaries.py <file> [Namespace] [--apply]
Namespace defaults to the file's existing translations namespace when it has one.
Without --apply it prints the plan and changes nothing.
"""
import json
import re
import sys
from collections import OrderedDict
from pathlib import Path

ARABIC = re.compile(r"[؀-ۿ]")
PAIR = re.compile(r'isAr \? "([^"]*)" : "([^"]*)"')
# const t = useTranslations("NS")  /  const t = await getTranslations({...,"NS"})
TVAR = re.compile(
    r'const\s+(\w+)\s*=\s*(?:await\s+)?(?:use|get)Translations\('
    r'\s*(?:\{[^}]*namespace:\s*)?"([A-Za-z0-9.]+)"'
)

STOP = {"the","a","an","to","of","for","and","or","is","are","your","you",
        "this","that","it","in","on","at","with","from","by","no","not"}


def key_from_en(text: str, taken: set) -> str:
    words = [w for w in re.split(r"[^A-Za-z0-9]+", text.lower()) if w]
    meaningful = [w for w in words if w not in STOP] or words
    base = "".join(w if i == 0 else w[:1].upper() + w[1:]
                   for i, w in enumerate(meaningful[:5])) or "text"
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
    if not args:
        print(__doc__)
        return 2

    path = Path(args[0])
    src = path.read_text(encoding="utf-8")

    tvars = TVAR.findall(src)
    if len(args) > 1:
        namespace = args[1]
        tname = next((v for v, ns in tvars if ns == namespace), None)
    else:
        if not tvars:
            print(f"{path}: no existing namespace — pass one explicitly")
            return 2
        tname, namespace = tvars[0]

    inject = tname is None
    if inject:
        tname = "tI18n"  # distinct name so it can't collide with an existing t

    en_path, ar_path = Path("messages/en.json"), Path("messages/ar.json")
    en = json.loads(en_path.read_text(encoding="utf-8"), object_pairs_hook=OrderedDict)
    ar = json.loads(ar_path.read_text(encoding="utf-8"), object_pairs_hook=OrderedDict)

    def bucket(cat):
        node = cat
        for part in namespace.split("."):
            node = node.setdefault(part, OrderedDict())
        return node

    en_ns, ar_ns = bucket(en), bucket(ar)
    taken = set(en_ns) | set(ar_ns)
    by_en = {v: k for k, v in en_ns.items() if isinstance(v, str)}

    planned = []

    def repl(m):
        ar_txt, en_txt = m.group(1), m.group(2)
        if not ARABIC.search(ar_txt):
            return m.group(0)
        key = by_en.get(en_txt)
        if key is None:
            key = key_from_en(en_txt, taken)
            en_ns[key] = en_txt
            ar_ns[key] = ar_txt
            by_en[en_txt] = key
            planned.append((key, en_txt))
        return f'{tname}("{key}")'

    out = PAIR.sub(repl, src)

    print(f"{path}: {len(planned)} new key(s) -> {namespace}"
          + (f" (inject {tname})" if inject else f" (reuse {tname})"))
    for k, e in planned:
        # ASCII-safe: the Windows console is cp1252 and raises on characters like
        # the arrow in "View all →", which previously killed the run mid-batch.
        safe = e.encode("ascii", "replace").decode("ascii")
        print(f'  {k}: "{safe}"')
    left = sum(1 for m in PAIR.finditer(out) if ARABIC.search(m.group(1)))
    print(f"  remaining in file: {left}")

    if not planned:
        print("  nothing to do")
        return 0
    if not apply:
        print("  (dry run - pass --apply to write)")
        return 0

    path.write_text(out, encoding="utf-8", newline="")
    for p, cat in ((en_path, en), (ar_path, ar)):
        p.write_text(json.dumps(cat, ensure_ascii=False, indent=2) + "\n",
                     encoding="utf-8", newline="")
    print("  applied" + ("  << add the hook manually" if inject else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
