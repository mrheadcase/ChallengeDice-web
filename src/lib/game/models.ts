// Game data models — ported from GameModels.kt

export interface ScorecardRowConfig {
	rowNumber: number;
	penaltyBoxCount: number;
	baseValue: number;
	totalBoxes: number; // penaltyBoxCount + SCORING_MULTIPLIERS.length
}

export interface Scorecard {
	leftMarks: Record<number, number>;  // row (2-12) -> mark count
	rightMarks: Record<number, number>; // die (1-6) -> mark count
}

export interface DiceCombination {
	pair1Dice: [number, number];
	pair2Dice: [number, number];
	fifthDie: number;
	pair1Sum: number;
	pair2Sum: number;
}

export type PlayerColor = 'BLUE' | 'RED' | 'GREEN' | 'PURPLE';
export const PLAYER_COLOR_DEFAULTS: PlayerColor[] = ['BLUE', 'RED', 'GREEN', 'PURPLE'];

export type AiDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

export interface Player {
	id: number;
	name: string;
	scorecard: Scorecard;
	isActive: boolean;
	color: PlayerColor;
	isAI: boolean;
	aiDifficulty: AiDifficulty;
}

export type GamePhase = 'SETUP' | 'ROLLING' | 'SELECTING' | 'ROUND_END' | 'GAME_OVER';

export interface ScoreResult {
	rowScores: Record<number, number>;
	positiveTotal: number;
	negativeTotal: number;
	totalScore: number;
}

export interface GameState {
	players: Player[];
	currentRound: number;
	diceValues: number[];
	currentPlayerIndex: number;
	phase: GamePhase;
	combinations: DiceCombination[];
	validCombinations: DiceCombination[];
	playersFinishedThisRound: Set<number>;
	disconnectedPlayerNames: string[];
}

export interface PlayerSetup {
	name: string;
	color: PlayerColor;
	isAI: boolean;
	aiDifficulty: AiDifficulty;
}

export function createEmptyScorecard(): Scorecard {
	return { leftMarks: {}, rightMarks: {} };
}

export function createEmptyGameState(): GameState {
	return {
		players: [],
		currentRound: 1,
		diceValues: [],
		currentPlayerIndex: 0,
		phase: 'SETUP',
		combinations: [],
		validCombinations: [],
		playersFinishedThisRound: new Set(),
		disconnectedPlayerNames: []
	};
}

export function createPlayer(
	id: number,
	name: string,
	color: PlayerColor,
	isAI: boolean = false,
	aiDifficulty: AiDifficulty = 'MEDIUM'
): Player {
	return {
		id,
		name,
		scorecard: createEmptyScorecard(),
		isActive: true,
		color,
		isAI,
		aiDifficulty
	};
}

export function createDiceCombination(
	pair1Dice: [number, number],
	pair2Dice: [number, number],
	fifthDie: number
): DiceCombination {
	return {
		pair1Dice,
		pair2Dice,
		fifthDie,
		pair1Sum: pair1Dice[0] + pair1Dice[1],
		pair2Sum: pair2Dice[0] + pair2Dice[1]
	};
}
