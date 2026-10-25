from pathlib import Path

def edit(path, replacements):
    p = Path(path)
    s = p.read_text()
    original = s
    for old, new, label in replacements:
        count = s.count(old)
        if count != 1:
            raise SystemExit(
                f"STOP: {path}: {label}: expected 1 match, found {count}. "
                "This file was not written."
            )
        s = s.replace(old, new, 1)
    if s != original:
        p.write_text(s)
        print("Updated:", path)

# Desktop navigation
edit("src/components/Header/TopNav.tsx", [
    ("  Palette,\n", "", "Palette import"),
    ("""        <button
          onClick={() => onTabChange('designer')}
          className={`px-2.5 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'designer'
              ? 'bg-[#24242C] text-white'
              : 'text-[#A5A5B2] hover:text-[#F7F7FA] hover:bg-[#1A1A20]'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-[#C084FC]" />
          <span>AI Designer</span>
        </button>

""", "", "AI Designer desktop button"),
    ("activeTab === 'doctor' || activeTab === 'build'", "activeTab === 'doctor'", "Tools active state"),
])

# Mobile navigation
edit("src/components/Mobile/BottomNav.tsx", [
    ("  Palette,\n", "", "Palette import"),
    ("  Hammer,\n", "", "Hammer import"),
    ("  { tab: 'designer', label: 'AI Designer', icon: Palette },\n", "", "AI Designer mobile entry"),
    ("  { tab: 'build', label: 'Build Center', icon: Hammer },\n", "", "Build Center mobile entry"),
])

# App imports and routes
p = Path("src/App.tsx")
s = p.read_text()

for line, label in [
    ("import { AiDesigner } from './components/Designer/AiDesigner';\n", "AI Designer import"),
    ("import { BuildCenter } from './components/Build/BuildCenter';\n", "Build Center import"),
]:
    if s.count(line) != 1:
        raise SystemExit(f"STOP: {label}: expected one import, found {s.count(line)}")
    s = s.replace(line, "", 1)

for tab, label in [("designer", "AI Designer"), ("build", "Build Center")]:
    start = s.find(f"      case '{tab}':")
    if start < 0:
        raise SystemExit(f"STOP: {label} route not found")
    end = s.find("      case ", start + len("      case "))
    if end < 0:
        raise SystemExit(f"STOP: next route after {label} not found")
    s = s[:start] + s[end:]

p.write_text(s)
print("Updated: src/App.tsx")

# Remove dashboard card definitions by locating their object blocks.
p = Path("src/components/Home/WorkspaceDashboard.tsx")
s = p.read_text()

for tab, label in [("designer", "AI Designer"), ("build", "APK Build Center")]:
    marker = f"tab: '{tab}' as ActiveTab"
    pos = s.find(marker)
    if pos < 0:
        raise SystemExit(f"STOP: dashboard {label} card not found")

    start = s.rfind("{", 0, pos)
    if start < 0:
        raise SystemExit(f"STOP: dashboard {label} object start not found")

    # Find the end of this object by balancing braces while respecting strings.
    depth = 0
    quote = None
    escape = False
    end = None
    for i in range(start, len(s)):
        ch = s[i]
        if quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = None
            continue
        if ch in ("'", '"', "`"):
            quote = ch
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break

    if end is None:
        raise SystemExit(f"STOP: couldn't find end of dashboard {label} object")

    # Remove surrounding comma/whitespace safely.
    left = start
    right = end
    while left > 0 and s[left - 1] in " \t":
        left -= 1
    if left > 0 and s[left - 1] == ",":
        left -= 1
    while right < len(s) and s[right] in " \t":
        right += 1
    if right < len(s) and s[right] == ",":
        right += 1
    s = s[:left] + s[right:]
    print("Removed dashboard card:", label)

p.write_text(s)
print("Updated: src/components/Home/WorkspaceDashboard.tsx")
print("\nTool cleanup script completed.")
