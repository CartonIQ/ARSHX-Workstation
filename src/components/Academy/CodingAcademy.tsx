import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  CheckCircle2, 
  Circle, 
  Play, 
  Sparkles, 
  BookOpen, 
  Code2, 
  RotateCcw, 
  Trophy,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { AcademyLesson } from '../../types';

const ACADEMY_STORAGE_KEY = 'arshx_academy_completed_v1';

const LESSONS: AcademyLesson[] = [
  {
    id: 'kt-1',
    track: 'kotlin',
    title: '1. Kotlin Variables & Immutability',
    difficulty: 'Beginner',
    description: 'In Kotlin, variables are declared with val (immutable / read-only) or var (mutable). Always prefer val unless the variable genuinely changes.',
    starterCode: `fun main() {\n    // Task: Declare a read-only val named appName with value "ARSHX"\n    val appName = "ARSHX"\n    println("Welcome to " + appName)\n}`,
    solutionKeyword: 'val appName = "ARSHX"',
    explanation: 'val declares an immutable reference, which prevents accidental reassignment and ensures thread safety in Android applications.',
    testPrompt: 'Declare an immutable val named appName with the string "ARSHX".',
  },
  {
    id: 'kt-2',
    track: 'kotlin',
    title: '2. Jetpack Compose State with remember',
    difficulty: 'Intermediate',
    description: 'Jetpack Compose recalculates UI through recomposition. Use remember { mutableStateOf(...) } to retain state across recompositions.',
    starterCode: `@Composable\nfun CounterWidget() {\n    // Task: declare count state initialized to 0\n    var count by remember { mutableStateOf(0) }\n    Button(onClick = { count++ }) {\n        Text("Clicks: $count")\n    }\n}`,
    solutionKeyword: 'mutableStateOf',
    explanation: 'mutableStateOf notifies the Compose runtime when the value changes, automatically scheduling recomposition of affected composables.',
    testPrompt: 'Ensure count uses remember { mutableStateOf(...) }.',
  },
  {
    id: 'web-1',
    track: 'web',
    title: '3. JavaScript DOM Event Listeners',
    difficulty: 'Beginner',
    description: 'Connect user interactions to logic using addEventListener on elements retrieved from the DOM.',
    starterCode: `const button = document.getElementById("launchBtn");\n// Task: Add a 'click' event listener to button\nbutton.addEventListener("click", () => {\n  console.log("ARSHX activated");\n});`,
    solutionKeyword: 'addEventListener("click"',
    explanation: 'addEventListener decouples DOM structure from interactive behavior, adhering to standard modern web practices.',
    testPrompt: 'Attach a click event listener using button.addEventListener("click", ...).',
  },
  {
    id: 'termux-1',
    track: 'termux',
    title: '4. Termux SDK 35 Build Execution',
    difficulty: 'Beginner',
    description: 'Assemble an Android debug APK in Termux or POSIX terminal using the Gradle wrapper.',
    starterCode: `#!/bin/bash\n# Task: Execute the Gradle debug APK build task\n./gradlew :app:assembleDebug --stacktrace`,
    solutionKeyword: './gradlew :app:assembleDebug',
    explanation: './gradlew ensures the exact pinned Gradle version (8.11.1) is downloaded and executed without depending on system Gradle.',
    testPrompt: 'Execute ./gradlew :app:assembleDebug.',
  },
  {
    id: 'git-1',
    track: 'git',
    title: '5. Git Commit Checkpoints',
    difficulty: 'Beginner',
    description: 'Create a permanent checkpoint in Git version control with an informative commit message.',
    starterCode: `git add .\ngit commit -m "feat: implement CodeKeys toolbar"`,
    solutionKeyword: 'git commit -m',
    explanation: 'A structured commit message documents why the change was made and enables safe rollbacks via Time Machine.',
    testPrompt: 'Commit changes using git commit -m "...".',
  },
];

export const CodingAcademy: React.FC = () => {
  const [selectedTrack, setSelectedTrack] = useState<'all' | 'kotlin' | 'web' | 'termux' | 'git'>('all');
  const [activeLessonId, setActiveLessonId] = useState<string>(LESSONS[0].id);
  const [userCode, setUserCode] = useState<string>(LESSONS[0].starterCode);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<{ passed: boolean; message: string } | null>(null);

  // Load progress
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACADEMY_STORAGE_KEY);
      if (saved) setCompletedIds(JSON.parse(saved));
    } catch {}
  }, []);

  const activeLesson = LESSONS.find(l => l.id === activeLessonId) || LESSONS[0];

  const handleSelectLesson = (lesson: AcademyLesson) => {
    setActiveLessonId(lesson.id);
    setUserCode(lesson.starterCode);
    setTestResult(null);
  };

  const handleTestSolution = () => {
    const passed = userCode.includes(activeLesson.solutionKeyword);
    if (passed) {
      setTestResult({
        passed: true,
        message: '✔ Test Passed! Solution verified against expected criteria.',
      });
      if (!completedIds.includes(activeLesson.id)) {
        const next = [...completedIds, activeLesson.id];
        setCompletedIds(next);
        localStorage.setItem(ACADEMY_STORAGE_KEY, JSON.stringify(next));
      }
    } else {
      setTestResult({
        passed: false,
        message: `✘ Solution requirement missing: Expected '${activeLesson.solutionKeyword}'.`,
      });
    }
  };

  const filteredLessons = selectedTrack === 'all' 
    ? LESSONS 
    : LESSONS.filter(l => l.track === selectedTrack);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0E0E12] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-14 bg-[#141418] border-b border-[#24242C] px-4 md:px-6 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <GraduationCap className="w-5 h-5 text-[#E5222A]" />
          <div>
            <h2 className="text-sm font-bold text-white">ARSHX Coding Academy</h2>
            <p className="text-[11px] text-[#A5A5B2]">
              Hands-on interactive masterclasses in Kotlin Compose, Termux, Git, and Web development.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#86EFAC] bg-[#22C55E]/10 border border-[#22C55E]/20 px-2.5 py-1 rounded-lg">
            {completedIds.length} / {LESSONS.length} Completed
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: Lesson Directory */}
        <div className="w-full md:w-80 bg-[#121216] border-r border-[#24242C] p-3 flex flex-col overflow-y-auto shrink-0 space-y-3">
          {/* Track Filters */}
          <div className="flex flex-wrap gap-1">
            {['all', 'kotlin', 'web', 'termux', 'git'].map(track => (
              <button
                key={track}
                onClick={() => setSelectedTrack(track as any)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-colors ${
                  selectedTrack === track
                    ? 'bg-[#E5222A] text-white'
                    : 'bg-[#1A1A22] text-[#A5A5B2] hover:text-white'
                }`}
              >
                {track}
              </button>
            ))}
          </div>

          {/* Lessons List */}
          <div className="space-y-1.5 flex-1">
            {filteredLessons.map(lesson => {
              const isSelected = lesson.id === activeLesson.id;
              const isCompleted = completedIds.includes(lesson.id);

              return (
                <div
                  key={lesson.id}
                  onClick={() => handleSelectLesson(lesson)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#1F1F27] border-[#E5222A]/50 text-white'
                      : 'bg-[#15151B] border-[#24242E] hover:border-[#343442] text-[#A5A5B2]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-white truncate">{lesson.title}</span>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-[#4B4B5C] shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-[#A5A5B2] uppercase font-mono tracking-wider">
                    {lesson.track} · {lesson.difficulty}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Exercise Workspace */}
        <div className="flex-1 flex flex-col bg-[#0B0B0E] overflow-hidden select-text">
          {/* Lesson Header & Objective */}
          <div className="p-4 bg-[#141418] border-b border-[#24242C] space-y-2 select-none">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">{activeLesson.title}</h3>
              <span className="text-xs font-mono text-[#FF5E65] bg-[#E5222A]/10 px-2 py-0.5 rounded">
                {activeLesson.track.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              {activeLesson.description}
            </p>
            <div className="p-2.5 bg-[#1B1B24] rounded-lg border border-[#2A2A38] text-xs text-[#93C5FD] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#67E8F9] shrink-0" />
              <span><strong>Task:</strong> {activeLesson.testPrompt}</span>
            </div>
          </div>

          {/* Interactive Code Editor */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0F0F14]">
            <div className="h-9 bg-[#16161D] border-b border-[#24242C] px-3 flex items-center justify-between text-xs text-[#A5A5B2] select-none">
              <span className="font-mono text-white">Exercise Workspace</span>
              <button
                onClick={() => setUserCode(activeLesson.starterCode)}
                className="text-[11px] text-[#A5A5B2] hover:text-white flex items-center gap-1 font-mono"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Starter Code</span>
              </button>
            </div>
            <textarea
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              spellCheck={false}
              className="flex-1 p-4 bg-transparent text-[#F7F7FA] font-mono text-xs leading-5 resize-none focus:outline-none overflow-auto selection:bg-[#E5222A]/30"
            />
          </div>

          {/* Verification Bar & Result */}
          <div className="p-3 bg-[#131317] border-t border-[#24242C] flex items-center justify-between gap-3 select-none">
            <div>
              {testResult && (
                <span className={`text-xs font-semibold ${testResult.passed ? 'text-[#86EFAC]' : 'text-[#F87171]'}`}>
                  {testResult.message}
                </span>
              )}
            </div>

            <button
              onClick={handleTestSolution}
              className="px-5 py-2 bg-[#E5222A] hover:bg-[#d01c24] text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-[#E5222A]/20"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run & Verify Solution</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
