<script lang="ts">
	import type { Player } from '$lib/game/models';
	import { calculateScore } from '$lib/game/logic';

	interface Props {
		players: Player[];
		activeIndex: number;
		onselect?: (index: number) => void;
	}

	let { players, activeIndex, onselect }: Props = $props();
</script>

<div class="player-tabs" role="tablist">
	{#each players as player, i}
		{@const score = calculateScore(player.scorecard).totalScore}
		{@const isActive = i === activeIndex}
		<button
			class="player-tab"
			class:active={isActive}
			class:eliminated={!player.isActive}
			role="tab"
			aria-selected={isActive}
			onclick={() => onselect?.(i)}
			data-player={player.color}
		>
			<span class="player-dot"></span>
			<span class="player-name">
				{player.name}
				{#if player.isAI}
					<span class="badge">AI</span>
				{/if}
			</span>
			<span class="player-score" class:positive={score > 0} class:negative={score < 0}>
				{score < 0 ? `−${Math.abs(score)}` : score}
			</span>
			{#if !player.isActive}
				<span class="badge badge-danger">OUT</span>
			{/if}
		</button>
	{/each}
</div>

<style>
	/* Side padding matches the game page margins so tabs line up with the board */
	.player-tabs {
		display: flex;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md) 0;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.player-tabs::-webkit-scrollbar { display: none; }

	.player-tab {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: var(--radius-md);
		background: var(--card-bg);
		border: 2px solid transparent;
		transition: all var(--transition-fast);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.player-tab.active {
		border-color: var(--player);
		background: var(--player-light);
	}

	:global(.theme-dark) .player-tab.active {
		background: color-mix(in srgb, var(--player) 25%, var(--card-bg));
	}

	.player-tab.eliminated {
		opacity: 0.5;
	}

	.player-name {
		font-weight: 600;
		font-size: var(--font-size-sm);
		color: var(--text-dark);
	}

	.player-score {
		font-weight: 700;
		font-size: var(--font-size-sm);
		font-variant-numeric: tabular-nums;
	}

	.player-score.positive { color: var(--score-positive); }
	.player-score.negative { color: var(--score-negative); }

	@media (min-width: 1024px) {
		.player-tabs { padding: var(--space-md) var(--space-lg) 0; }
	}

	/* Portrait phones — shorter tabs leave more of the screen for the board */
	@media (max-width: 767px) and (orientation: portrait) {
		.player-tab { min-height: 36px; padding: var(--space-xs) 10px; }
	}

	/* Shortest portrait phones (e.g. Chrome on iOS with both bars showing) */
	@media (max-width: 767px) and (orientation: portrait) and (max-height: 680px) {
		.player-tabs { padding-top: 6px; }
		.player-tab { min-height: 32px; padding: var(--space-2xs) 10px; }
	}

	/* Landscape on phones — compact tabs to save vertical space */
	@media (orientation: landscape) and (max-height: 500px) {
		.player-tabs { padding: var(--space-xs) var(--space-sm) 0; gap: var(--space-xs); }
		.player-tab { padding: 3px var(--space-sm); gap: var(--space-xs); }
		.player-name, .player-score { font-size: var(--font-size-xs); }
	}
</style>
