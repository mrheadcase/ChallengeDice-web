<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onlineGame } from '$lib/stores/onlineGame.svelte';
	import * as FM from '$lib/firebase/gameManager';
	import { copyToClipboard } from '$lib/utils/clipboard';

	let copied = $state(false);
	let starting = $state(false);

	let gameState = $derived(onlineGame.gameState);
	let gameId = $derived(page.params.gameId as string);

	// Start observing if not already
	$effect(() => {
		if (gameId && onlineGame.gameId !== gameId) {
			onlineGame.startObserving(gameId);
		}
	});

	// Redirect when game starts
	$effect(() => {
		if (gameState.phase === 'ROLLING' || gameState.phase === 'SELECTING') {
			goto(`${base}/online/game/${gameId}`);
		}
	});

	// Find lobby code from game gameState (read from Firebase)
	let lobbyCode = $state('');
	$effect(() => {
		const unsub = FM.observeGame(gameId, (snap) => {
			lobbyCode = snap.child('code').val() as string ?? '';
		});
		return unsub;
	});

	let allReady = $derived(gameState.players.length >= 2 && gameState.players.every(p => true)); // simplified

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
		// Toggle ready (simplified — in full impl, tracks per-player ready gameState from Firebase)
		await FM.setPlayerReady(gameId, true);
	}

	async function startGameNow() {
		if (!onlineGame.isHost || gameState.players.length < 2) return;
		starting = true;
		try {
			const turnOrder = gameState.players.map((_, i) => {
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
	<PageHeader title="Game Lobby" backLabel="Leave" flush onback={leaveLobby} />

	<!-- Game code -->
	<div class="code-section">
		<span class="code-label">Game Code</span>
		<div class="code-display">
			<span class="code">{lobbyCode || '...'}</span>
			<button class="btn btn-primary btn-sm" onclick={copyCode}>{copied ? 'Copied!' : 'Copy'}</button>
		</div>
		<p class="code-hint">Share this code with friends to join</p>
	</div>

	<!-- Players -->
	<div class="players-section">
		<h3>Players ({gameState.players.length}/4)</h3>
		{#each gameState.players as player, i}
			<div class="player-row" data-player={player.color}>
				<span class="player-dot"></span>
				<span class="player-name">{player.name}</span>
				{#if onlineGame.isPlayerHost(i)}
					<span class="badge badge-primary badge-pill">Host</span>
				{/if}
			</div>
		{/each}

		{#if gameState.players.length < 4}
			<div class="player-row empty">
				<span class="waiting">Waiting for players...</span>
			</div>
		{/if}
	</div>

	<!-- Actions -->
	<div class="actions">
		{#if onlineGame.isHost}
			<button
				class="btn btn-primary btn-lg btn-block start-btn"
				onclick={startGameNow}
				disabled={gameState.players.length < 2 || starting}
			>
				{starting ? 'Starting...' : `Start Game (${gameState.players.length} players)`}
			</button>
		{:else}
			<div class="waiting-msg">Waiting for host to start...</div>
		{/if}
	</div>
</div>

<style>
	.lobby-page {
		display: flex; flex-direction: column; gap: var(--space-lg);
		height: 100%; padding: var(--space-md); overflow-y: auto;
	}

	.code-section { text-align: center; }
	.code-label { font-size: var(--font-size-sm); color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; }
	.code-display { display: flex; align-items: center; justify-content: center; gap: 12px; margin: var(--space-sm) 0; }
	.code {
		font-size: var(--font-size-2xl); font-weight: 800; letter-spacing: 6px;
		color: var(--gold-amber); font-family: monospace;
	}
	.code-hint { font-size: var(--font-size-sm); color: var(--text-muted); }

	.players-section { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius-lg); padding: var(--space-md); }
	h3 { color: var(--text-dark); margin-bottom: 12px; }

	.player-row {
		display: flex; align-items: center; gap: 10px;
		padding: 10px 0; border-bottom: 1px solid var(--card-border);
	}
	.player-row:last-child { border-bottom: none; }
	.player-row.empty { justify-content: center; }

	.player-dot { width: 12px; height: 12px; }
	.player-name { font-weight: 600; flex: 1; }
	.waiting { color: var(--text-muted); font-style: italic; }

	.actions { margin-top: auto; }
	.start-btn { padding: var(--space-md); }

	.waiting-msg {
		text-align: center; color: var(--text-muted); font-style: italic; padding: var(--space-md);
	}
</style>
