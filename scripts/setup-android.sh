#!/usr/bin/env bash
# One-time Android project generation + hardening. Run on a machine with
# Node 20+, JDK 21 (or 17) and the Android SDK (platform 35). Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Installing dependencies"
npm install

echo "==> Building web bundle"
npm run build

if [ ! -d android ]; then
  echo "==> Adding Capacitor Android platform"
  npx cap add android
fi

echo "==> Generating launcher icons and splash from assets/"
npx --yes @capacitor/assets generate --android \
  --iconBackgroundColor '#0B0B10' --splashBackgroundColor '#0B0B10' || \
  echo "WARN: icon generation failed; default icons will be used"

echo "==> Installing native shell plugin"
JAVA_DIR=android/app/src/main/java/com/arshx/workstation
mkdir -p "$JAVA_DIR"
cp native/android/ShellPlugin.java native/android/MainActivity.java "$JAVA_DIR/"

echo "==> Hardening manifest and Gradle config"
python3 - <<'PY'
import json, re, pathlib, sys

pkg = json.load(open('package.json'))
version = pkg['version']
major, minor, patch = (int(x) for x in (version.split('.') + ['0', '0'])[:3])
version_code = major * 10000 + minor * 100 + patch

manifest = pathlib.Path('android/app/src/main/AndroidManifest.xml')
m = manifest.read_text()
m = re.sub(r'android:allowBackup="[^"]*"', 'android:allowBackup="false"', m)
if 'android:dataExtractionRules' not in m:
    m = m.replace('<application', '<application\n        android:dataExtractionRules="@xml/data_extraction_rules"', 1)
manifest.write_text(m)

xml_dir = pathlib.Path('android/app/src/main/res/xml')
xml_dir.mkdir(parents=True, exist_ok=True)
(xml_dir / 'data_extraction_rules.xml').write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<data-extraction-rules>\n'
    '    <cloud-backup><exclude domain="sharedpref" path="."/><exclude domain="database" path="."/></cloud-backup>\n'
    '    <device-transfer><exclude domain="sharedpref" path="."/><exclude domain="database" path="."/></device-transfer>\n'
    '</data-extraction-rules>\n')

gradle = pathlib.Path('android/app/build.gradle')
g = gradle.read_text()
g = re.sub(r'versionCode\s+\d+', f'versionCode {version_code}', g, count=1)
g = re.sub(r'versionName\s+"[^"]*"', f'versionName "{version}"', g, count=1)

if 'keystore.properties' not in g:
    signing = '''
def keystorePropsFile = rootProject.file("keystore.properties")
def keystoreProps = new Properties()
if (keystorePropsFile.exists()) { keystoreProps.load(new FileInputStream(keystorePropsFile)) }
'''
    g = g.replace('android {', signing + '\nandroid {', 1)
    g = g.replace('buildTypes {', '''signingConfigs {
        release {
            if (keystorePropsFile.exists()) {
                storeFile rootProject.file(keystoreProps['storeFile'])
                storePassword keystoreProps['storePassword']
                keyAlias keystoreProps['keyAlias']
                keyPassword keystoreProps['keyPassword']
            }
        }
    }
    buildTypes {''', 1)
    g = re.sub(r'(release\s*\{\s*)minifyEnabled\s+false',
               r'\1minifyEnabled true\n            shrinkResources true\n            if (keystorePropsFile.exists()) { signingConfig signingConfigs.release }', g, count=1)
gradle.write_text(g)
print(f"versionName={version} versionCode={version_code}")
PY

echo "==> Syncing web assets into the Android project"
npx cap sync android
echo
echo "Done. Next:  npm run android:debug   (APK: android/app/build/outputs/apk/debug/)"
echo "Release signing: copy scripts/keystore.properties.example -> android/keystore.properties"
