// Online game state store — ported from OnlineGameViewModel.kt

import type { GameState, Player, DiceCombination, ScoreResult, GamePhase, PlayerColor } from '$lib/game/models';
import { createEmptyGameState, createEmptyScorecard, PLAYER_COLOR_DEFAULTS } from '$lib/game/models';
import * as GameLogic from '$lib/game/logic';
import * as FM from '$lib/firebase/gameManager';
import { getCurrentUid } from '$lib/firebase/auth';
import { auth } from '$lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { addHighScore, type HighScoreEntry } from '$lib/stores/highScores';
import { addGameHistory, type GameHistoryPlayer } from '$lib/stores/gameHistory';
import type { DataSnapshot } from 'firebase/database';

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';
export type RematchResponse = 'NONE' | 'ACCEPTED' | 'DECLINED' | 'REQUESTER';

export interface RematchState {
	isRequested: boolean;
	requestedByName: string;
	requestedByUid: string;
	newGameId: string;
	newGameCode: string;
	acceptedUids: Set<string>;
	declinedUids: Set<string>;
	eligibleUids: Set<string>;
	countdownStartedAt: number | null;
	started: boolean;
	cancelled: boolean;
	localResponse: RematchResponse;
}

function emptyRematchState(): RematchState {
	return {
		isRequested: false, requestedByName: '', requestedByUid: '',
		newGameId: '', newGameCode: '',
		acceptedUids: new Set(), declinedUids: new Set(), eligibleUids: new Set(),
		countdownStartedAt: null, started: false, cancelled: false,
		localResponse: 'NONE',
	};
}

class OnlineGameStore {
	gameState = $state<GameState>(createEmptyGameState());
	connectionStatus = $state<ConnectionStatus>('CONNECTING');
	rematchState = $state<RematchState>(emptyRematchState());

	gameId = $state('');
	localUid = $state('');

	turnOrder = $state<string[]>([]);
	hostUid = $state('');
	private finishedUids = new Set<string>();
	private playerConnected = new Map<string, boolean>();
	private eliminationRounds = new Map<string, number>();
	private hasLeftGame = false;
	private isAdvancingRound = false;
	private resultsRecorded = false;
	private unsubscribe: (() => void) | null = null;

	get isHost(): boolean { return this.localUid !== '' && this.localUid === this.hostUid; }
	get localPlayerIndex(): number { return this.turnOrder.indexOf(this.localUid); }

	isPlayerHost(playerIndex: number): boolean {
		return this.turnOrder[playerIndex] === this.hostUid && this.hostUid !== '';
	}

	get isLocalPlayerRoller(): boolean {
		return this.gameState.currentPlayerIndex === this.localPlayerIndex
			&& this.gameState.phase === 'ROLLING';
	}

	get localPlayerFinished(): boolean {
		return this.gameState.playersFinishedThisRound.has(this.localPlayerIndex);
	}

	get canLocalPlayerSelect(): boolean {
		const s = this.gameState;
		return s.phase === 'SELECTING'
			&& !this.localPlayerFinished
			&& this.localPlayerIndex >= 0
			&& (s.players[this.localPlayerIndex]?.isActive === true);
	}

	get hasOtherConnectedPlayers(): boolean {
		for (const [uid, connected] of this.playerConnected) {
			if (uid !== this.localUid && connected) return true;
		}
		return false;
	}

	get disconnectedPlayerNames(): string[] {
		const s = this.gameState;
		const names: string[] = [];
		for (const [uid, connected] of this.playerConnected) {
			if (connected) continue;
			const idx = this.turnOrder.indexOf(uid);
			const player = s.players[idx];
			if (player?.isActive) names.push(player.name);
		}
		return names;
	}

	startObserving(gameId: string) {
		this.stopObserving();
		this.gameId = gameId;
		const uid = getCurrentUid();
		if (uid) this.localUid = uid; // preserve previous UID if auth hasn't hydrated yet
		this.hasLeftGame = false;
		this.eliminationRounds.clear();
		this.resultsRecorded = false;
		this.rematchState = emptyRematchState();
		this.connectionStatus = 'CONNECTING';

		this.unsubscribe = FM.observeGame(gameId, (snapshot) => {
			this.processSnapshot(snapshot);
		});
	}

	stopObserving() {
		this.unsubscribe?.();
		this.unsubscribe = null;
	}

	private processSnapshot(snapshot: DataSnapshot) {
		if (!snapshot.exists()) {
			this.connectionStatus = 'DISCONNECTED';
			return;
		}

		const incomingHost = snapshot.child('host').val() as string | null;
		if (incomingHost) this.hostUid = incomingHost; // ignore transient null/empty snapshots
		const phase = snapshot.child('phase').val() as string ?? 'LOBBY';

		const newTurnOrder: string[] = [];
		snapshot.child('turnOrder').forEach(c => { newTurnOrder.push(c.val()); });
		this.turnOrder = newTurnOrder;

		const currentPlayerUid = snapshot.child('currentPlayerUid').val() as string ?? '';
		const currentPlayerIndex = Math.max(0, this.turnOrder.indexOf(currentPlayerUid));
		const currentRound = snapshot.child('currentRound').val() as number ?? 1;

		const diceValues: number[] = [];
		snapshot.child('diceValues').forEach(c => { diceValues.push(c.val() as number); });

		// Read finished UIDs
		this.finishedUids = new Set<string>();
		snapshot.child('playersFinishedThisRound').forEach(c => {
			if (c.key) this.finishedUids.add(c.key);
		});
		const playersFinished = new Set<number>();
		for (const uid of this.finishedUids) {
			const idx = this.turnOrder.indexOf(uid);
			if (idx >= 0) playersFinished.add(idx);
		}

		// Build player list
		const connectedMap = new Map<string, boolean>();
		const players: Player[] = this.turnOrder.map((uid, index) => {
			const pSnap = snapshot.child(`players/${uid}`);
			const name = pSnap.child('name').val() as string ?? `Player ${index + 1}`;
			const colorStr = pSnap.child('color').val() as string ?? 'BLUE';
			const color = PLAYER_COLOR_DEFAULTS.includes(colorStr as PlayerColor)
				? colorStr as PlayerColor
				: PLAYER_COLOR_DEFAULTS[index % 4];
			const isActive = pSnap.child('isActive').val() as boolean ?? true;
			const connected = pSnap.child('connected').val() as boolean ?? true;
			connectedMap.set(uid, connected);

			const leftMarks: Record<number, number> = {};
			pSnap.child('leftMarks').forEach(m => {
				const key = parseInt(m.key ?? '0');
				if (key >= 2 && key <= 12) leftMarks[key] = m.val() as number;
			});

			const rightMarks: Record<number, number> = {};
			pSnap.child('rightMarks').forEach(m => {
				const key = parseInt(m.key ?? '0');
				if (key >= 1 && key <= 6) rightMarks[key] = m.val() as number;
			});

			return {
				id: index,
				name,
				scorecard: { leftMarks, rightMarks },
				isActive,
				color,
				isAI: false,
				aiDifficulty: 'MEDIUM' as const,
			};
		});
		this.playerConnected = connectedMap;

		// Track eliminations
		const previousPlayers = this.gameState.players;
		for (let i = 0; i < this.turnOrder.length; i++) {
			const uid = this.turnOrder[i];
			const wasActive = previousPlayers[i]?.isActive ?? true;
			const nowActive = players[i]?.isActive ?? true;
			if (wasActive && !nowActive && !this.eliminationRounds.has(uid)) {
				this.eliminationRounds.set(uid, currentRound);
			}
		}

		// Self-heal reconnection
		if (connectedMap.get(this.localUid) === false && !this.hasLeftGame) {
			FM.reconnectToGame(this.gameId);
		}

		const combinations = diceValues.length === 5
			? GameLogic.generateCombinations(diceValues)
			: [];

		const localIdx = this.turnOrder.indexOf(this.localUid);
		const validCombinations = (localIdx >= 0 && combinations.length > 0 && localIdx < players.length)
			? GameLogic.getValidCombinations(combinations, players[localIdx].scorecard)
			: [];

		const gamePhase: GamePhase = phase === 'ROLLING' ? 'ROLLING'
			: phase === 'SELECTING' ? 'SELECTING'
			: phase === 'GAME_OVER' ? 'GAME_OVER'
			: 'SETUP';

		const disconnectedNames = (gamePhase !== 'GAME_OVER' && gamePhase !== 'SETUP')
			? Array.from(connectedMap.entries())
				.filter(([, c]) => !c)
				.map(([uid]) => {
					const idx = this.turnOrder.indexOf(uid);
					return players[idx]?.isActive ? players[idx].name : null;
				})
				.filter((n): n is string => n !== null)
			: [];

		this.gameState = {
			players,
			currentRound,
			diceValues,
			currentPlayerIndex,
			phase: gamePhase,
			combinations,
			validCombinations,
			playersFinishedThisRound: playersFinished,
			disconnectedPlayerNames: disconnectedNames,
		};

		this.connectionStatus = 'CONNECTED';

		// Record results on game over (once)
		if (gamePhase === 'GAME_OVER' && !this.resultsRecorded) {
			this.resultsRecorded = true;
			this.recordOnlineResults(players);
		}

		// Host: check if round should advance
		if (this.isHost && gamePhase === 'SELECTING') {
			this.checkAndAdvanceRound(players, combinations);
		}

		// Parse rematch state
		const rematchSnap = snapshot.child('rematch');
		if (rematchSnap.exists()) {
			const requestedBy = rematchSnap.child('requestedBy').val() as string ?? '';
			const acceptedUids = new Set<string>();
			rematchSnap.child('acceptedUids').forEach(c => { if (c.key) acceptedUids.add(c.key); });
			const declinedUids = new Set<string>();
			rematchSnap.child('declinedUids').forEach(c => { if (c.key) declinedUids.add(c.key); });
			const eligibleUids = new Set<string>();
			rematchSnap.child('eligibleUids').forEach(c => { if (c.key) eligibleUids.add(c.key); });

			const cancelled = rematchSnap.child('cancelled').val() === true;
			const started = rematchSnap.child('started').val() === true;

			const localResponse: RematchResponse = cancelled ? 'NONE'
				: this.localUid === requestedBy ? 'REQUESTER'
				: acceptedUids.has(this.localUid) ? 'ACCEPTED'
				: declinedUids.has(this.localUid) ? 'DECLINED'
				: 'NONE';

			this.rematchState = {
				isRequested: true,
				requestedByName: rematchSnap.child('requestedByName').val() as string ?? '',
				requestedByUid: requestedBy,
				newGameId: rematchSnap.child('newGameId').val() as string ?? '',
				newGameCode: rematchSnap.child('newGameCode').val() as string ?? '',
				acceptedUids,
				declinedUids,
				eligibleUids,
				countdownStartedAt: rematchSnap.child('countdownStartedAt').val() as number | null,
				started,
				cancelled,
				localResponse,
			};
		}
	}

	private async checkAndAdvanceRound(players: Player[], combinations: DiceCombination[]) {
		const activeUids = this.turnOrder.filter((_, i) => players[i]?.isActive === true);
		const allDone = activeUids.every(uid => this.finishedUids.has(uid));
		if (!allDone) return;
		if (this.isAdvancingRound) return;
		this.isAdvancingRound = true;

		try {
			const allActiveFull = players.filter(p => p.isActive).every(p =>
				GameLogic.isRightSideFull(p.scorecard)
			);
			if (allActiveFull) {
				await FM.setGameOver(this.gameId);
				return;
			}

			const currentRollerIndex = this.gameState.currentPlayerIndex;
			const nextRollerUid = this.findNextActiveUid(currentRollerIndex, players);

			if (!nextRollerUid) {
				await FM.setGameOver(this.gameId);
				return;
			}

			await FM.advanceRound(this.gameId, nextRollerUid, this.gameState.currentRound + 1);
		} finally {
			this.isAdvancingRound = false;
		}
	}

	private findNextActiveUid(fromIndex: number, players: Player[]): string | null {
		for (let i = 1; i <= this.turnOrder.length; i++) {
			const checkIndex = (fromIndex + i) % this.turnOrder.length;
			const player = players[checkIndex];
			if (player?.isActive) return this.turnOrder[checkIndex];
		}
		return null;
	}

	async rollDice() {
		const state = this.gameState;
		if (state.phase !== 'ROLLING') return;
		if (state.currentPlayerIndex !== this.localPlayerIndex) return;

		const diceValues = GameLogic.rollDice();
		const combinations = GameLogic.generateCombinations(diceValues);

		const deactivated: string[] = [];
		const autoFinished: string[] = [];

		for (let i = 0; i < this.turnOrder.length; i++) {
			const uid = this.turnOrder[i];
			const player = state.players[i];
			if (!player) continue;
			if (!player.isActive) {
				autoFinished.push(uid);
				continue;
			}
			const valid = GameLogic.getValidCombinations(combinations, player.scorecard);
			if (valid.length === 0) {
				deactivated.push(uid);
				autoFinished.push(uid);
			}
		}

		const activePlayers = this.turnOrder.filter((uid, i) => {
			const player = state.players[i];
			return player?.isActive && !deactivated.includes(uid);
		});

		const gameOver = activePlayers.length === 0;
		await FM.writeDiceRollWithDeactivations(
			this.gameId, diceValues, deactivated, autoFinished, gameOver
		);
	}

	async selectCombination(combination: DiceCombination) {
		const state = this.gameState;
		if (state.phase !== 'SELECTING' || !this.canLocalPlayerSelect) return;

		const localPlayer = state.players[this.localPlayerIndex];
		if (!localPlayer || !GameLogic.isCombinationValid(combination, localPlayer.scorecard)) return;

		const newScorecard = GameLogic.applySelection(localPlayer.scorecard, combination);
		await FM.writePlayerSelection(this.gameId, newScorecard);
	}

	async requestRematch(): Promise<string | null> {
		const localIdx = this.localPlayerIndex;
		if (localIdx < 0) return null;
		const localPlayer = this.gameState.players[localIdx];
		if (!localPlayer) return null;

		const eligibleUids = new Set(
			Array.from(this.playerConnected.entries())
				.filter(([uid, connected]) => connected
					&& !(this.rematchState.cancelled && uid === this.rematchState.requestedByUid))
				.map(([uid]) => uid)
		);

		return FM.requestRematch(this.gameId, localPlayer.name, localPlayer.color, eligibleUids);
	}

	async acceptRematch(): Promise<string | null> {
		const localIdx = this.localPlayerIndex;
		if (localIdx < 0) return null;
		const localPlayer = this.gameState.players[localIdx];
		if (!localPlayer) return null;

		return FM.acceptRematch(this.gameId, localPlayer.name, localPlayer.color);
	}

	async declineRematch() {
		await FM.declineRematch(this.gameId);
	}

	markLeft() {
		this.hasLeftGame = true;
	}

	private recordOnlineResults(players: Player[]) {
		const localIdx = this.turnOrder.indexOf(this.localUid);
		if (localIdx < 0) return;
		const localPlayer = players[localIdx];
		if (!localPlayer) return;

		const scoreResult = GameLogic.calculateScore(localPlayer.scorecard);
		const allScores = players.map(p => GameLogic.calculateScore(p.scorecard));
		const highestScore = Math.max(...allScores.map(s => s.totalScore));
		const won = scoreResult.totalScore >= highestScore;

		const naturalCompletion = players.some(p => GameLogic.isRightSideFull(p.scorecard));
		const roundsPlayed = naturalCompletion ? this.gameState.currentRound : Math.max(1, this.gameState.currentRound - 1);

		const entry: HighScoreEntry = {
			totalScore: scoreResult.totalScore,
			positiveTotal: scoreResult.positiveTotal,
			negativeTotal: scoreResult.negativeTotal,
			rounds: roundsPlayed,
			date: Date.now(),
			playerName: localPlayer.name,
			botCount: 0,
			botDifficulties: [],
			won,
			eliminatedRound: this.eliminationRounds.get(this.localUid) ?? null,
			opponents: players
				.map((opp, i) => ({ opp, i }))
				.filter(({ i }) => i !== localIdx)
				.map(({ opp, i }) => ({
					name: opp.name,
					score: allScores[i].totalScore,
					isAI: false,
					eliminated: this.eliminationRounds.has(this.turnOrder[i]),
				})),
		};
		addHighScore('online', entry);

		// Game history
		const historyPlayers: GameHistoryPlayer[] = players.map((p, i) => ({
			name: p.name,
			score: allScores[i].totalScore,
			positiveTotal: allScores[i].positiveTotal,
			negativeTotal: allScores[i].negativeTotal,
			isAI: false,
			color: p.color,
			isActive: p.isActive,
		}));
		addGameHistory({ gameType: 'online', roundsPlayed, naturalCompletion, players: historyPlayers });
	}
}

export const onlineGame = new OnlineGameStore();

// Keep localUid in sync with Firebase auth; covers the case where the lobby mounts
// before anonymous auth has hydrated from IndexedDB.
onAuthStateChanged(auth, (user) => {
	if (user) onlineGame.localUid = user.uid;
});
