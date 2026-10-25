# ARSHX Academy - phase 5 (full update, replaces phases 1-4)

New files only. Nothing existing in ARSHX is modified by this ZIP.

## Install (Termux)
```
cd ~/ARSHX-v1.3
unzip -o ~/storage/downloads/arshx-academy-phase5.zip
npx tsx tests/academy.test.mts
npx tsx tests/academy.verify-python.mts
npm run typecheck
```
Expected: "13 test groups passed" and "all checked lesson code behaves as the lessons say".
(The verify file name is historical. It checks Python, JavaScript, TypeScript and Java.
Java needs a JDK on the device. Termux has openjdk-21 installed, so it will run.)

## Courses written (29 lessons)
- Programming Fundamentals (7)
- Python Essentials (5)
- Web Development (9): HTML, CSS, JavaScript, TypeScript
- Android Development (8): Java basics, Java classes/inheritance/collections, Kotlin basics,
  Kotlin null safety/data classes/collections, coroutines concepts, Android app structure,
  Activity lifecycle, Gradle basics

## How content was checked
- Python, JavaScript, TypeScript and Java lesson code is run with real runtimes and compared with the lessons.
- Kotlin, Android (Kotlin/XML) and Gradle examples were NOT run: no Kotlin compiler or Android SDK was available.
  Their exercises check code shape only. Please test Kotlin examples in a real project before relying on them.
- HTML and CSS are not machine-checked beyond tag balance.

## Hand-off for merging the tab (not done by this ZIP)
- Add 'academy' to ActiveTab in src/types/index.ts
- Add a button in TopNav.tsx and BottomNav.tsx
- In App.tsx: import AcademyTab from './academy/AcademyTab' and add case 'academy': return <AcademyTab />;
- Add "&& tsx tests/academy.test.mts" to the "test" script in package.json

## NOT written yet
C, C++, C#, Dart, Go, Rust, SQL, Bash, JSON, XML; Android layouts/Compose, data storage, permissions,
Logcat debugging; remaining Fundamentals topics (collections, debugging, testing, algorithms, Git, reading docs);
Java exceptions/interfaces/generics. Not done: debug APK build and on-device testing.
