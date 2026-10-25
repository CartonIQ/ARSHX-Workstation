export type FileLanguage = 
  | 'kotlin' 
  | 'typescript' 
  | 'javascript' 
  | 'html' 
  | 'css' 
  | 'json' 
  | 'markdown' 
  | 'python' 
  | 'shell' 
  | 'xml' 
  | 'plaintext';

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: FileLanguage;
  updatedAt: number;
  isEntry?: boolean;
  isDirty?: boolean;
}

export type ProjectCategory = 'android' | 'web' | 'game' | 'automation' | 'script';

export interface Project {
  id: string;
  name: string;
  description: string;
  category: ProjectCategory;
  files: ProjectFile[];
  activeFileId: string;
  createdAt: number;
  updatedAt: number;
  gitBranch: string;
  lastCommitMessage?: string;
}

export interface TerminalEntry {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'system' | 'info';
  text: string;
  timestamp: number;
  command?: string;
}

export interface Checkpoint {
  id: string;
  projectId: string;
  commitHash: string;
  message: string;
  timestamp: number;
  files: ProjectFile[];
}

export interface DoctorDiagnostic {
  id: string;
  file: string;
  line?: number;
  category: 'syntax' | 'dependency' | 'security' | 'architecture' | 'manifest';
  severity: 'error' | 'warning' | 'info';
  title: string;
  detail: string;
  fixable: boolean;
  suggestedFix?: string;
  isHeuristic?: boolean;
}

export type ActiveTab = 
  | 'home' 
  | 'designer'
  | 'creator'
  | 'editor' 
  | 'terminal' 
  | 'preview' 
  | 'website'
  | 'doctor' 
  | 'timemachine' 
  | 'build'
  | 'toolkit'
  | 'academy';

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isFallback?: boolean;
  codeSnippet?: {
    code: string;
    language: string;
    filename?: string;
  };
}

export interface AcademyLesson {
  id: string;
  track: 'kotlin' | 'web' | 'termux' | 'git' | 'python';
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  starterCode: string;
  solutionKeyword: string;
  explanation: string;
  testPrompt: string;
}

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  autoSave: boolean;
  showLineNumbers: boolean;
}

// AI Designer Structured Specification Schema
export interface DesignerComponent {
  id: string;
  type: 'header' | 'metric' | 'chart' | 'actions' | 'list' | 'card' | 'input' | 'bottom_nav';
  title: string;
  subtitle?: string;
  visible: boolean;
  data?: Record<string, any>;
}

export interface DesignerScreenSpec {
  screenTitle: string;
  category: string;
  theme: {
    accentColor: string;
    backgroundColor: string;
    borderRadius: 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl';
  };
  components: DesignerComponent[];
  generatedComposeCode: string;
  generatedHtmlCode?: string;
}

// AI Creator Project Specification Schema
export interface CreatorProjectSpec {
  projectName: string;
  description: string;
  platform: 'android' | 'web';
  architecturePlan: Array<{
    step: string;
    detail: string;
    files: string[];
  }>;
  files: Array<{
    name: string;
    path: string;
    language: FileLanguage;
    content: string;
    isEntry?: boolean;
  }>;
}

// Safe ZIP Import Result
export interface ZipImportResult {
  success: boolean;
  projectName: string;
  files: ProjectFile[];
  warnings: string[];
  errors: string[];
}
