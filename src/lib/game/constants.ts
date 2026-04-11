// Game constants — ported from GameModels.kt and Color.kt / PlayerColors.kt

import type { ScorecardRowConfig, PlayerColor } from './models';

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

// --- Theme colors ---

export const THEME = {
	cream: '#FAF6F0',
	warmTan: '#F0E8D8',
	deepBrown: '#1A0D04',
	brown: '#2B1A0E',
	goldAmber: '#C47A10',
	lightGold: '#F0D590',
	paleGold: '#F5E6C8',
	midBrown: '#4A2C10',
	darkBrown: '#3A1E08',
	purple: '#6B3FA0',
	lightPurple: '#D0BCFF',
	textDark: '#2B1A0E',
	textMedium: '#5A3D20',
	textLight: '#F0E8D8',
	textMuted: '#B8A888',
	scorePositive: '#2E7D32',
	scoreNegative: '#C62828',
	statusActive: '#4CAF50',
} as const;

// --- Player color schemes ---

export interface PlayerColorScheme {
	primary: string;
	light: string;
	onPrimary: string;
	dark: string;  // muted variant for scorecard rows
}

export const PLAYER_COLORS: Record<PlayerColor, PlayerColorScheme> = {
	BLUE: {
		primary: '#1565C0',
		light: '#BBDEFB',
		onPrimary: '#FFFFFF',
		dark: '#0D47A1',
	},
	RED: {
		primary: '#C62828',
		light: '#FFCDD2',
		onPrimary: '#FFFFFF',
		dark: '#B71C1C',
	},
	GREEN: {
		primary: '#2E7D32',
		light: '#C8E6C9',
		onPrimary: '#FFFFFF',
		dark: '#1B5E20',
	},
	PURPLE: {
		primary: '#6A1B9A',
		light: '#E1BEE7',
		onPrimary: '#FFFFFF',
		dark: '#4A148C',
	},
};

// --- AI bot names ---

export const AI_BOT_NAMES: Record<string, string[]> = {
	EASY: ['Lucky Lucy', 'Dizzy Dave', 'Bumble', 'Clover', 'Wobbles', 'Daydream'],
	MEDIUM: ['Sharp Sam', 'Calculated Cal', 'Steady Eddie', 'Ace', 'Maverick', 'Sage'],
	HARD: ['Iron Iris', 'Ruthless Rex', 'Viper', 'Titan', 'Nemesis', 'Overlord'],
	EXPERT: ['Oracle', 'Grandmaster', 'Apex', 'Zenith', 'Cipher', 'Paragon'],
};

// --- Scorecard rendering colors ---

export const SCORECARD_COLORS = {
	marked: '#1565C0',
	penalty: '#C62828',
	scoringZone: '#E3F2FD',
	filledRow: '#9E9E9E',
	nearScoring: '#FFA726',
	previewPair1: '#1565C0',
	previewPair2: '#2E7D32',
	previewFifth: '#E65100',
	previewOpacity: 0.15,
} as const;

// --- Confetti colors ---

export const CONFETTI_COLORS = [
	'#F44336', '#2196F3', '#4CAF50', '#FFEB3B',
	'#9C27B0', '#FF9800', '#00BCD4', '#E91E63',
];
