<script lang="ts">
	/*
	 * Game-over screen shared by local and online play: confetti, the winner card, the
	 * final standings side by side (tap a player to view their scorecard), and the page's
	 * own actions (rematch, new game, leave…) underneath. The standings sit in one row so
	 * the whole scorecard fits below them on a phone.
	 */
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import type { Player } from '$lib/game/models';
	import { calculateScore } from '$lib/game/logic';
	import Scorecard from './Scorecard.svelte';
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

	<div class="scores-list" style:--players={allScores.length}>
		{#each allScores as { player, score }, i}
			<button
				class="score-row"
				class:active={viewingPlayerId === player.id}
				aria-pressed={viewingPlayerId === player.id}
				data-player={player.color}
				onclick={() => { viewingPlayerId = player.id; }}
			>
				<span class="row-top">
					<span class="rank">#{i + 1}</span>
					<span class="player-dot"></span>
					{#if player.isAI}<span class="badge">AI</span>{/if}
				</span>
				<span class="name">{player.name}</span>
				<span class="total" class:positive={score.totalScore > 0} class:negative={score.totalScore < 0}>
					{score.totalScore}
				</span>
			</button>
		{/each}
	</div>

	{#if viewingPlayer}
		<div class="scorecard-viewer">
			<Scorecard scorecard={viewingPlayer.scorecard} compact />
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

	/* One card per player, side by side in finishing order */
	.scores-list {
		flex: none;
		width: 100%;
		max-width: 500px;
		display: grid;
		grid-template-columns: repeat(var(--players, 2), minmax(0, 1fr));
		gap: var(--space-xs);
	}

	.score-row {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		min-width: 0;
		padding: var(--space-xs) var(--space-xs) 6px;
		background: var(--card-bg);
		border-radius: var(--radius-md);
		border: 2px solid transparent;
	}

	.score-row.active { border-color: var(--gold-amber); }

	.row-top {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--font-size-xs);
	}

	.rank { font-weight: 700; color: var(--text-muted); }
	.row-top .badge { font-size: 10px; padding: 0 4px; }

	.name {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 600;
		font-size: var(--font-size-sm);
	}

	.total {
		font-family: var(--font-numeric);
		font-size: var(--font-size-lg);
		font-weight: 700;
		line-height: 1.1;
	}


	.positive { color: var(--score-positive); }
	.negative { color: var(--score-negative); }

	/* Always its full height: the page scrolls if it must, never the scorecard */
	.scorecard-viewer {
		flex: none;
		width: 100%;
		max-width: 500px;
	}

	/*
	 * Shorter screens: the winner card becomes a single line and the heading shrinks, so
	 * the whole scorecard still fits below the standings
	 */
	@media (max-height: 760px) {
		.gameover-page { gap: var(--space-sm); padding-block: var(--space-sm); }
		h2 { font-size: var(--font-size-xl); }
		.winner-card {
			display: flex;
			align-items: baseline;
			gap: 12px;
			padding: var(--space-xs) var(--space-lg);
			border-width: 2px;
		}
		.winner-name { font-size: var(--font-size-lg); }
		.winner-score { font-size: var(--font-size-xl); }
	}

	/* As wide as the scorecard, so a page can lay its actions out in a row */
	.actions {
		flex: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
		width: 100%;
		max-width: 500px;
		padding-top: var(--space-xs);
	}
</style>
