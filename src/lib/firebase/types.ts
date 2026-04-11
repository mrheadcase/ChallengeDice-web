// Firebase data types — matches the Android OnlinePlayer/OnlineGameData/etc.

export interface OnlinePlayer {
	uid: string;
	name: string;
	color: string;
	isActive: boolean;
	ready: boolean;
	connected: boolean;
	leftMarks: Record<string, number>;
	rightMarks: Record<string, number>;
}

export interface OnlineGameData {
	host: string;
	code: string;
	phase: string; // LOBBY | ROLLING | SELECTING | GAME_OVER
	isOpen: boolean;
	currentRound: number;
	diceValues: number[];
	currentPlayerUid: string;
	turnOrder: string[];
	players: Record<string, OnlinePlayer>;
	playersFinishedThisRound: Record<string, boolean>;
	createdAt: any;
	lastActivity: any;
	rematchFromGameId?: string;
	rematch?: RematchData;
}

export interface RematchData {
	requestedBy: string;
	requestedByName: string;
	newGameId: string;
	newGameCode: string;
	eligibleUids: Record<string, boolean>;
	acceptedUids: Record<string, boolean>;
	declinedUids: Record<string, boolean>;
	requestedAt: any;
	countdownStartedAt: number | null;
	started: boolean;
	cancelled: boolean;
}

export interface LobbyInfo {
	code: string;
	gameId: string;
	hostName: string;
	playerCount: number;
	maxPlayers: number;
}

export interface ActiveGameInfo {
	gameId: string;
	code: string;
	phase: string;
	playerCount: number;
	currentRound: number;
}
