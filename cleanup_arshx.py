from pathlib import Path

def remove_once(file, old, label):
    p = Path(file)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"STOP: {label}: expected 1 match, found {count}")
    p.write_text(text.replace(old, "", 1))
    print("Removed:", label)

remove_once("src/components/Mobile/BottomNav.tsx",
            "  Gamepad2,\n", "mobile Gamepad2 import")
remove_once("src/components/Mobile/BottomNav.tsx",
            "  GraduationCap,\n", "mobile GraduationCap import")
remove_once("src/components/Mobile/BottomNav.tsx",
            "  { tab: 'game', label: 'Game Creator', icon: Gamepad2 },\n",
            "mobile Game Creator entry")
remove_once("src/components/Mobile/BottomNav.tsx",
            "  { tab: 'timemachine', label: 'Time Machine', icon: History },\n",
            "mobile Time Machine entry")
remove_once("src/components/Mobile/BottomNav.tsx",
            "  { tab: 'academy', label: 'Academy', icon: GraduationCap },\n",
            "mobile Academy entry")

remove_once("src/components/Header/TopNav.tsx",
            "  Gamepad2,\n", "desktop Gamepad2 import")
remove_once("src/components/Header/TopNav.tsx",
            "  GraduationCap,\n", "desktop GraduationCap import")

p = Path("src/components/Header/TopNav.tsx")
s = p.read_text()
start = s.find("        <button\n          onClick={() => onTabChange('game')}")
if start < 0:
    raise SystemExit("STOP: Game Creator desktop button not found")
end = s.find("        </button>", start)
if end < 0:
    raise SystemExit("STOP: Game Creator button end not found")
s = s[:start] + s[end + len("        </button>\n"):]
start = s.find("        <button\n          onClick={() => onTabChange('academy')}")
if start < 0:
    raise SystemExit("STOP: Academy desktop button not found")
end = s.find("        </button>", start)
if end < 0:
    raise SystemExit("STOP: Academy button end not found")
s = s[:start] + s[end + len("        </button>\n"):]
s = s.replace(
    "activeTab === 'doctor' || activeTab === 'build' || activeTab === 'timemachine'",
    "activeTab === 'doctor' || activeTab === 'build'"
)
p.write_text(s)
print("Updated: desktop navigation")

remove_once("src/App.tsx",
            "import { TimeMachine } from './components/TimeMachine/TimeMachine';\n",
            "Time Machine import")
remove_once("src/App.tsx",
            "import { GameCreator } from './components/GameCreator/GameCreator';\n",
            "Game Creator import")
remove_once("src/App.tsx",
            "import { CodingAcademy } from './components/Academy/CodingAcademy';\n",
            "Academy import")

p = Path("src/App.tsx")
s = p.read_text()
start = s.find("      case 'game':")
if start < 0:
    raise SystemExit("STOP: Game Creator route not found")
end = s.find("      case ", start + 1)
if end < 0:
    raise SystemExit("STOP: next route after Game Creator not found")
s = s[:start] + s[end:]

s = s.replace(
    "      case 'academy':\n        return <CodingAcademy />;\n", "", 1
)

start = s.find("      case 'timemachine':")
if start >= 0:
    end = s.find("      case ", start + 1)
    if end < 0:
        raise SystemExit("STOP: next route after Time Machine not found")
    s = s[:start] + s[end:]

p.write_text(s)
print("Updated: app routes")

for tab in ("game", "academy", "timemachine"):
    remove_once("src/types/index.ts", f"  | '{tab}'\n", f"{tab} tab type")

print("\nCleanup completed.")
