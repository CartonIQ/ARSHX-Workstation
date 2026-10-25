# ARSHX Developer Workstation

Mobile-first coding workstation: multi-file editor, sandboxed terminal, live preview, Project Doctor,
Time Machine checkpoints, Web/Game studios, and Gemini-powered AI tools. React 19 + Tailwind 4,
packaged for Android with Capacitor (`com.arshx.workstation`).

## Develop
```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck
npm run build
```

## AI features (bring your own key)
There is no backend. Open **Settings > AI (Gemini)**, paste a key from <https://aistudio.google.com/apikey>,
and tap *Verify & Save*. The key lives only in the app's private storage and is sent only to
`generativelanguage.googleapis.com`. Without a key the editor, terminal, preview and all other tools still work.

## Android
```bash
npm run android:setup     # once: generates android/, icons, hardening, versioning
npm run android:debug     # debug APK -> android/app/build/outputs/apk/debug/
npm run android:release   # signed AAB/APK (needs android/keystore.properties)
```
Requires Node 20+, JDK 21 (or 17), Android SDK platform 35. No local toolchain? Run the
**Android build** GitHub workflow (Actions tab). See `docs/RELEASE.md` for signing and Play steps.
