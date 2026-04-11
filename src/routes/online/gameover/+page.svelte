<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { onlineGame } from '$lib/stores/onlineGame.svelte';
	import { calculateScore } from '$lib/game/logic';
	import { PLAYER_COLORS } from '$lib/game/constants';
	import Scorecard from '$lib/components/Scorecard.svelte';
	import PinchZoomContainer from '$lib/components/PinchZoomContainer.svelte';
	import ConfettiOverlay from '$lib/components/ConfettiOverlay.svelte';
	import * as FM from '$lib/firebase/gameManager';

	let showConfetti = $state(true);
	let viewingPlayerId = $state(0);

	let state = $derived(onlineGame.gameState);
	let rematch = $derived(onlineGame.rematchState);
	let allScores = $derived(
		state.players.map(p => ({ player: p, score: calculateScore(p.scorecard) }))
			.sort((a, b) => b.score.totalScore - a.score.totalScore)
	);
	let winner = $derived(allScores[0]);
	let viewingPlayer = $derived(state.players.find(p => p.id === viewingPlayerId));

	onMount(() => {
		const timer = setTimeout(() => { showConfetti = false; }, 4000);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		if (state.phase !== 'GAME_OVER' && state.phase !== 'SETUP') {
			// Game restarted (rematch started)
			if (onlineGame.gameId) {
				goto(`${base}/online/game/${onlineGame.gameId}`);
			}
		}
	});

	// Auto-navigate when rematch starts
	$effect(() => {
		if (rematch.started && rematch.newGameId) {
			onlineGame.startObserving(rematch.newGameId);
			goto(`${base}/online/lobby/${rematch.newGameId}`);
		}
	});

	let rematchLoading = $state(false);

	async function handleRequestRematch() {
		rematchLoading = true;
		const newGameId = await onlineGame.requestRematch();
		rematchLoading = false;
		if (newGameId) {
			// Stay on this page — rematch state will update via Firebase
		}
	}

	async function handleAcceptRematch() {
		rematchLoading = true;
		const newGameId = await onlineGame.acceptRematch();
		rematchLoading = false;
		// Will auto-navigate when rematch starts via $effect
	}

	async function handleDeclineRematch() {
		await onlineGame.declineRematch();
	}

	async function leave() {
		onlineGame.markLeft();
		onlineGame.stopObserving();
		if (onlineGame.gameId) {
			await FM.leaveGameOver(onlineGame.gameId);
		}
		goto(`${base}/online`);
	}
</script>

<div class="gameover-page">
	<ConfettiOverlay active={showConfetti} />

	<header><h2>Game Over!</h2></header>

	{#if winner}
		{@const colors = PLAYER_COLORS[winner.player.color]}
		<div class="winner-card" style:border-color={colors.primary}>
			<div class="winner-crown">Winner</div>
			<div class="winner-name" style:color={colors.primary}>{winner.player.name}</div>
			<div class="winner-score">{winner.score.totalScore}</div>
		</div>
	{/if}

	<div class="scores-list">
		{#each allScores as { player, score }, i}
			{@const colors = PLAYER_COLORS[player.color]}
			<button
				class="score-row"
				class:active={viewingPlayerId === player.id}
				onclick={() => { viewingPlayerId = player.id; }}
			>
				<span class="rank">#{i + 1}</span>
				<span class="dot" style:background={colors.primary}></span>
				<span class="name">{player.name}</span>
				<span class="total" class:positive={score.totalScore > 0} class:negative={score.totalScore < 0}>
					{score.totalScore}
				</span>
			</button>
		{/each}
	</div>

	{#if viewingPlayer}
		<div class="scorecard-viewer">
			<PinchZoomContainer>
				<Scorecard scorecard={viewingPlayer.scorecard} playerColor={viewingPlayer.color} compact />
			</PinchZoomContainer>
		</div>
	{/if}

	<!-- Rematch -->
	{#if onlineGame.hasOtherConnectedPlayers}
		<div class="rematch-section">
			{#if !rematch.isRequested}
				<button class="action-btn primary" onclick={handleRequestRematch} disabled={rematchLoading}>
					{rematchLoading ? 'Requesting...' : 'Request Rematch'}
				</button>
			{:else if rematch.cancelled}
				<p class="rematch-info">Rematch cancelled</p>
				<button class="action-btn primary" onclick={handleRequestRematch} disabled={rematchLoading}>
					Request New Rematch
				</button>
			{:else if rematch.localResponse === 'REQUESTER'}
				<p class="rematch-info">
					Waiting for others... {rematch.acceptedUids.size} accepted
				</p>
			{:else if rematch.localResponse === 'NONE'}
				<p class="rematch-info">{rematch.requestedByName} wants a rematch!</p>
				<div class="rematch-actions">
					<button class="action-btn primary" onclick={handleAcceptRematch} disabled={rematchLoading}>
						Accept
					</button>
					<button class="action-btn secondary" onclick={handleDeclineRematch}>
						Decline
					</button>
				</div>
			{:else if rematch.localResponse === 'ACCEPTED'}
				<p class="rematch-info">Waiting for game to start... {rematch.acceptedUids.size} ready</p>
			{:else if rematch.localResponse === 'DECLINED'}
				<p class="rematch-info">You declined the rematch</p>
			{/if}
		</div>
	{/if}

	<button class="leave-btn" onclick={leave}>Leave Game</button>
</div>

<style>
	.gameover-page {
		display: flex; flex-direction: column; gap: 12px;
		height: 100%; padding: 16px; overflow-y: auto; align-items: center;
	}

	h2 { font-size: var(--font-size-2xl); color: var(--gold-amber); }

	.winner-card {
		background: var(--card-bg); border: 3px solid; border-radius: var(--radius-xl);
		padding: 16px 32px; text-align: center;
	}
	.winner-crown { font-size: var(--font-size-sm); color: var(--gold-amber); font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
	.winner-name { font-size: var(--font-size-xl); font-weight: 800; }
	.winner-score { font-size: var(--font-size-2xl); font-weight: 800; }

	.scores-list { width: 100%; max-width: 400px; }
	.score-row {
		display: flex; align-items: center; gap: 8px; padding: 8px 12px;
		background: var(--card-bg); border-radius: var(--radius-md); margin-bottom: 4px;
		border: 2px solid transparent; width: 100%; text-align: left;
	}
	.score-row.active { border-color: var(--gold-amber); }
	.rank { font-weight: 700; color: var(--text-muted); width: 24px; }
	.dot { width: 10px; height: 10px; border-radius: 50%; }
	.name { flex: 1; font-weight: 600; }
	.total { font-weight: 700; }
	.positive { color: var(--score-positive); }
	.negative { color: var(--score-negative); }

	.scorecard-viewer { width: 100%; max-width: 500px; overflow: auto; }

	.rematch-section { width: 100%; max-width: 320px; text-align: center; }
	.rematch-info { color: var(--text-medium); margin-bottom: 8px; font-weight: 600; }
	.rematch-actions { display: flex; gap: 8px; }

	.action-btn {
		flex: 1; padding: 12px; border-radius: var(--radius-lg); font-weight: 700;
	}
	.action-btn.primary { background: var(--gold-amber); color: white; }
	.action-btn.secondary { background: var(--card-bg); border: 2px solid var(--warm-tan); color: var(--text-medium); }
	.action-btn:disabled { opacity: 0.6; }

	.leave-btn {
		padding: 10px 24px; color: var(--text-muted); font-weight: 600;
		font-size: var(--font-size-sm);
	}
</style>
