// Local game state store — ported from GameViewModel.kt

import type {
	GameState, Player, DiceCombination, ScoreResult, PlayerSetup
} from '$lib/game/models';
import { createEmptyGameState, createPlayer } from '$lib/game/models';
import * as GameLogic from '$lib/game/logic';
import { selectCombination as aiSelectCombination } from '$lib/game/ai';
import { addHighScore, determineCategory, type HighScoreEntry } from '$lib/stores/highScores';
import { addGameHistory, type GameHistoryPlayer } from '$lib/stores/gameHistory';

const SAVE_KEY = 'challengedice_local_game';

class LocalGameStore {
	gameState = $state<GameState>(createEmptyGameState());
	lastSetups = $state<PlayerSetup[] | null>(null);
	private eliminationRounds = new Map<number, number>();

	get currentPlayer(): Player | undefined {
		return this.gameState.players[this.gameState.currentPlayerIndex];
	}

	get allScores(): Array<{ player: Player; score: ScoreResult }> {
		return this.gameState.players.map(p => ({
			player: p,
			score: GameLogic.calculateScore(p.scorecard)
		}));
	}

	setupGame(setups: PlayerSetup[]) {
		this.lastSetups = setups;
		this.eliminationRounds.clear();
		const players = setups.map((setup, index) =>
			createPlayer(index, setup.name, setup.color, setup.isAI, setup.aiDifficulty)
		);
		this.gameState = {
			...createEmptyGameState(),
			players,
			phase: 'ROLLING',
			currentRound: 1,
			currentPlayerIndex: 0,
		};
		this.save();
	}

	rematch() {
		if (this.lastSetups) this.setupGame(this.lastSetups);
	}

	resumeGame(): boolean {
		const saved = this.loadSave();
		if (!saved) return false;
		this.gameState = saved;
		return true;
	}

	hasSavedGame(): boolean {
		try {
			return localStorage.getItem(SAVE_KEY) !== null;
		} catch {
			return false;
		}
	}

	rollDice() {
		const state = this.gameState;
		if (state.phase !== 'ROLLING') return;

		const diceValues = GameLogic.rollDice();
		const combinations = GameLogic.generateCombinations(diceValues);

		const firstActiveIndex = this.findFirstActivePlayer(state.players, 0);
		if (firstActiveIndex === -1) {
			this.transitionToGameOver(state);
			return;
		}

		// Determine which players can play this round
		const playersWithNoCombos = new Set<number>();
		for (const player of state.players) {
			if (player.isActive) {
				const playerValid = GameLogic.getValidCombinations(combinations, player.scorecard);
				if (playerValid.length === 0) {
					playersWithNoCombos.add(player.id);
				}
			}
		}

		// Record elimination rounds
		for (const id of playersWithNoCombos) {
			if (!this.eliminationRounds.has(id)) {
				this.eliminationRounds.set(id, state.currentRound);
			}
		}

		const updatedPlayers = state.players.map(player =>
			playersWithNoCombos.has(player.id) ? { ...player, isActive: false } : player
		);

		const anyActive = updatedPlayers.some(p => p.isActive);
		if (!anyActive) {
			this.transitionToGameOver({
				...state,
				players: updatedPlayers,
				diceValues
			});
			return;
		}

		const newFirstActive = this.findFirstActivePlayer(updatedPlayers, 0);
		const validCombinations = GameLogic.getValidCombinations(
			combinations,
			updatedPlayers[newFirstActive].scorecard
		);

		this.gameState = {
			...state,
			players: updatedPlayers,
			diceValues,
			combinations,
			validCombinations,
			currentPlayerIndex: newFirstActive,
			phase: 'SELECTING',
			playersFinishedThisRound: playersWithNoCombos,
		};
		this.save();
	}

	selectCombination(combination: DiceCombination) {
		const state = this.gameState;
		if (state.phase !== 'SELECTING') return;

		const currentPlayer = state.players[state.currentPlayerIndex];
		if (!currentPlayer) return;

		const newScorecard = GameLogic.applySelection(currentPlayer.scorecard, combination);
		const updatedPlayer = { ...currentPlayer, scorecard: newScorecard };

		const updatedPlayers = [...state.players];
		updatedPlayers[state.currentPlayerIndex] = updatedPlayer;

		const finished = new Set(state.playersFinishedThisRound);
		finished.add(currentPlayer.id);

		const nextPlayerIndex = this.findNextActivePlayer(updatedPlayers, state.currentPlayerIndex, finished);

		if (nextPlayerIndex === -1) {
			// All players done this round
			const activePlayers = updatedPlayers.filter(p => p.isActive);
			const allActiveFull = activePlayers.every(p => GameLogic.isRightSideFull(p.scorecard));

			if (allActiveFull) {
				this.transitionToGameOver({ ...state, players: updatedPlayers });
			} else {
				this.gameState = {
					...state,
					players: updatedPlayers,
					currentRound: state.currentRound + 1,
					phase: 'ROLLING',
					currentPlayerIndex: 0,
					playersFinishedThisRound: new Set(),
					diceValues: [],
					combinations: [],
					validCombinations: [],
				};
			}
		} else {
			const nextPlayer = updatedPlayers[nextPlayerIndex];
			const nextValidCombos = GameLogic.getValidCombinations(state.combinations, nextPlayer.scorecard);

			if (nextValidCombos.length === 0) {
				if (!this.eliminationRounds.has(nextPlayer.id)) {
					this.eliminationRounds.set(nextPlayer.id, state.currentRound);
				}
				updatedPlayers[nextPlayerIndex] = { ...nextPlayer, isActive: false };
				finished.add(nextPlayer.id);
				this.gameState = {
					...state,
					players: updatedPlayers,
					playersFinishedThisRound: finished,
				};
				this.advanceToNextPlayerOrRound();
				return;
			} else {
				this.gameState = {
					...state,
					players: updatedPlayers,
					currentPlayerIndex: nextPlayerIndex,
					validCombinations: nextValidCombos,
					playersFinishedThisRound: finished,
				};
			}
		}
		this.save();
	}

	private advanceToNextPlayerOrRound() {
		while (true) {
			const state = this.gameState;
			const nextPlayerIndex = this.findNextActivePlayer(
				state.players, state.currentPlayerIndex, state.playersFinishedThisRound
			);

			if (nextPlayerIndex === -1) {
				const anyActive = state.players.some(p => p.isActive);
				const activeForFullCheck = state.players.filter(p => p.isActive);
				const allFull = activeForFullCheck.every(p => GameLogic.isRightSideFull(p.scorecard));

				if (!anyActive || allFull) {
					this.transitionToGameOver(state);
				} else {
					this.gameState = {
						...state,
						currentRound: state.currentRound + 1,
						phase: 'ROLLING',
						currentPlayerIndex: 0,
						playersFinishedThisRound: new Set(),
						diceValues: [],
						combinations: [],
						validCombinations: [],
					};
					this.save();
				}
				return;
			}

			const nextPlayer = state.players[nextPlayerIndex];
			const nextValidCombos = GameLogic.getValidCombinations(state.combinations, nextPlayer.scorecard);

			if (nextValidCombos.length === 0) {
				if (!this.eliminationRounds.has(nextPlayer.id)) {
					this.eliminationRounds.set(nextPlayer.id, state.currentRound);
				}
				const updatedPlayers = [...state.players];
				updatedPlayers[nextPlayerIndex] = { ...nextPlayer, isActive: false };
				const finished = new Set(state.playersFinishedThisRound);
				finished.add(nextPlayer.id);
				this.gameState = {
					...state,
					players: updatedPlayers,
					currentPlayerIndex: nextPlayerIndex,
					playersFinishedThisRound: finished,
				};
				// Continue loop
			} else {
				this.gameState = {
					...state,
					currentPlayerIndex: nextPlayerIndex,
					validCombinations: nextValidCombos,
				};
				this.save();
				return;
			}
		}
	}

	isCurrentPlayerAI(): boolean {
		const state = this.gameState;
		if (state.phase !== 'SELECTING') return false;
		return state.players[state.currentPlayerIndex]?.isAI === true;
	}

	getAiSelection(): DiceCombination | null {
		const state = this.gameState;
		const player = state.players[state.currentPlayerIndex];
		if (!player?.isAI || state.validCombinations.length === 0) return null;
		return aiSelectCombination(player.aiDifficulty, state.validCombinations, player.scorecard);
	}

	getScoreForPlayer(playerIndex: number): ScoreResult {
		const player = this.gameState.players[playerIndex];
		if (!player) return { rowScores: {}, positiveTotal: 0, negativeTotal: 0, totalScore: 0 };
		return GameLogic.calculateScore(player.scorecard);
	}

	updatePlayerName(playerIndex: number, newName: string) {
		const trimmed = newName.trim();
		if (!trimmed) return;
		const state = this.gameState;
		if (playerIndex < 0 || playerIndex >= state.players.length) return;
		const updatedPlayers = [...state.players];
		updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], name: trimmed };
		this.gameState = { ...state, players: updatedPlayers };
		this.save();
	}

	resetGame() {
		this.gameState = createEmptyGameState();
		this.clearSave();
	}

	private transitionToGameOver(state: GameState) {
		this.gameState = { ...state, phase: 'GAME_OVER' };
		this.clearSave();
		this.recordResults(state);
	}

	private recordResults(state: GameState) {
		const naturalCompletion = state.players.some(p => GameLogic.isRightSideFull(p.scorecard));
		const roundsPlayed = naturalCompletion ? state.currentRound : state.currentRound - 1;

		const allScores = state.players.map(p => ({
			player: p,
			score: GameLogic.calculateScore(p.scorecard),
		}));

		// Record high score for the first human player
		const humanPlayers = state.players.filter(p => !p.isAI);
		const trophyPlayer = humanPlayers[0];
		if (humanPlayers.length === 1 && trophyPlayer) {
			const trophyScore = allScores.find(s => s.player.id === trophyPlayer.id)!.score;
			const highestScore = Math.max(...allScores.map(s => s.score.totalScore));
			const bots = state.players.filter(p => p.isAI);

			const entry: HighScoreEntry = {
				totalScore: trophyScore.totalScore,
				positiveTotal: trophyScore.positiveTotal,
				negativeTotal: trophyScore.negativeTotal,
				rounds: roundsPlayed,
				date: Date.now(),
				playerName: trophyPlayer.name,
				botCount: bots.length,
				botDifficulties: bots.map(b => b.aiDifficulty),
				won: trophyScore.totalScore >= highestScore,
				eliminatedRound: this.eliminationRounds.get(trophyPlayer.id) ?? null,
				opponents: state.players.filter(p => p.id !== trophyPlayer.id).map(opp => {
					const oppScore = allScores.find(s => s.player.id === opp.id)!.score;
					return {
						name: opp.name,
						score: oppScore.totalScore,
						isAI: opp.isAI,
						eliminated: this.eliminationRounds.has(opp.id),
					};
				}),
			};

			const category = determineCategory(
				state.players.length,
				bots.length > 0,
				bots.map(b => b.aiDifficulty),
				false
			);
			addHighScore(category, entry);
		}

		// Record game history
		const gameType = state.players.length === 1 ? 'solo'
			: state.players.some(p => p.isAI) ? 'vs_bots'
			: 'local_multiplayer';

		const historyPlayers: GameHistoryPlayer[] = allScores.map(({ player, score }) => ({
			name: player.name,
			score: score.totalScore,
			positiveTotal: score.positiveTotal,
			negativeTotal: score.negativeTotal,
			isAI: player.isAI,
			aiDifficulty: player.isAI ? player.aiDifficulty : undefined,
			color: player.color,
			isActive: player.isActive,
		}));

		addGameHistory({ gameType, roundsPlayed, naturalCompletion, players: historyPlayers });
	}

	private save() {
		try {
			const state = this.gameState;
			// Convert Set/Map to serializable forms
			const serializable = {
				...state,
				playersFinishedThisRound: [...state.playersFinishedThisRound],
				_eliminationRounds: Object.fromEntries(this.eliminationRounds),
			};
			localStorage.setItem(SAVE_KEY, JSON.stringify(serializable));
		} catch {
			// localStorage may be full or unavailable
		}
	}

	private loadSave(): GameState | null {
		try {
			const raw = localStorage.getItem(SAVE_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			// Restore elimination rounds
			if (parsed._eliminationRounds) {
				this.eliminationRounds.clear();
				for (const [k, v] of Object.entries(parsed._eliminationRounds)) {
					this.eliminationRounds.set(Number(k), v as number);
				}
			}
			// Restore Set from array
			return {
				...parsed,
				playersFinishedThisRound: new Set(parsed.playersFinishedThisRound ?? []),
			};
		} catch {
			return null;
		}
	}

	private clearSave() {
		try {
			localStorage.removeItem(SAVE_KEY);
		} catch {
			// ignore
		}
	}

	private findFirstActivePlayer(players: Player[], startFrom: number): number {
		for (let i = startFrom; i < players.length; i++) {
			if (players[i].isActive) return i;
		}
		return -1;
	}

	private findNextActivePlayer(players: Player[], currentIndex: number, finishedIds: Set<number>): number {
		for (let i = currentIndex + 1; i < players.length; i++) {
			if (players[i].isActive && !finishedIds.has(players[i].id)) return i;
		}
		return -1;
	}
}

export const localGame = new LocalGameStore();
