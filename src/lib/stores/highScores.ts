// High scores — localStorage-based, ported from HighScoreManager.kt

export interface HighScoreEntry {
	totalScore: number;
	positiveTotal: number;
	negativeTotal: number;
	rounds: number;
	date: number; // timestamp ms
	playerName: string;
	botCount: number;
	botDifficulties: string[];
	won: boolean;
	eliminatedRound: number | null;
	opponents: OpponentInfo[];
}

export interface OpponentInfo {
	name: string;
	score: number;
	isAI: boolean;
	eliminated: boolean;
}

export type ScoreCategory = 'solo' | 'vs_easy' | 'vs_medium' | 'vs_hard' | 'vs_expert' | 'local_multi' | 'online';

const STORAGE_PREFIX = 'challengedice_highscores_';
const MAX_ENTRIES_PER_CATEGORY = 20;

function getKey(category: ScoreCategory): string {
	return STORAGE_PREFIX + category;
}

export function getHighScores(category: ScoreCategory): HighScoreEntry[] {
	try {
		const raw = localStorage.getItem(getKey(category));
		if (!raw) return [];
		return JSON.parse(raw);
	} catch {
		return [];
	}
}

export function addHighScore(category: ScoreCategory, entry: HighScoreEntry): void {
	try {
		const scores = getHighScores(category);
		scores.push(entry);
		scores.sort((a, b) => b.totalScore - a.totalScore);
		const trimmed = scores.slice(0, MAX_ENTRIES_PER_CATEGORY);
		localStorage.setItem(getKey(category), JSON.stringify(trimmed));
	} catch {
		// localStorage full or unavailable
	}
}

export function getAllCategories(): ScoreCategory[] {
	return ['solo', 'vs_easy', 'vs_medium', 'vs_hard', 'vs_expert', 'local_multi', 'online'];
}

export function getCategoryLabel(category: ScoreCategory): string {
	switch (category) {
		case 'solo': return 'Solo';
		case 'vs_easy': return 'vs Easy AI';
		case 'vs_medium': return 'vs Medium AI';
		case 'vs_hard': return 'vs Hard AI';
		case 'vs_expert': return 'vs Expert AI';
		case 'local_multi': return 'Local Multiplayer';
		case 'online': return 'Online';
	}
}

export function determineCategory(
	playerCount: number,
	hasAI: boolean,
	botDifficulties: string[],
	isOnline: boolean
): ScoreCategory {
	if (isOnline) return 'online';
	if (playerCount === 1) return 'solo';
	if (!hasAI) return 'local_multi';
	// Pick the highest AI difficulty
	const diffOrder = ['EXPERT', 'HARD', 'MEDIUM', 'EASY'];
	for (const d of diffOrder) {
		if (botDifficulties.includes(d)) {
			return `vs_${d.toLowerCase()}` as ScoreCategory;
		}
	}
	return 'vs_medium';
}
