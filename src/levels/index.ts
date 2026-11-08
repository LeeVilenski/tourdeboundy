import { LEVEL1 } from './level1';
import { LEVEL2 } from './level2';
import { LEVEL3 } from './level3';
import { LEVEL_HC } from './levelHillClimb';
import { LEVEL_SID } from './levelSidmouth';
import { LEVEL4 } from './level4';
import { LEVEL5 } from './level5';
// order = level number (ids 1-7)
export const LEVELS = [LEVEL1, LEVEL2, LEVEL3, LEVEL_HC, LEVEL_SID, LEVEL4, LEVEL5];
export const LEVEL_NAMES = LEVELS.map((l) => l.name);
