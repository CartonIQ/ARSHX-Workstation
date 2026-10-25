# Release guide

## Identity (unchanged)
Application ID `com.arshx.workstation` - do not change after first Play upload.
Version comes from `package.json` (`1.0.0` -> versionCode `10000`); bump it before every upload.

## Signing
1. `keytool -genkey -v -keystore arshx-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias arshx_release`
2. Copy `scripts/keystore.properties.example` to `android/keystore.properties` and fill it in.
3. `npm run android:release` -> `android/app/build/outputs/bundle/release/app-release.aab`
Back the keystore up offline and enrol in Play App Signing. Never commit `.jks` or `keystore.properties`.
CI: add secrets `ARSHX_KEYSTORE_BASE64`, `ARSHX_STORE_PASSWORD`, `ARSHX_KEY_ALIAS`, `ARSHX_KEY_PASSWORD`.

## Before submitting to Google Play
- [ ] Install the release build on a real device and exercise every screen (see QA list below)
- [ ] Privacy policy URL (the app sends prompts + open file content to Google Gemini when the user adds a key)
- [ ] Data safety form: user-provided content shared with a third party (Google) only on user action
- [ ] 512x512 icon, 1024x500 feature graphic, phone + 7"/10" tablet screenshots
- [ ] Content rating questionnaire; target audience; confirm no ads are shown
- [ ] Check Play pre-launch report; confirm targetSdk 35 and 16 KB page-size compatibility in the report

## QA list
Edge-to-edge insets (status/nav bars, cutouts) - keyboard overlap in editor/terminal - rotation -
More sheet and all 9 destinations - create/rename/delete project and file - ZIP import/export -
backup/restore - terminal `run` of a JS file - Live Preview - Settings > AI with valid/invalid key,
airplane mode - background/foreground restore.
