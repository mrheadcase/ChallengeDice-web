<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { onlineGame } from '$lib/stores/onlineGame.svelte';
	import GameResults from '$lib/components/GameResults.svelte';
	import * as FM from '$lib/firebase/gameManager';

	const REMATCH_AUTOSTART_SECONDS = 30;

	let now = $state(Date.now());

	let gameState = $derived(onlineGame.gameState);
	let rematch = $derived(onlineGame.rematchState);
	let rematchRemainingSeconds = $derived.by(() => {
		if (rematch.countdownStartedAt == null) return REMATCH_AUTOSTART_SECONDS;
		const elapsed = Math.floor((now - rematch.countdownStartedAt) / 1000);
		return Math.max(0, REMATCH_AUTOSTART_SECONDS - elapsed);
	});

	onMount(() => {
		const tickTimer = setInterval(() => { now = Date.now(); }, 500);
		return () => clearInterval(tickTimer);
	});

	$effect(() => {
		if (gameState.phase !== 'GAME_OVER' && gameState.phase !== 'SETUP') {
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
			// Stay on this page — rematch gameState will update via Firebase
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

<GameResults players={gameState.players}>
	{#snippet actions()}
		{#if onlineGame.hasOtherConnectedPlayers}
			<div class="rematch-section">
				{#if !rematch.isRequested}
					<button class="btn btn-primary btn-block" onclick={handleRequestRematch} disabled={rematchLoading}>
						{rematchLoading ? 'Requesting...' : 'Request Rematch'}
					</button>
				{:else if rematch.cancelled}
					<p class="rematch-info">Rematch cancelled</p>
					<button class="btn btn-primary btn-block" onclick={handleRequestRematch} disabled={rematchLoading}>
						Request New Rematch
					</button>
				{:else if rematch.localResponse === 'REQUESTER'}
					<p class="rematch-info">
						Waiting for others... {rematch.acceptedUids.size} accepted
					</p>
					{#if rematch.countdownStartedAt != null && rematchRemainingSeconds > 0}
						<p class="countdown-info">Starting in {rematchRemainingSeconds}s</p>
					{/if}
				{:else if rematch.localResponse === 'NONE'}
					<p class="rematch-info">{rematch.requestedByName} wants a rematch!</p>
					{#if rematch.countdownStartedAt != null && rematchRemainingSeconds > 0}
						<p class="countdown-info">Starting in {rematchRemainingSeconds}s</p>
					{/if}
					<div class="rematch-actions">
						<button class="btn btn-primary" onclick={handleAcceptRematch} disabled={rematchLoading}>
							Accept
						</button>
						<button class="btn btn-quiet" onclick={handleDeclineRematch}>
							Decline
						</button>
					</div>
				{:else if rematch.localResponse === 'ACCEPTED'}
					<p class="rematch-info">Waiting for game to start... {rematch.acceptedUids.size} ready</p>
					{#if rematch.countdownStartedAt != null && rematchRemainingSeconds > 0}
						<p class="countdown-info">Starting in {rematchRemainingSeconds}s</p>
					{/if}
				{:else if rematch.localResponse === 'DECLINED'}
					<p class="rematch-info">You declined the rematch</p>
				{/if}
			</div>
		{/if}

		<button class="btn-text leave-btn" onclick={leave}>Leave Game</button>
	{/snippet}
</GameResults>

<style>
	.rematch-section { width: 100%; text-align: center; }
	.rematch-info { color: var(--text-medium); margin-bottom: var(--space-sm); font-weight: 600; }
	.countdown-info {
		color: var(--gold-amber); font-weight: 700; font-size: var(--font-size-sm);
		margin-bottom: var(--space-sm);
	}
	.rematch-actions { display: flex; gap: var(--space-sm); }
	.rematch-actions .btn { flex: 1; }

	/* Quieter than the rematch actions: muted, not amber */
	.leave-btn {
		padding: 10px var(--space-lg);
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}
</style>
