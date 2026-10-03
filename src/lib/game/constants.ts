// Game constants — ported from GameModels.kt and Color.kt / PlayerColors.kt

import type { ScorecardRowConfig } from './models';

export const SCORING_MULTIPLIERS = [1, 2, 3, 4, 7, 10] as const;

export const LEFT_SCORECARD_CONFIG: ScorecardRowConfig[] = [
	{ rowNumber: 2,  penaltyBoxCount: 3, baseValue: 10, totalBoxes: 3 + SCORING_MULTIPLIERS.length },
	{ rowNumber: 3,  penaltyBoxCount: 3, baseValue: 7,  totalBoxes: 3 + SCORING_MULTIPLIERS.length },
	{ rowNumber: 4,  penaltyBoxCount: 4, baseValue: 6,  totalBoxes: 4 + SCORING_MULTIPLIERS.length },
	{ rowNumber: 5,  penaltyBoxCount: 4, baseValue: 5,  totalBoxes: 4 + SCORING_MULTIPLIERS.length },
	{ rowNumber: 6,  penaltyBoxCount: 5, baseValue: 4,  totalBoxes: 5 + SCORING_MULTIPLIERS.length },
	{ rowNumber: 7,  penaltyBoxCount: 5, baseValue: 3,  totalBoxes: 5 + SCORING_MULTIPLIERS.length },
	{ rowNumber: 8,  penaltyBoxCount: 5, baseValue: 4,  totalBoxes: 5 + SCORING_MULTIPLIERS.length },
	{ rowNumber: 9,  penaltyBoxCount: 4, baseValue: 5,  totalBoxes: 4 + SCORING_MULTIPLIERS.length },
	{ rowNumber: 10, penaltyBoxCount: 4, baseValue: 6,  totalBoxes: 4 + SCORING_MULTIPLIERS.length },
	{ rowNumber: 11, penaltyBoxCount: 3, baseValue: 7,  totalBoxes: 3 + SCORING_MULTIPLIERS.length },
	{ rowNumber: 12, penaltyBoxCount: 3, baseValue: 10, totalBoxes: 3 + SCORING_MULTIPLIERS.length },
];

export const LEFT_SCORECARD_CONFIG_MAP: Record<number, ScorecardRowConfig> =
	Object.fromEntries(LEFT_SCORECARD_CONFIG.map(c => [c.rowNumber, c]));

export const RIGHT_SCORECARD_BOXES_PER_ROW = 4;
export const RIGHT_SCORECARD_ROWS = [1, 2, 3, 4, 5, 6];

// UI colours (theme, players, scorecard) live in src/app.css as design tokens

// --- AI bot names ---

export const AI_BOT_NAMES: Record<string, string[]> = {
	EASY: ['Lucky Lucy', 'Dizzy Dave', 'Bumble', 'Clover', 'Wobbles', 'Daydream'],
	MEDIUM: ['Sharp Sam', 'Calculated Cal', 'Steady Eddie', 'Ace', 'Maverick', 'Sage'],
	HARD: ['Iron Iris', 'Ruthless Rex', 'Viper', 'Titan', 'Nemesis', 'Overlord'],
	EXPERT: ['Oracle', 'Grandmaster', 'Apex', 'Zenith', 'Cipher', 'Paragon'],
};

// --- Confetti colors (drawn on a canvas, so they are needed in JS) ---

export const CONFETTI_COLORS = [
	'#F44336', '#2196F3', '#4CAF50', '#FFEB3B',
	'#9C27B0', '#FF9800', '#00BCD4', '#E91E63',
];
