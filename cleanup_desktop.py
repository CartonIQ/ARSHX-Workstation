from pathlib import Path

def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    count = s.count(old)
    if count != 1:
        raise SystemExit(
            f"STOP: {label}: expected 1 match, found {count}. "
            "No replacement made for this item."
        )
    p.write_text(s.replace(old, new, 1))
    print("Updated:", label)

# Remove desktop navigation icons.
p = Path("src/components/Header/TopNav.tsx")
s = p.read_text()
s = s.replace("  Gamepad2,\n", "", 1)
s = s.replace("  GraduationCap,\n", "", 1)

for tab, label in [("game", "Game Creator"), ("academy", "Academy")]:
    start = s.find(f"        <button\n          onClick={{() => onTabChange('{tab}')}}")
    if start == -1:
        raise SystemExit(f"STOP: {label} desktop button not found")
    end = s.find("        </button>", start)
    if end == -1:
        raise SystemExit(f"STOP: {label} button end not found")
    end += len("        </button>")
    if end < len(s) and s[end] == "\n":
        end += 1
    s = s[:start] + s[end:]

s = s.replace(
    "activeTab === 'doctor' || activeTab === 'build' || activeTab === 'timemachine'",
    "activeTab === 'doctor' || activeTab === 'build'"
)
p.write_text(s)
print("Updated: desktop navigation")

# Remove app imports and route cases using the actual case boundaries.
p = Path("src/App.tsx")
s = p.read_text()

for line, label in [
    ("import { TimeMachine } from './components/TimeMachine/TimeMachine';\n", "TimeMachine import"),
    ("import { GameCreator } from './components/GameCreator/GameCreator';\n", "GameCreator import"),
    ("import { CodingAcademy } from './components/Academy/CodingAcademy';\n", "CodingAcademy import"),
]:
    if line in s:
        s = s.replace(line, "", 1)
        print("Removed:", label)
    else:
        print("Already absent:", label)

# Remove Game Creator route.
start = s.find("      case 'game':")
if start != -1:
    end = s.find("      case ", start + len("      case "))
    if end == -1:
        raise SystemExit("STOP: could not locate route after Game Creator")
    s = s[:start] + s[end:]

# Remove Academy route, even if its line formatting is unusual.
start = s.find("      case 'academy':")
if start != -1:
    end = s.find("      case ", start + len("      case "))
    if end == -1:
        raise SystemExit("STOP: could not locate route after Academy")
    s = s[:start] + s[end:]

# Remove Time Machine route.
start = s.find("      case 'timemachine':")
if start != -1:
    end = s.find("      case ", start + len("      case "))
    if end == -1:
        raise SystemExit("STOP: could not locate route after Time Machine")
    s = s[:start] + s[end:]

p.write_text(s)
print("Updated: app routes")

# Remove obsolete active-tab types if present.
p = Path("src/types/index.ts")
s = p.read_text()
for tab in ("game", "academy", "timemachine"):
    line = f"  | '{tab}'\n"
    if line in s:
        s = s.replace(line, "", 1)
        print("Removed tab type:", tab)

p.write_text(s)
print("\nCleanup script finished.")
