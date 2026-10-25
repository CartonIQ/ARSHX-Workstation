# Audit and change log (v1.0.0)

## Findings in the supplied project
- Web app (React/Vite/Express), not an Android project: no `android/`, no Gradle. Nested Kotlin ZIPs were an unverified skeleton.
- AI depended on `server.ts`; an APK has no server, so AI could not work.
- Docs/checklists claimed Kotlin/Compose/Gradle items COMPLETE that did not exist.
- Main-thread `new Function` fallback in the terminal could read app storage (now including the API key).
- Fake "local fallback" AI results (hard-coded fitness demo, stub projects) shown as if generated.
- Google Fonts from CDN (fails offline); viewport blocked zoom; no safe-area handling; `h-screen` clipping.
- Unused deps (`motion`, `express`, `dotenv`, `@google/genai`, `esbuild`, `autoprefixer`, `@types/jszip`); Capacitor packages missing.

## Changes
- Backend removed. `src/utils/gemini.ts` calls Gemini directly with the user's key (header auth, timeout, typed errors).
- Settings > AI: key entry, live verification, model choice, remove key.
- Fake fallbacks removed; failures show an error banner.
- Glass design system (`src/index.css`): tokens, glass-panel/card/input/buttons, aurora background, central re-skin of existing screens, AA contrast lifts, reduced-motion / reduced-transparency support.
- New bottom dock with centered AI button and "More" sheet reaching all 9 tools + Settings on phones.
- Safe-area insets, `dvh`, `viewport-fit=cover`, zoom enabled, bundled fonts.
- Three demo projects replaced by one minimal starter (saved user projects untouched).
- Android toolchain: Capacitor 7 deps, `scripts/setup-android.sh` (manifest hardening, versioning, signing, icons), GitHub Actions workflow, icon/splash assets, release guide.

## Verified
- Unit tests of the Gemini client with mocked network: 19/19 pass (`npm test`).
- Best-effort TypeScript check of `src/` with missing-package noise filtered: no remaining errors.

## NOT verified (no network, no node_modules, no Android SDK in the authoring sandbox)
- `npm install`, `vite build`, full-fidelity typecheck, Gradle build, APK/AAB output, signing.
- Visual rendering of the new UI on any device; edge-to-edge insets on Android 15.
- Real Gemini calls and the default model name `gemini-2.5-flash` (changeable in Settings).
- Package versions chosen in `package.json` (resolved only when you run `npm install`).

## v1.1 additions: real terminal + new logo
- **Native shell** (Android app only): `native/android/ShellPlugin.java` runs `/system/bin/sh` as a child process of the app (no root, app sandbox), up to 6 sessions. The setup script copies it and `MainActivity.java` into the generated `android/` project.
- **Terminal UI** (`NativeShell.tsx`, xterm.js): tabs, extra-keys bar (Esc/Tab/Ctrl/arrows/symbols), local line editor with history, project files mirrored into the shell's working folder with import-back, AI command helper and error explainer (suggestions are never auto-run; risky commands are flagged).
- Limits: pipes, not a PTY, so no full-screen programs (vim, top) or job control. Android's built-in toolset only (no git/node/gradle unless added later via a Termux bridge). In the browser the simulated terminal is used.
- **New logo "Prompt A"**: A drawn as a chevron with a terminal cursor as the crossbar, on a glass tile. Used in-app, favicon, launcher icon, splash, and Play assets (`assets/play-icon-512.png`, `assets/play-feature-graphic-1024x500.png`).
- Tests: `npm test` runs 50 tests (Gemini client 19, line editor 20, AI command safety 11), all passing here.
- Java plugin compiles against stub Capacitor classes only; real compile and on-device behaviour are **not verified**.

## v1.2: phone layout fixes + Dev Toolkit
- Editor: the 256dp file sidebar is now a slide-in drawer on phones (button at the left of the editor header); the code area uses the full width. Sidebar stays fixed on large screens.
- Preview: on phones it is full-screen with no fake phone frame; Split view is hidden below 1024px and "Run Preview" opens full preview.
- New **Dev Toolkit** (More menu / top bar): JSON format and minify, Base64, URL encode, SHA-1/256/512, JWT decode (no signature check), timestamp, color converter with contrast, UUID, regex tester. All local; 31 unit tests.
- Not verified on device (layout fixes written from your screenshot, not run).
- Settings > About now includes an "About the owner" card (Mohd Arsh, CartonIQ; website, GitHub, email, YouTube) driven by `src/data/owner.ts`.
