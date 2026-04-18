<script lang="ts">
	import type { Player } from '$lib/game/models';
	import { calculateScore } from '$lib/game/logic';
	import { PLAYER_COLORS } from '$lib/game/constants';

	interface Props {
		players: Player[];
		activeIndex: number;
		onselect?: (index: number) => void;
	}

	let { players, activeIndex, onselect }: Props = $props();
</script>

<div class="player-tabs" role="tablist">
	{#each players as player, i}
		{@const colors = PLAYER_COLORS[player.color]}
		{@const score = calculateScore(player.scorecard).totalScore}
		{@const isActive = i === activeIndex}
		<button
			class="player-tab"
			class:active={isActive}
			class:eliminated={!player.isActive}
			role="tab"
			aria-selected={isActive}
			onclick={() => onselect?.(i)}
			style:--tab-color={colors.primary}
			style:--tab-light={colors.light}
		>
			<span class="color-dot" style:background={colors.primary}></span>
			<span class="player-name" class:ai={player.isAI}>
				{player.name}
				{#if player.isAI}
					<span class="ai-badge">AI</span>
				{/if}
			</span>
			<span class="player-score" class:positive={score > 0} class:negative={score < 0}>
				{score}
			</span>
			{#if !player.isActive}
				<span class="eliminated-badge">OUT</span>
			{/if}
		</button>
	{/each}
</div>

<style>
	.player-tabs {
		display: flex;
		gap: 4px;
		padding: 4px 8px;
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
		border-color: var(--tab-color);
		background: var(--tab-light);
	}

	:global(.theme-dark) .player-tab.active {
		background: color-mix(in srgb, var(--tab-color) 25%, var(--card-bg));
	}

	.player-tab.eliminated {
		opacity: 0.5;
	}

	.color-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.player-name {
		font-weight: 600;
		font-size: var(--font-size-sm);
		color: var(--text-dark);
	}

	.ai-badge {
		font-size: 10px;
		background: var(--text-muted);
		color: white;
		padding: 1px 4px;
		border-radius: 3px;
		font-weight: 700;
		vertical-align: middle;
	}

	.player-score {
		font-weight: 700;
		font-size: var(--font-size-sm);
	}

	.player-score.positive { color: var(--score-positive); }
	.player-score.negative { color: var(--score-negative); }

	.eliminated-badge {
		font-size: 10px;
		background: var(--score-negative);
		color: white;
		padding: 1px 4px;
		border-radius: 3px;
		font-weight: 700;
	}

	/* Landscape on phones — compact tabs to save vertical space */
	@media (orientation: landscape) and (max-height: 500px) {
		.player-tabs { padding: 2px 6px; gap: 3px; }
		.player-tab { padding: 3px 8px; gap: 4px; }
		.player-name, .player-score { font-size: var(--font-size-xs); }
	}
</style>
