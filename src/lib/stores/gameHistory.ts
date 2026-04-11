// Game history — localStorage-based

export interface GameHistoryEntry {
	id: string;
	date: number;
	gameType: string; // 'solo', 'vs_bots', 'local_multiplayer', 'online'
	roundsPlayed: number;
	naturalCompletion: boolean;
	players: GameHistoryPlayer[];
}

export interface GameHistoryPlayer {
	name: string;
	score: number;
	positiveTotal: number;
	negativeTotal: number;
	isAI: boolean;
	aiDifficulty?: string;
	color: string;
	isActive: boolean; // was still active at game end
}

const STORAGE_KEY = 'challengedice_history';
const MAX_ENTRIES = 50;

function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function getGameHistory(): GameHistoryEntry[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		return JSON.parse(raw);
	} catch {
		return [];
	}
}

export function addGameHistory(entry: Omit<GameHistoryEntry, 'id' | 'date'>): void {
	try {
		const history = getGameHistory();
		history.unshift({
			...entry,
			id: generateId(),
			date: Date.now(),
		});
		const trimmed = history.slice(0, MAX_ENTRIES);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
	} catch {
		// localStorage full or unavailable
	}
}

export function clearGameHistory(): void {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// ignore
	}
}
