// Firebase game manager — ported from FirebaseGameManager.kt
// All methods match the Android implementation's database operations

import { db } from './config';
import { ensureAuthenticated, getCurrentUid } from './auth';
import type { LobbyInfo, ActiveGameInfo } from './types';
import type { Scorecard, PlayerColor } from '$lib/game/models';
import {
	ref, set, get, update, remove, push, child,
	onValue, onDisconnect, runTransaction,
	serverTimestamp, type Unsubscribe, type DataSnapshot
} from 'firebase/database';

const gamesRef = ref(db, 'games');
const lobbiesRef = ref(db, 'lobbies');
const usersRef = ref(db, 'users');

function generateGameCode(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	const array = new Uint32Array(6);
	crypto.getRandomValues(array);
	return Array.from(array, v => chars[v % chars.length]).join('');
}

export async function createGame(
	playerName: string,
	playerColor: PlayerColor,
	isOpen: boolean = false
): Promise<string> {
	const uid = await ensureAuthenticated();
	const newGameRef = push(ref(db, 'games'));
	const gameId = newGameRef.key!;
	const code = generateGameCode();

	const playerData = {
		uid,
		name: playerName,
		color: playerColor,
		isActive: true,
		ready: true,
		connected: true,
	};

	const gameData = {
		host: uid,
		code,
		phase: 'LOBBY',
		isOpen,
		currentRound: 1,
		currentPlayerUid: '',
		turnOrder: [uid],
		players: { [uid]: playerData },
		createdAt: serverTimestamp(),
		lastActivity: serverTimestamp(),
	};

	const lobbyData = {
		gameId,
		hostName: playerName,
		playerCount: 1,
		maxPlayers: 4,
		isOpen,
		createdAt: serverTimestamp(),
	};

	await set(newGameRef, gameData);
	await set(ref(db, `lobbies/${code}`), lobbyData);
	await set(ref(db, `users/${uid}/activeGames/${gameId}`), true);

	setupDisconnectHandler(gameId, uid);

	return gameId;
}

export async function joinGame(
	code: string,
	playerName: string,
	playerColor: PlayerColor
): Promise<string | null> {
	const uid = await ensureAuthenticated();
	const upperCode = code.toUpperCase();

	const lobbySnap = await get(ref(db, `lobbies/${upperCode}`));
	if (!lobbySnap.exists()) return null;
	const gameId = lobbySnap.child('gameId').val() as string;
	if (!gameId) return null;

	const gameRef = ref(db, `games/${gameId}`);

	let abortReason: string | null = null;

	const result = await runTransaction(gameRef, (currentData) => {
		if (!currentData) return; // abort — will retry with server data

		const phase = currentData.phase;
		if (phase !== 'LOBBY') { abortReason = null; return undefined; }

		const players = currentData.players || {};
		if (Object.keys(players).length >= 4) { abortReason = null; return undefined; }

		const takenColors = Object.values(players).map((p: any) => p.color);
		if (takenColors.includes(playerColor)) { abortReason = 'COLOR_TAKEN'; return undefined; }

		currentData.players = currentData.players || {};
		currentData.players[uid] = {
			uid,
			name: playerName,
			color: playerColor,
			isActive: true,
			ready: false,
			connected: true,
		};

		const turnOrder = currentData.turnOrder || [];
		turnOrder.push(uid);
		currentData.turnOrder = turnOrder;

		return currentData;
	});

	if (!result.committed) return abortReason;

	// Post-transaction updates
	const currentSnap = await get(gameRef);
	const newPlayerCount = currentSnap.child('players').size;
	await set(ref(db, `lobbies/${upperCode}/playerCount`), newPlayerCount);
	await update(gameRef, { lastActivity: serverTimestamp() });
	await set(ref(db, `users/${uid}/activeGames/${gameId}`), true);

	setupDisconnectHandler(gameId, uid);
	return gameId;
}

export function observeGame(gameId: string, callback: (snapshot: DataSnapshot) => void): Unsubscribe {
	return onValue(ref(db, `games/${gameId}`), callback);
}

export async function setPlayerReady(gameId: string, ready: boolean): Promise<void> {
	const uid = getCurrentUid();
	if (!uid) return;
	await update(ref(db, `games/${gameId}`), {
		[`players/${uid}/ready`]: ready,
		lastActivity: serverTimestamp(),
	});
}

export async function startGame(gameId: string, turnOrder: string[]): Promise<void> {
	const codeSnap = await get(ref(db, `games/${gameId}/code`));
	const code = codeSnap.val() as string;

	await update(ref(db, `games/${gameId}`), {
		phase: 'ROLLING',
		turnOrder,
		currentPlayerUid: turnOrder[0],
		lastActivity: serverTimestamp(),
	});

	if (code) await remove(ref(db, `lobbies/${code}`));
}

export async function writeDiceRoll(gameId: string, diceValues: number[]): Promise<void> {
	await update(ref(db, `games/${gameId}`), {
		diceValues,
		phase: 'SELECTING',
		lastActivity: serverTimestamp(),
	});
}

export async function writeDiceRollWithDeactivations(
	gameId: string,
	diceValues: number[],
	deactivatedUids: string[],
	autoFinishedUids: string[],
	gameOver: boolean = false
): Promise<void> {
	const updates: Record<string, any> = {
		diceValues,
		phase: gameOver ? 'GAME_OVER' : 'SELECTING',
		lastActivity: serverTimestamp(),
	};

	for (const uid of deactivatedUids) {
		updates[`players/${uid}/isActive`] = false;
	}
	for (const uid of autoFinishedUids) {
		updates[`playersFinishedThisRound/${uid}`] = true;
	}

	await update(ref(db, `games/${gameId}`), updates);

	if (gameOver) {
		// Clean up active games for all players
		const snap = await get(ref(db, `games/${gameId}/turnOrder`));
		const uids: string[] = [];
		snap.forEach(c => { uids.push(c.val()); });
		for (const uid of uids) {
			await remove(ref(db, `users/${uid}/activeGames/${gameId}`));
		}
	}
}

export async function writePlayerSelection(
	gameId: string,
	scorecard: Scorecard,
	deactivatedUids: string[] = []
): Promise<void> {
	const uid = getCurrentUid();
	if (!uid) return;

	const updates: Record<string, any> = {
		[`players/${uid}/leftMarks`]: Object.fromEntries(
			Object.entries(scorecard.leftMarks).map(([k, v]) => [String(k), v])
		),
		[`players/${uid}/rightMarks`]: Object.fromEntries(
			Object.entries(scorecard.rightMarks).map(([k, v]) => [String(k), v])
		),
		[`playersFinishedThisRound/${uid}`]: true,
		lastActivity: serverTimestamp(),
	};

	for (const deactivatedUid of deactivatedUids) {
		updates[`players/${deactivatedUid}/isActive`] = false;
	}

	await update(ref(db, `games/${gameId}`), updates);
}

export async function advanceRound(
	gameId: string,
	nextRollerUid: string,
	nextRound: number,
	deactivatedUids: string[] = []
): Promise<void> {
	const updates: Record<string, any> = {
		phase: 'ROLLING',
		currentRound: nextRound,
		currentPlayerUid: nextRollerUid,
		diceValues: null,
		playersFinishedThisRound: null,
		lastActivity: serverTimestamp(),
	};

	for (const uid of deactivatedUids) {
		updates[`players/${uid}/isActive`] = false;
	}

	await update(ref(db, `games/${gameId}`), updates);
}

export async function setGameOver(gameId: string): Promise<void> {
	const uid = getCurrentUid();
	if (!uid) return;

	await update(ref(db, `games/${gameId}`), {
		phase: 'GAME_OVER',
		lastActivity: serverTimestamp(),
	});

	// Remove active game references for connected players
	const snap = await get(ref(db, `games/${gameId}`));
	const turnOrder: string[] = [];
	snap.child('turnOrder').forEach(c => { turnOrder.push(c.val()); });

	for (const playerUid of turnOrder) {
		const connected = snap.child(`players/${playerUid}/connected`).val() ?? true;
		if (connected) {
			await remove(ref(db, `users/${playerUid}/activeGames/${gameId}`));
		}
	}
}

export async function reconnectToGame(gameId: string): Promise<void> {
	const uid = await ensureAuthenticated();

	const playerSnap = await get(ref(db, `games/${gameId}/players/${uid}`));
	if (!playerSnap.exists()) return;

	const wasActive = playerSnap.child('isActive').val() ?? true;
	const updates: Record<string, any> = {
		[`players/${uid}/connected`]: true,
		lastActivity: serverTimestamp(),
	};
	if (wasActive) {
		updates[`players/${uid}/isActive`] = true;
	}

	await update(ref(db, `games/${gameId}`), updates);
	await set(ref(db, `users/${uid}/activeGames/${gameId}`), true);
	setupDisconnectHandler(gameId, uid);
}

export async function leaveGame(gameId: string): Promise<void> {
	const uid = getCurrentUid();
	if (!uid) return;

	const snap = await get(ref(db, `games/${gameId}`));
	const code = snap.child('code').val() as string;
	const phase = snap.child('phase').val() as string;
	const hostUid = snap.child('host').val() as string;

	if (phase === 'LOBBY') {
		await remove(ref(db, `games/${gameId}/players/${uid}`));

		const turnOrder: string[] = [];
		snap.child('turnOrder').forEach(c => { turnOrder.push(c.val()); });
		const newOrder = turnOrder.filter(u => u !== uid);
		await set(ref(db, `games/${gameId}/turnOrder`), newOrder);

		if (newOrder.length === 0) {
			const rematchFrom = snap.child('rematchFromGameId').val() as string | null;
			if (rematchFrom) {
				await set(ref(db, `games/${rematchFrom}/rematch/cancelled`), true);
			}
			await deleteGame(gameId);
		} else {
			if (code) await set(ref(db, `lobbies/${code}/playerCount`), newOrder.length);
			if (uid === hostUid) await transferHost(gameId, uid, newOrder);
		}
		await remove(ref(db, `users/${uid}/activeGames/${gameId}`));
	} else {
		await update(ref(db, `games/${gameId}`), {
			[`players/${uid}/connected`]: false,
			lastActivity: serverTimestamp(),
		});
	}
}

export async function dismissGame(gameId: string): Promise<void> {
	const uid = getCurrentUid();
	if (!uid) return;

	const snap = await get(ref(db, `games/${gameId}`));
	if (!snap.exists()) {
		await remove(ref(db, `users/${uid}/activeGames/${gameId}`));
		return;
	}

	const phase = snap.child('phase').val() as string;
	const hostUid = snap.child('host').val() as string;

	if (phase === 'GAME_OVER') {
		await remove(ref(db, `users/${uid}/activeGames/${gameId}`));
		return;
	}

	if (phase === 'LOBBY') {
		const code = snap.child('code').val() as string;
		await remove(ref(db, `games/${gameId}/players/${uid}`));

		const turnOrder: string[] = [];
		snap.child('turnOrder').forEach(c => { turnOrder.push(c.val()); });
		const newOrder = turnOrder.filter(u => u !== uid);
		await set(ref(db, `games/${gameId}/turnOrder`), newOrder);

		if (newOrder.length === 0) {
			const rematchFrom = snap.child('rematchFromGameId').val() as string | null;
			if (rematchFrom) {
				await set(ref(db, `games/${rematchFrom}/rematch/cancelled`), true);
			}
			await deleteGame(gameId);
		} else {
			if (code) await set(ref(db, `lobbies/${code}/playerCount`), newOrder.length);
			if (uid === hostUid) await transferHost(gameId, uid, newOrder);
		}
	} else {
		await update(ref(db, `games/${gameId}`), {
			[`players/${uid}/isActive`]: false,
			[`players/${uid}/connected`]: false,
			lastActivity: serverTimestamp(),
		});

		let activeCount = 0;
		snap.child('players').forEach(playerSnap => {
			const pUid = playerSnap.child('uid').val();
			const isActive = playerSnap.child('isActive').val() ?? false;
			if (pUid !== uid && isActive) activeCount++;
		});

		if (activeCount < 2) {
			await setGameOver(gameId);
		} else if (uid === hostUid) {
			const turnOrder: string[] = [];
			snap.child('turnOrder').forEach(c => { turnOrder.push(c.val()); });
			const activeTurnOrder = turnOrder.filter(pUid => {
				if (pUid === uid) return false;
				return snap.child(`players/${pUid}/isActive`).val() === true;
			});
			await transferHost(gameId, uid, activeTurnOrder);
		}
	}

	await remove(ref(db, `users/${uid}/activeGames/${gameId}`));
}

export async function deleteGame(gameId: string): Promise<void> {
	const codeSnap = await get(ref(db, `games/${gameId}/code`));
	const code = codeSnap.val() as string;
	await remove(ref(db, `games/${gameId}`));
	if (code) await remove(ref(db, `lobbies/${code}`));
}

export async function getUserActiveGames(): Promise<ActiveGameInfo[]> {
	const uid = await ensureAuthenticated();
	const activeSnap = await get(ref(db, `users/${uid}/activeGames`));

	const games: ActiveGameInfo[] = [];
	const children: [string, any][] = [];
	activeSnap.forEach(c => { children.push([c.key!, c.val()]); });

	for (const [gId] of children) {
		const gameSnap = await get(ref(db, `games/${gId}`));
		if (!gameSnap.exists()) {
			await remove(ref(db, `users/${uid}/activeGames/${gId}`));
			continue;
		}
		games.push({
			gameId: gId,
			code: gameSnap.child('code').val() as string ?? '',
			phase: gameSnap.child('phase').val() as string ?? 'LOBBY',
			playerCount: gameSnap.child('players').size,
			currentRound: gameSnap.child('currentRound').val() as number ?? 1,
		});
	}
	return games;
}

export async function getOpenLobbies(): Promise<LobbyInfo[]> {
	const uid = await ensureAuthenticated();
	const lobbiesSnap = await get(ref(db, 'lobbies'));

	const lobbies: LobbyInfo[] = [];
	const entries: [string, any][] = [];
	lobbiesSnap.forEach(c => { entries.push([c.key!, c.val()]); });

	for (const [lobbyCode, data] of entries) {
		if (!data.isOpen) continue;
		if (!data.gameId || data.playerCount < 1 || data.playerCount >= (data.maxPlayers ?? 4)) continue;

		try {
			const gameSnap = await get(ref(db, `games/${data.gameId}`));
			if (!gameSnap.exists()) {
				await remove(ref(db, `lobbies/${lobbyCode}`));
				continue;
			}
			if (gameSnap.child('phase').val() !== 'LOBBY') continue;
			if (gameSnap.child(`players/${uid}`).exists()) continue;

			lobbies.push({
				code: lobbyCode,
				gameId: data.gameId,
				hostName: data.hostName ?? 'Unknown',
				playerCount: data.playerCount ?? 1,
				maxPlayers: data.maxPlayers ?? 4,
			});
		} catch {
			await remove(ref(db, `lobbies/${lobbyCode}`));
		}
	}
	return lobbies;
}

export async function requestRematch(
	oldGameId: string,
	playerName: string,
	playerColor: PlayerColor,
	eligibleUids: Set<string>
): Promise<string | null> {
	const uid = await ensureAuthenticated();
	const newGameId = await createGame(playerName, playerColor);

	const codeSnap = await get(ref(db, `games/${newGameId}/code`));
	const newGameCode = codeSnap.val() as string;
	if (!newGameCode) return null;

	await set(ref(db, `games/${newGameId}/rematchFromGameId`), oldGameId);

	const rematchRef = ref(db, `games/${oldGameId}/rematch`);
	const result = await runTransaction(rematchRef, (currentData) => {
		if (!currentData) currentData = {};
		const existingRequest = currentData.requestedBy;
		const isCancelled = currentData.cancelled === true;
		const isStarted = currentData.started === true;
		if (existingRequest && !isCancelled && !isStarted) return undefined; // abort

		const eligibleObj: Record<string, boolean> = {};
		for (const eUid of eligibleUids) eligibleObj[eUid] = true;

		return {
			requestedBy: uid,
			requestedByName: playerName,
			newGameId,
			newGameCode,
			eligibleUids: eligibleObj,
			acceptedUids: { [uid]: true },
			requestedAt: serverTimestamp(),
		};
	});

	if (!result.committed) {
		await deleteGame(newGameId);
		return null;
	}
	return newGameId;
}

export async function acceptRematch(
	oldGameId: string,
	playerName: string,
	playerColor: PlayerColor
): Promise<string | null> {
	const uid = await ensureAuthenticated();

	const rematchSnap = await get(ref(db, `games/${oldGameId}/rematch`));
	const newGameCode = rematchSnap.child('newGameCode').val() as string;
	const newGameId = rematchSnap.child('newGameId').val() as string;
	if (!newGameCode || !newGameId) return null;

	const joinResult = await joinGame(newGameCode, playerName, playerColor);
	if (!joinResult || joinResult === 'COLOR_TAKEN') return null;

	await setPlayerReady(newGameId, true);
	await set(ref(db, `games/${oldGameId}/rematch/acceptedUids/${uid}`), true);

	return newGameId;
}

export async function declineRematch(oldGameId: string): Promise<void> {
	const uid = getCurrentUid();
	if (!uid) return;
	await set(ref(db, `games/${oldGameId}/rematch/declinedUids/${uid}`), true);
}

export async function startRematchGame(newGameId: string): Promise<boolean> {
	const gameRef = ref(db, `games/${newGameId}`);

	const result = await runTransaction(child(gameRef, 'rematchStarted'), (current) => {
		if (current === true) return undefined;
		return true;
	});

	if (!result.committed) return false;

	const turnOrderSnap = await get(child(gameRef, 'turnOrder'));
	const turnOrder: string[] = [];
	turnOrderSnap.forEach(c => { turnOrder.push(c.val()); });

	await startGame(newGameId, turnOrder);

	const oldGameIdSnap = await get(child(gameRef, 'rematchFromGameId'));
	const oldGameId = oldGameIdSnap.val() as string;
	if (oldGameId) {
		await set(ref(db, `games/${oldGameId}/rematch/started`), true);
	}
	return true;
}

export async function writeRematchCountdownStarted(oldGameId: string): Promise<void> {
	await set(ref(db, `games/${oldGameId}/rematch/countdownStartedAt`), serverTimestamp());
}

export async function leaveGameOver(gameId: string): Promise<void> {
	const uid = getCurrentUid();
	if (!uid || !gameId) return;
	await set(ref(db, `games/${gameId}/players/${uid}/connected`), false);
	await remove(ref(db, `users/${uid}/activeGames/${gameId}`));
}

async function transferHost(gameId: string, currentHostUid: string, turnOrder: string[]): Promise<void> {
	const newHostUid = turnOrder.find(u => u !== currentHostUid);
	if (!newHostUid) return;

	const nameSnap = await get(ref(db, `games/${gameId}/players/${newHostUid}/name`));
	const codeSnap = await get(ref(db, `games/${gameId}/code`));
	const newHostName = nameSnap.val() as string;
	const code = codeSnap.val() as string;

	await update(ref(db, `games/${gameId}`), {
		host: newHostUid,
		lastActivity: serverTimestamp(),
	});

	if (code && newHostName) {
		await set(ref(db, `lobbies/${code}/hostName`), newHostName);
	}
}

function setupDisconnectHandler(gameId: string, uid: string): void {
	const playerRef = ref(db, `games/${gameId}/players/${uid}/connected`);
	onDisconnect(playerRef).set(false);
}
