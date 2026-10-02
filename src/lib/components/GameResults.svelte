<script lang="ts">
	/*
	 * Game-over screen shared by local and online play: confetti, the winner card, the
	 * final standings (tap a row to view that player's scorecard), and the page's own
	 * actions (rematch, new game, leave…) underneath.
	 */
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import type { Player } from '$lib/game/models';
	import { calculateScore } from '$lib/game/logic';
	import Scorecard from './Scorecard.svelte';
	import PinchZoomContainer from './PinchZoomContainer.svelte';
	import ConfettiOverlay from './ConfettiOverlay.svelte';

	interface Props {
		players: Player[];
		actions: Snippet;
	}

	let { players, actions }: Props = $props();

	let showConfetti = $state(true);
	let viewingPlayerId = $state(0);

	let allScores = $derived(
		players
			.map(p => ({ player: p, score: calculateScore(p.scorecard) }))
			.sort((a, b) => b.score.totalScore - a.score.totalScore)
	);
	let winner = $derived(allScores[0]);
	let viewingPlayer = $derived(players.find(p => p.id === viewingPlayerId));

	onMount(() => {
		const timer = setTimeout(() => { showConfetti = false; }, 4000);
		return () => clearTimeout(timer);
	});
</script>

<div class="gameover-page">
	<ConfettiOverlay active={showConfetti} />

	<h2>Game Over!</h2>

	{#if winner}
		<div class="winner-card" data-player={winner.player.color}>
			<div class="winner-crown">Winner</div>
			<div class="winner-name">{winner.player.name}</div>
			<div class="winner-score">{winner.score.totalScore}</div>
			<div class="winner-details">
				<span class="positive">+{winner.score.positiveTotal}</span>
				<span class="negative">{winner.score.negativeTotal}</span>
			</div>
		</div>
	{/if}

	<div class="scores-list">
		{#each allScores as { player, score }, i}
			<button
				class="score-row"
				class:active={viewingPlayerId === player.id}
				data-player={player.color}
				onclick={() => { viewingPlayerId = player.id; }}
			>
				<span class="rank">#{i + 1}</span>
				<span class="player-dot"></span>
				<span class="name">{player.name}</span>
				{#if player.isAI}<span class="badge">AI</span>{/if}
				{#if !player.isActive}<span class="badge badge-danger">Eliminated</span>{/if}
				<span class="total" class:positive={score.totalScore > 0} class:negative={score.totalScore < 0}>
					{score.totalScore}
				</span>
			</button>
		{/each}
	</div>

	{#if viewingPlayer}
		<div class="scorecard-viewer">
			<PinchZoomContainer>
				<Scorecard scorecard={viewingPlayer.scorecard} compact />
			</PinchZoomContainer>
		</div>
	{/if}

	<div class="actions">
		{@render actions()}
	</div>
</div>

<style>
	.gameover-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		height: 100%;
		padding: var(--space-md);
		overflow-y: auto;
	}

	h2 {
		font-size: var(--font-size-2xl);
		color: var(--gold-amber);
		text-align: center;
	}

	.winner-card {
		background: var(--card-bg);
		border: 3px solid var(--player);
		border-radius: var(--radius-xl);
		padding: var(--space-md) var(--space-xl);
		text-align: center;
		box-shadow: var(--shadow-raised);
	}

	.winner-crown {
		font-size: var(--font-size-sm);
		color: var(--gold-amber);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 2px;
	}

	.winner-name {
		font-size: var(--font-size-xl);
		font-weight: 800;
		color: var(--player);
	}

	.winner-score {
		font-size: var(--font-size-2xl);
		font-weight: 800;
		color: var(--text-dark);
	}

	.winner-details {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
		font-weight: 600;
	}

	.scores-list {
		width: 100%;
		max-width: 400px;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.score-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) 12px;
		background: var(--card-bg);
		border-radius: var(--radius-md);
		border: 2px solid transparent;
		text-align: left;
	}

	.score-row.active { border-color: var(--gold-amber); }
	.rank { font-weight: 700; color: var(--text-muted); width: 24px; }
	.name { flex: 1; font-weight: 600; }
	.total { font-weight: 700; }

	.positive { color: var(--score-positive); }
	.negative { color: var(--score-negative); }

	.scorecard-viewer {
		width: 100%;
		max-width: 500px;
		overflow: auto;
	}

	.actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
		width: 100%;
		max-width: 320px;
		padding-top: var(--space-sm);
	}
</style>
