import type { Course } from '../types';
import { validateCurriculum } from '../validate';
import { fundamentals } from './fundamentals';
import { fundamentalsPart2 } from './fundamentals-2';
import { pythonEssentials } from './python';
import { webDevelopment } from './web';
import { androidDevelopment } from './android';

const fundamentalsFull: Course = { ...fundamentals, modules: [...fundamentals.modules, ...fundamentalsPart2] };

export const COURSES: Course[] = [fundamentalsFull, pythonEssentials, webDevelopment, androidDevelopment];

/** Problems found in bundled curriculum. The UI shows these instead of crashing. */
export const CURRICULUM_ERRORS: string[] = validateCurriculum(COURSES);
