import { Project } from '../types';

/**
 * Starter workspace shown only on first launch (when nothing is stored yet).
 * Existing users keep their saved projects; this is never merged into them.
 * The app requires at least one project, so a single minimal starter is provided.
 */
const now = () => Date.now();

export const STARTER_PROJECT_ID = 'my-first-project';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: STARTER_PROJECT_ID,
    name: 'My First Project',
    description: 'A small web page to try the editor, terminal and Live Preview.',
    category: 'web',
    gitBranch: 'main',
    lastCommitMessage: 'Initial commit',
    createdAt: now(),
    updatedAt: now(),
    activeFileId: 'starter-index',
    files: [
      {
        id: 'starter-index',
        name: 'index.html',
        path: 'index.html',
        language: 'html',
        isEntry: true,
        updatedAt: now(),
        content:
          '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My First Project</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <main>\n    <h1>Hello, ARSHX</h1>\n    <p>Edit these files, then open Live Preview.</p>\n    <button id="btn">Tapped 0 times</button>\n  </main>\n  <script src="app.js"></script>\n</body>\n</html>\n',
      },
      {
        id: 'starter-style',
        name: 'style.css',
        path: 'style.css',
        language: 'css',
        updatedAt: now(),
        content:
          '* { box-sizing: border-box; margin: 0; padding: 0; }\nbody { min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; background: #0b0b10; color: #f7f7fa; }\nmain { text-align: center; padding: 24px; }\nh1 { font-size: 2rem; margin-bottom: 8px; }\np { color: #b4b4c2; margin-bottom: 20px; }\nbutton { padding: 12px 20px; border: 0; border-radius: 12px; font-weight: 700; color: #fff; background: #e5222a; }\n',
      },
      {
        id: 'starter-app',
        name: 'app.js',
        path: 'app.js',
        language: 'javascript',
        updatedAt: now(),
        content:
          "let taps = 0;\nconst btn = document.getElementById('btn');\nbtn.addEventListener('click', () => {\n  taps += 1;\n  btn.textContent = 'Tapped ' + taps + (taps === 1 ? ' time' : ' times');\n});\n",
      },
    ],
  },
];
