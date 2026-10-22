#!/usr/bin/env python3
"""Renumber a voiceover script after lines were added or removed.

  python3 tools/vo_renumber.py teach/lintel-4/05-voiceover.md [teach/lintel-4/04-video-plan.md]

Sam edits these scripts by line number ("change 27"), with one plain number per
spoken line from 1 to the end of the file. A spoken line looks like

  `27` It starts with a short video.

To insert a line, write it with `N` in place of the number. To change a line, edit
its text and leave its number alone. To remove one, delete it. Then run this:

  - every spoken line gets its new number, in order
  - the notes under the script ("# Who can use it" and after) follow: "(27, 60)"
    after a bold label, "line 27", "lines 27 to 29", "lines 27 and 28"
  - the word counts in the two "# ... VERSION" headings are brought up to date
  - with a shot list as second argument, its "(lines a to b)" follow the headings

It prints where every heading's lines now are, and which numbers moved, so they can
be told to Sam. A note that points at a line that no longer exists is printed too
and left as it is.
"""
import re, sys

PACE = 125        # words a minute, the pace of Sam's course scripts


def main():
    path = sys.argv[1]
    plan = sys.argv[2] if len(sys.argv) > 2 else None
    s = open(path).read()
    cut = s.index("# Who can use it") if "# Who can use it" in s else len(s)
    script, notes = s[:cut], s[cut:]

    mapping, n, out, ranges, part, cur = {}, 0, [], {}, "long", None
    words = {"long": 0, "short": 0}
    for l in script.split("\n"):
        if l.startswith("# SHORT VERSION"):
            part = "short"
        elif l.startswith("# OTHER WAYS TO OPEN"):
            part = "open"
        h = re.match(r"^## (.*)$", l)
        if h:
            cur = (part, h.group(1))
        m = re.match(r"^`(\d+|N)` (.*)$", l)
        if m:
            n += 1
            if m.group(1) != "N":
                mapping[int(m.group(1))] = n
            ranges.setdefault(cur, []).append(n)
            if part in words:
                words[part] += len(re.findall(r"[A-Za-z0-9'.]+", m.group(2).replace("⚠️", "")))
            l = f"`{n}` {m.group(2)}"
        out.append(l)
    script = "\n".join(out)

    def label(w):
        half = round(w / PACE * 2) / 2
        if half <= 1.25:
            return "ABOUT A MINUTE"
        whole, frac = int(half), half - int(half)
        names = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE"]
        return f"ABOUT {names[whole]}{' AND A HALF' if frac else ''} MINUTES"
    script = re.sub(r"(?m)^# LONG VERSION, .*$", f"# LONG VERSION, {label(words['long'])} ({words['long']} words)", script)
    script = re.sub(r"(?m)^# SHORT VERSION, .*$", f"# SHORT VERSION, {label(words['short'])} ({words['short']} words)", script)

    gone = []
    def new(x):
        x = int(x)
        if x not in mapping:
            gone.append(x)
            return str(x)
        return str(mapping[x])
    lines = []
    for l in notes.split("\n"):
        l = re.sub(r"^(- (?:⚠️ )?\*\*[^*]+\*\* \()([\d, ]+)(\))", lambda m: m.group(1) + ", ".join(new(x) for x in re.findall(r"\d+", m.group(2))) + m.group(3), l)
        l = re.sub(r"\b((?:over )?lines? )(\d+)( (?:and|to) )(\d+)", lambda m: m.group(1) + new(m.group(2)) + m.group(3) + new(m.group(4)), l)
        l = re.sub(r"\b((?:over )?line )(\d+)(?! (?:and|to) \d)", lambda m: m.group(1) + new(m.group(2)), l)
        lines.append(l)
    open(path, "w").write(script + "\n".join(lines))

    print(f"{n} lines. Long version {words['long']} words (about {words['long'] / PACE:.1f} min), short {words['short']} words (about {words['short'] / PACE * 60:.0f} s).")
    for (p, name), r in ranges.items():
        print(f"  {p:5} {name}: {r[0]} to {r[-1]}")
    moved = sorted((a, b) for a, b in mapping.items() if a != b)
    if moved:
        print(f"moved: old {moved[0][0]} to {moved[-1][0]} are now {moved[0][1]} to {moved[-1][1]}")
    if gone:
        print("notes that point at a line that is gone (left as they are):", sorted(set(gone)))

    if plan:
        v = open(plan).read()
        def row(m):
            head = m.group(1).upper()
            r = ranges.get(("long", head))
            return f"| {m.group(1)} (lines {r[0]} to {r[-1]}) |" if r else m.group(0)
        v = re.sub(r"(?m)^\| ([^|(]+?) \(lines \d+ to \d+\) \|", row, v)
        v = re.sub(r"Length: the long script is \d+ words, [^.]*\.", f"Length: the long script is {words['long']} words, about {words['long'] / PACE:.1f} minutes at the pace of the course scripts (125 words a minute).", v)
        open(plan, "w").write(v)
        print("shot list updated:", plan)


if __name__ == "__main__":
    main()
