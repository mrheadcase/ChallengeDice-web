<script lang="ts">
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onlineGame } from '$lib/stores/onlineGame.svelte';
	import { PLAYER_COLORS } from '$lib/game/constants';
	import * as FM from '$lib/firebase/gameManager';
	import { copyToClipboard } from '$lib/utils/clipboard';

	let copied = $state(false);
	let starting = $state(false);

	let state = $derived(onlineGame.gameState);
	let gameId = $derived($page.params.gameId);

	// Start observing if not already
	$effect(() => {
		if (gameId && onlineGame.gameId !== gameId) {
			onlineGame.startObserving(gameId);
		}
	});

	// Redirect when game starts
	$effect(() => {
		if (state.phase === 'ROLLING' || state.phase === 'SELECTING') {
			goto(`${base}/online/game/${gameId}`);
		}
	});

	// Find lobby code from game state (read from Firebase)
	let lobbyCode = $state('');
	$effect(() => {
		const unsub = FM.observeGame(gameId, (snap) => {
			lobbyCode = snap.child('code').val() as string ?? '';
		});
		return unsub;
	});

	let allReady = $derived(state.players.length >= 2 && state.players.every(p => true)); // simplified

	async function copyCode() {
		if (lobbyCode) {
			await copyToClipboard(lobbyCode);
			copied = true;
			setTimeout(() => { copied = false; }, 2000);
		}
	}

	async function toggleReady() {
		const localIdx = onlineGame.localPlayerIndex;
		if (localIdx < 0) return;
		// Toggle ready (simplified — in full impl, tracks per-player ready state from Firebase)
		await FM.setPlayerReady(gameId, true);
	}

	async function startGameNow() {
		if (!onlineGame.isHost || state.players.length < 2) return;
		starting = true;
		try {
			const turnOrder = state.players.map((_, i) => {
				// Get UIDs from turn order in the store
				return ''; // Will be read from Firebase
			});
			// Read actual turn order from Firebase
			const snap = await new Promise<any>((resolve) => {
				const unsub = FM.observeGame(gameId, (s) => {
					resolve(s);
					unsub();
				});
			});
			const uids: string[] = [];
			snap.child('turnOrder').forEach((c: any) => { uids.push(c.val()); });
			await FM.startGame(gameId, uids);
		} catch {
			starting = false;
		}
	}

	async function leaveLobby() {
		onlineGame.markLeft();
		onlineGame.stopObserving();
		await FM.leaveGame(gameId);
		goto(`${base}/online`);
	}
</script>

<div class="lobby-page">
	<header class="lobby-header">
		<button class="back-btn" onclick={leaveLobby}>← Leave</button>
		<h2>Game Lobby</h2>
	</header>

	<!-- Game code -->
	<div class="code-section">
		<span class="code-label">Game Code</span>
		<div class="code-display">
			<span class="code">{lobbyCode || '...'}</span>
			<button class="copy-btn" onclick={copyCode}>{copied ? 'Copied!' : 'Copy'}</button>
		</div>
		<p class="code-hint">Share this code with friends to join</p>
	</div>

	<!-- Players -->
	<div class="players-section">
		<h3>Players ({state.players.length}/4)</h3>
		{#each state.players as player, i}
			{@const colors = PLAYER_COLORS[player.color]}
			<div class="player-row">
				<span class="player-dot" style:background={colors.primary}></span>
				<span class="player-name">{player.name}</span>
				{#if i === 0}
					<span class="host-badge">Host</span>
				{/if}
			</div>
		{/each}

		{#if state.players.length < 4}
			<div class="player-row empty">
				<span class="waiting">Waiting for players...</span>
			</div>
		{/if}
	</div>

	<!-- Actions -->
	<div class="actions">
		{#if onlineGame.isHost}
			<button
				class="action-btn primary"
				onclick={startGameNow}
				disabled={state.players.length < 2 || starting}
			>
				{starting ? 'Starting...' : `Start Game (${state.players.length} players)`}
			</button>
		{:else}
			<div class="waiting-msg">Waiting for host to start...</div>
		{/if}
	</div>
</div>

<style>
	.lobby-page {
		display: flex; flex-direction: column; gap: 24px;
		height: 100%; padding: 16px; overflow-y: auto;
	}

	.lobby-header { display: flex; align-items: center; gap: 16px; }
	.back-btn { color: var(--gold-amber); font-weight: 600; padding: 8px; }
	h2 { color: var(--text-dark); }

	.code-section { text-align: center; }
	.code-label { font-size: var(--font-size-sm); color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; }
	.code-display { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 8px 0; }
	.code {
		font-size: 2rem; font-weight: 800; letter-spacing: 6px;
		color: var(--gold-amber); font-family: monospace;
	}
	.copy-btn {
		padding: 8px 16px; background: var(--gold-amber); color: white;
		border-radius: var(--radius-md); font-weight: 600; font-size: var(--font-size-sm);
	}
	.code-hint { font-size: var(--font-size-sm); color: var(--text-muted); }

	.players-section { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius-lg); padding: 16px; }
	h3 { color: var(--text-dark); margin-bottom: 12px; }

	.player-row {
		display: flex; align-items: center; gap: 10px;
		padding: 10px 0; border-bottom: 1px solid var(--card-border);
	}
	.player-row:last-child { border-bottom: none; }
	.player-row.empty { justify-content: center; }

	.player-dot { width: 12px; height: 12px; border-radius: 50%; }
	.player-name { font-weight: 600; flex: 1; }
	.host-badge {
		font-size: 10px; background: var(--gold-amber); color: white;
		padding: 2px 8px; border-radius: 10px; font-weight: 700;
	}
	.waiting { color: var(--text-muted); font-style: italic; }

	.actions { margin-top: auto; }
	.action-btn {
		padding: 16px; border-radius: var(--radius-lg); font-weight: 700;
		font-size: var(--font-size-lg); width: 100%;
	}
	.action-btn.primary { background: var(--gold-amber); color: white; }
	.action-btn:disabled { opacity: 0.6; cursor: not-allowed; }

	.waiting-msg {
		text-align: center; color: var(--text-muted); font-style: italic; padding: 16px;
	}
</style>
