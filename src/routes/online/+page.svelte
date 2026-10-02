<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { PLAYER_COLOR_DEFAULTS, type PlayerColor } from '$lib/game/models';
	import { sanitizeName } from '$lib/utils/validation';
	import { getPreferences, savePreferences } from '$lib/stores/preferences.svelte';
	import * as FM from '$lib/firebase/gameManager';
	import { ensureAuthenticated } from '$lib/firebase/auth';
	import type { LobbyInfo, ActiveGameInfo } from '$lib/firebase/types';
	import { onlineGame } from '$lib/stores/onlineGame.svelte';

	let playerName = $state('');
	let playerColor = $state<PlayerColor>('BLUE');
	let joinCode = $state('');
	let loading = $state(false);
	let error = $state('');
	let openLobbies = $state<LobbyInfo[]>([]);
	let activeGames = $state<ActiveGameInfo[]>([]);
	let isPublic = $state(false);

	import { onMount } from 'svelte';

	onMount(() => {
		const prefs = getPreferences();
		if (prefs.playerName) playerName = prefs.playerName;
		if (prefs.preferredColor) playerColor = prefs.preferredColor;
		loadLobbiesAndGames();
	});

	async function loadLobbiesAndGames() {
		try {
			await ensureAuthenticated();
			const [lobbies, games] = await Promise.all([
				FM.getOpenLobbies(),
				FM.getUserActiveGames(),
			]);
			openLobbies = lobbies;
			activeGames = games;
		} catch {
			// Firebase may not be configured yet
		}
	}

	function getName(): string {
		return sanitizeName(playerName.trim()) || 'Player';
	}

	async function createGame() {
		loading = true;
		error = '';
		try {
			savePreferences({ playerName: getName(), preferredColor: playerColor });
			const gameId = await FM.createGame(getName(), playerColor, isPublic);
			onlineGame.startObserving(gameId);
			goto(`${base}/online/lobby/${gameId}`);
		} catch (e: any) {
			error = e.message ?? 'Failed to create game';
		} finally {
			loading = false;
		}
	}

	async function joinByCode() {
		if (joinCode.length < 4) { error = 'Enter a game code'; return; }
		loading = true;
		error = '';
		try {
			savePreferences({ playerName: getName(), preferredColor: playerColor });
			const result = await FM.joinGame(joinCode.toUpperCase(), getName(), playerColor);
			if (!result) { error = 'Game not found or full'; return; }
			if (result === 'COLOR_TAKEN') { error = 'That color is already taken'; return; }
			onlineGame.startObserving(result);
			goto(`${base}/online/lobby/${result}`);
		} catch (e: any) {
			error = e.message ?? 'Failed to join game';
		} finally {
			loading = false;
		}
	}

	async function joinLobby(lobby: LobbyInfo) {
		loading = true;
		error = '';
		try {
			savePreferences({ playerName: getName(), preferredColor: playerColor });
			const result = await FM.joinGame(lobby.code, getName(), playerColor);
			if (!result) { error = 'Game no longer available'; return; }
			if (result === 'COLOR_TAKEN') { error = 'That color is already taken'; return; }
			onlineGame.startObserving(result);
			goto(`${base}/online/lobby/${result}`);
		} catch (e: any) {
			error = e.message ?? 'Failed to join';
		} finally {
			loading = false;
		}
	}

	async function rejoinGame(game: ActiveGameInfo) {
		try {
			await FM.reconnectToGame(game.gameId);
			onlineGame.startObserving(game.gameId);
			if (game.phase === 'LOBBY') {
				goto(`${base}/online/lobby/${game.gameId}`);
			} else if (game.phase === 'GAME_OVER') {
				goto(`${base}/online/gameover`);
			} else {
				goto(`${base}/online/game/${game.gameId}`);
			}
		} catch (e: any) {
			error = e.message ?? 'Failed to rejoin';
		}
	}

	async function dismissActiveGame(game: ActiveGameInfo) {
		try {
			await FM.dismissGame(game.gameId);
			activeGames = activeGames.filter(g => g.gameId !== game.gameId);
		} catch { /* ignore */ }
	}
</script>

<div class="online-page">
	<PageHeader title="Online Game" flush onback={() => goto(base || '/')} />

	{#if error}
		<div class="error-banner">{error}</div>
	{/if}

	<!-- Player identity -->
	<div class="section">
		<h3>Your Name & Color</h3>
		<div class="identity-row">
			<input type="text" class="name-input" placeholder="Your name" bind:value={playerName} maxlength="20" />
			<div class="color-picker">
				{#each PLAYER_COLOR_DEFAULTS as color}
					<button
						class="color-swatch"
						class:selected={playerColor === color}
						data-player={color}
						aria-label={color}
						onclick={() => { playerColor = color; }}
					></button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Create game -->
	<div class="section">
		<h3>Create Game</h3>
		<label class="toggle-row">
			<input type="checkbox" bind:checked={isPublic} />
			<span>Public (visible in lobby browser)</span>
		</label>
		<button class="btn btn-primary btn-block" onclick={createGame} disabled={loading}>
			{loading ? 'Creating...' : 'Create Game'}
		</button>
	</div>

	<!-- Join by code -->
	<div class="section">
		<h3>Join by Code</h3>
		<div class="join-row">
			<input
				type="text"
				class="code-input"
				placeholder="Game Code"
				bind:value={joinCode}
				maxlength="6"
			/>
			<button class="btn btn-primary" onclick={joinByCode} disabled={loading}>Join</button>
		</div>
	</div>

	<!-- Active games -->
	{#if activeGames.length > 0}
		<div class="section">
			<h3>Your Active Games</h3>
			{#each activeGames as game}
				<div class="game-card">
					<div class="game-info">
						<span class="game-code">{game.code}</span>
						<span class="game-phase">{game.phase}</span>
						<span class="game-meta">{game.playerCount} players • R{game.currentRound}</span>
					</div>
					<div class="game-actions">
						<button class="btn btn-primary btn-sm" onclick={() => rejoinGame(game)}>Rejoin</button>
						<button class="btn btn-danger btn-sm" onclick={() => dismissActiveGame(game)}>Dismiss</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Open lobbies -->
	<div class="section">
		<h3>Open Games</h3>
		{#if openLobbies.length > 0}
			{#each openLobbies as lobby}
				<div class="game-card">
					<div class="game-info">
						<span class="game-code">{lobby.code}</span>
						<span class="game-meta">{lobby.hostName} • {lobby.playerCount}/{lobby.maxPlayers}</span>
					</div>
					<button class="btn btn-primary btn-sm" onclick={() => joinLobby(lobby)}>Join</button>
				</div>
			{/each}
		{:else}
			<p class="empty-text">No open games found</p>
		{/if}
		<button class="btn-text btn-block" onclick={loadLobbiesAndGames}>Refresh</button>
	</div>
</div>

<style>
	.online-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		height: 100%;
		padding: var(--space-md);
		overflow-y: auto;
	}

	h3 { color: var(--gold-amber); font-size: var(--font-size-base); margin-bottom: var(--space-sm); }

	.error-banner {
		background: var(--error-tint); color: var(--score-negative); padding: 10px var(--space-md);
		border-radius: var(--radius-md); font-weight: 600; font-size: var(--font-size-sm);
	}

	.section { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius-lg); padding: var(--space-md); }

	.identity-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
	.name-input {
		flex: 1; padding: 10px 12px; border: 1px solid var(--warm-tan);
		border-radius: var(--radius-md); font-size: var(--font-size-base); min-width: 150px;
		background: var(--input-bg); color: var(--text-dark);
	}
	.name-input:focus { outline: 2px solid var(--gold-amber); border-color: transparent; }

	.color-picker { display: flex; gap: 6px; }
	.toggle-row {
		display: flex; align-items: center; gap: var(--space-sm); margin-bottom: 12px;
		font-size: var(--font-size-sm); cursor: pointer;
	}
	.toggle-row input { width: 18px; height: 18px; accent-color: var(--gold-amber); }

	.join-row { display: flex; gap: var(--space-sm); }
	.code-input {
		flex: 1; min-width: 0; padding: 10px 12px; border: 1px solid var(--warm-tan);
		border-radius: var(--radius-md); font-size: var(--font-size-lg); font-weight: 700;
		letter-spacing: 4px; text-align: center; text-transform: uppercase;
		background: var(--input-bg); color: var(--text-dark);
	}

	.game-card {
		display: flex; align-items: center; justify-content: space-between;
		padding: 10px; border: 1px solid var(--warm-tan); border-radius: var(--radius-md);
		margin-bottom: var(--space-sm);
	}
	.game-info { display: flex; flex-direction: column; gap: var(--space-2xs); }
	.game-code { font-weight: 700; letter-spacing: 2px; }
	.game-phase { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; }
	.game-meta { font-size: var(--font-size-sm); color: var(--text-medium); }
	.game-actions { display: flex; gap: 6px; }

	.empty-text {
		color: var(--text-muted); font-size: var(--font-size-sm);
		font-style: italic; padding: var(--space-sm) 0;
	}
</style>
